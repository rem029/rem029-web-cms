/**
 * Checks hidden documents (rem0001 phase 6): a page with "Hide from other members" ticked is only
 * read, updated and deleted by its creator, the users in "Visible to", tenant admins and super
 * users. As the seeded users (`pnpm seed`): editor1@ (tenant1, `pages-editor` template), editor2@/editor3@ (tenant1 editors),
 * owner@ (tenant admin of tenant1 + tenant2), cashier2@ (tenant2).
 *
 *   pnpm payload run scripts/verify/hiddenDocuments.ts
 *   or: pnpm verify
 *
 * Local API with `overrideAccess: false`. Creates and deletes its own pages (`verify-hd-…`) and
 * puts the tenant1 header back. Refuses to run in production.
 */
import config from '@payload-config'
import { getPayload } from 'payload'

import { extractTenantId } from '@/common/utils/tenantCollections'
import type { Page, Tenant } from '@/payload-types'
import {
  createChecker,
  isRefused,
  loadUser,
  statusOf,
  succeeds,
  type SessionUser,
} from './lib/verifyKit'
import { contentLayout, richText } from '@/seeds/multiTenancy'

if (process.env.NODE_ENV === 'production') {
  console.error('verify: refusing to run with NODE_ENV=production')
  process.exit(1)
}

const payload = await getPayload({ config })
const { check, failures } = createChecker(payload)

const PREFIX = 'verify-hd'
const context = { disableRevalidate: true }

const cleanup = async (): Promise<void> => {
  await payload.delete({ collection: 'pages', where: { slug: { like: `${PREFIX}-` } }, context })
}

const findTenant = async (slug: string): Promise<Tenant> => {
  const { docs } = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
  })
  if (!docs[0]) throw new Error(`verify: tenant ${slug} not found, run pnpm seed`)
  return docs[0]
}

const isRecordLike = (val: unknown): val is Record<string, unknown> =>
  typeof val === 'object' && val !== null

const isValidationError = async (fn: () => Promise<unknown>, text: string): Promise<boolean> => {
  try {
    await fn()
    return false
  } catch (err) {
    const errors =
      err && typeof err === 'object' && 'data' in err && isRecordLike(err.data)
        ? err.data.errors
        : []
    const messages = Array.isArray(errors)
      ? errors.map((e) => (isRecordLike(e) && typeof e.message === 'string' ? e.message : ''))
      : []
    return statusOf(err) === 400 && messages.some((message) => message.includes(text))
  }
}

const ids = (value: unknown): number[] =>
  Array.isArray(value)
    ? value.map((v) => extractTenantId(v)).filter((v): v is number => v !== null)
    : []

let headerId: number | null = null

try {
  const superUser = await loadUser(payload, process.env.SEED_ADMIN_EMAIL || 'default@payload.com')
  const owner = await loadUser(payload, 'owner@example.test')
  const editor1 = await loadUser(payload, 'editor1@example.test')
  const editor2 = await loadUser(payload, 'editor2@example.test')
  const editor3 = await loadUser(payload, 'editor3@example.test')
  const cashier2 = await loadUser(payload, 'cashier2@example.test')
  const t1 = await findTenant('tenant1')
  await cleanup()

  const createPage = (
    actor: SessionUser,
    slug: string,
    data: Partial<Pick<Page, 'isHidden' | 'visibleTo' | '_status'>>,
  ) =>
    payload.create({
      collection: 'pages',
      data: {
        title: slug,
        slug: `${PREFIX}-${slug}`,
        tenant: t1.id,
        hero: { main: { type: 'none' } },
        layout: contentLayout(richText(slug)),
        ...data,
      },
      draft: data._status !== 'published',
      user: actor,
      overrideAccess: false,
      context,
    })

  const findAs = async (actor: SessionUser | null, id: number): Promise<boolean> => {
    const { docs } = await payload.find({
      collection: 'pages',
      where: { id: { equals: id } },
      depth: 0,
      ...(actor ? { user: actor } : {}),
      overrideAccess: false,
    })
    return docs.length === 1
  }
  const openAs = (actor: SessionUser, id: number) => () =>
    payload.findByID({ collection: 'pages', id, depth: 0, user: actor, overrideAccess: false })
  const updateAs =
    (actor: SessionUser, id: number, data: Partial<Page>, draft = true) =>
    () =>
      payload.update({
        collection: 'pages',
        id,
        data,
        draft,
        user: actor,
        overrideAccess: false,
        context,
      })
  const versionsAs = async (actor: SessionUser, id: number) =>
    (
      await payload.findVersions({
        collection: 'pages',
        where: { parent: { equals: id } },
        depth: 0,
        user: actor,
        overrideAccess: false,
      })
    ).docs
  const stored = (id: number) =>
    payload.findByID({ collection: 'pages', id, depth: 0, draft: true })

  // a hidden draft by editor1@, visible to editor2@
  const hidden = await createPage(editor1, 'draft', { isHidden: true, visibleTo: [editor2.id] })
  check('setup: editor1@ is the creator', extractTenantId(hidden.createdBy) === editor1.id)

  // who sees it
  check('find: editor1@ (creator) finds it', await findAs(editor1, hidden.id))
  check('find: editor2@ (visible to) finds it', await findAs(editor2, hidden.id))
  check('find: editor3@ does not find it', !(await findAs(editor3, hidden.id)))
  check('find: owner@ (tenant admin) finds it', await findAs(owner, hidden.id))
  check('find: super user finds it', await findAs(superUser, hidden.id))
  check('find: cashier2@ (tenant2) does not find it', !(await findAs(cashier2, hidden.id)))
  check('find: anonymous does not get a hidden draft', !(await findAs(null, hidden.id)))
  check('open: editor2@ opens it', await succeeds(payload, openAs(editor2, hidden.id)))
  check('open: editor3@ gets 404', await isRefused(payload, openAs(editor3, hidden.id), [404]))

  // editing
  check(
    'update: editor2@ edits the content',
    await succeeds(payload, updateAs(editor2, hidden.id, { title: 'edited by editor2' })),
  )
  check(
    'update: editor3@ is refused',
    await isRefused(payload, updateAs(editor3, hidden.id, { title: 'x' }), [403, 404]),
  )
  check(
    'update: owner@ edits it',
    await succeeds(payload, updateAs(owner, hidden.id, { title: 'edited by owner' })),
  )
  check(
    'delete: editor3@ is refused',
    await isRefused(
      payload,
      () =>
        payload.delete({
          collection: 'pages',
          id: hidden.id,
          user: editor3,
          overrideAccess: false,
          context,
        }),
      [403, 404],
    ),
  )
  const bulk = await payload.delete({
    collection: 'pages',
    where: { slug: { like: `${PREFIX}-` } },
    user: editor3,
    overrideAccess: false,
    context,
  })
  check('delete: editor3@ bulk delete skips it', bulk.docs.length === 0)
  check('delete: the page is still there', (await stored(hidden.id)).id === hidden.id)

  // versions
  check('versions: editor3@ sees none', (await versionsAs(editor3, hidden.id)).length === 0)
  check('versions: editor2@ sees them', (await versionsAs(editor2, hidden.id)).length > 0)
  check('versions: owner@ sees them', (await versionsAs(owner, hidden.id)).length > 0)

  // who can change who sees it
  await updateAs(editor2, hidden.id, { isHidden: false, visibleTo: [editor2.id, editor3.id] })()
  const afterEditor2 = await stored(hidden.id)
  check(
    'fields: editor2@ cannot change isHidden or visibleTo (stripped)',
    afterEditor2.isHidden === true && ids(afterEditor2.visibleTo).join() === String(editor2.id),
  )
  check('fields: editor3@ still does not find it', !(await findAs(editor3, hidden.id)))
  check(
    'fields: editor1@ adds editor3@',
    await succeeds(payload, updateAs(editor1, hidden.id, { visibleTo: [editor2.id, editor3.id] })),
  )
  check('fields: editor3@ now finds it', await findAs(editor3, hidden.id))
  await updateAs(editor1, hidden.id, { visibleTo: [editor2.id] })()
  check('fields: removed again, editor3@ loses it', !(await findAs(editor3, hidden.id)))

  // picker: only members of the doc's tenant
  check(
    'picker: a tenant2 user is rejected with their name',
    await isValidationError(
      updateAs(editor1, hidden.id, { visibleTo: [editor2.id, cashier2.id] }),
      "isn't a member of this business",
    ),
  )
  check(
    'picker: a super user is rejected',
    await isValidationError(
      updateAs(editor1, hidden.id, { visibleTo: [superUser.id] }),
      "isn't a member of this business",
    ),
  )

  // turning it off and on keeps the list
  await updateAs(editor1, hidden.id, { isHidden: false })()
  check('toggle: hidden off, editor3@ finds it', await findAs(editor3, hidden.id))
  check(
    'toggle: the list is kept',
    ids((await stored(hidden.id)).visibleTo).join() === String(editor2.id),
  )
  await updateAs(editor1, hidden.id, { isHidden: true })()
  check('toggle: hidden on, editor3@ loses it', !(await findAs(editor3, hidden.id)))
  check('toggle: editor2@ still finds it', await findAs(editor2, hidden.id))

  // only the creator (or an admin) hides a doc
  const open = await createPage(editor1, 'open', {})
  await updateAs(editor3, open.id, { isHidden: true })()
  check("fields: editor3@ cannot hide editor1@'s page", (await stored(open.id)).isHidden !== true)
  check(
    'fields: owner@ can hide it',
    (await succeeds(payload, updateAs(owner, open.id, { isHidden: true }))) &&
      (await stored(open.id)).isHidden === true &&
      !(await findAs(editor3, open.id)),
  )

  // public site: published hidden pages stay public
  const published = await createPage(editor1, 'published', {
    isHidden: true,
    visibleTo: [editor2.id],
    _status: 'published',
  })
  check('public: anonymous gets a hidden published page', await findAs(null, published.id))
  check('public: editor3@ does not get it in the admin', !(await findAs(editor3, published.id)))

  // hidden in a draft of a published page: hidden from members at once (syncHiddenToDoc copies
  // isHidden/visibleTo to the main row); the published content stays public and unchanged
  const later = await createPage(editor1, 'later', { _status: 'published' })
  await updateAs(editor1, later.id, { isHidden: true, title: 'secret draft' }, true)()
  check('drafts: editor3@ no longer finds it', !(await findAs(editor3, later.id)))
  check('drafts: editor3@ sees no versions', (await versionsAs(editor3, later.id)).length === 0)
  check(
    'drafts: editor3@ cannot delete it',
    await isRefused(
      payload,
      () =>
        payload.delete({
          collection: 'pages',
          id: later.id,
          user: editor3,
          overrideAccess: false,
          context,
        }),
      [403, 404],
    ),
  )
  const publicLater = await payload.find({
    collection: 'pages',
    where: { id: { equals: later.id } },
    depth: 0,
    overrideAccess: false,
  })
  check(
    'drafts: anonymous still gets the published title and content',
    publicLater.docs[0]?.title === 'later' && (publicLater.docs[0]?.layout ?? []).length === 1,
  )
  const editor1Draft = await payload.findByID({
    collection: 'pages',
    id: later.id,
    draft: true,
    depth: 0,
    user: editor1,
    overrideAccess: false,
  })
  check('drafts: editor1@ gets the hidden draft', editor1Draft.title === 'secret draft')
  await updateAs(editor1, later.id, { isHidden: false }, true)()
  check('drafts: un-hidden in a draft, editor3@ finds it again', await findAs(editor3, later.id))

  // users: the picker needs members to read their colleagues (name and email, no rows)
  const colleagues = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 100,
    user: editor1,
    overrideAccess: false,
  })
  const editor2AsSeen = colleagues.docs.find((u) => u.id === editor2.id)
  check('users: editor1@ reads editor2@', Boolean(editor2AsSeen?.name))
  check(
    "users: editor1@ gets editor2@'s email (shared business)",
    editor2AsSeen?.email === 'editor2@example.test',
  )
  check('users: editor1@ does not get their rows', (editor2AsSeen?.tenants ?? []).length === 0)
  check(
    'users: editor1@ does not read super users',
    !colleagues.docs.some((u) => u.id === superUser.id),
  )
  check(
    'users: editor1@ does not read tenant2-only users',
    !colleagues.docs.some((u) => u.id === cashier2.id),
  )
  const self = await payload.findByID({
    collection: 'users',
    id: editor1.id,
    depth: 0,
    user: editor1,
    overrideAccess: false,
  })
  check('users: editor1@ still reads their own email', self.email === 'editor1@example.test')

  // audit fields: a user the reader can't read comes back empty (the admin then hides the field)
  const bySuper = await createPage(superUser, 'by-super', {})
  const readAs = (actor: SessionUser) =>
    payload.findByID({
      collection: 'pages',
      id: bySuper.id,
      depth: 0,
      user: actor,
      overrideAccess: false,
    })
  check(
    'audit: editor3@ gets no createdBy for a super user',
    (await readAs(editor3)).createdBy == null,
  )
  check('audit: owner@ gets no createdBy for a super user', (await readAs(owner)).createdBy == null)
  check(
    'audit: the super user gets their own createdBy',
    extractTenantId((await readAs(superUser)).createdBy) === superUser.id,
  )
  check(
    'audit: editor2@ gets createdBy of a colleague (editor1@)',
    extractTenantId(
      (
        await payload.findByID({
          collection: 'pages',
          id: hidden.id,
          depth: 0,
          user: editor2,
          overrideAccess: false,
        })
      ).createdBy,
    ) === editor1.id,
  )
  check(
    'audit: the stored createdBy is untouched',
    extractTenantId((await stored(bySuper.id)).createdBy) === superUser.id,
  )

  // tenant docs: hiding the tenant1 header hides it from members in the admin only
  const { docs: headers } = await payload.find({
    collection: 'header',
    where: { tenant: { equals: t1.id } },
    limit: 1,
    depth: 0,
  })
  const header = headers[0]
  if (!header) throw new Error('verify: tenant1 header not found, run pnpm seed')
  headerId = header.id
  const findHeaderAs = async (actor: SessionUser | null): Promise<boolean> =>
    (
      await payload.find({
        collection: 'header',
        where: { id: { equals: header.id } },
        depth: 0,
        ...(actor ? { user: actor } : {}),
        overrideAccess: false,
      })
    ).docs.length === 1
  await payload.update({
    collection: 'header',
    id: header.id,
    data: { isHidden: true },
    user: editor2,
    overrideAccess: false,
    context,
  })
  check(
    'header: editor2@ (not creator or admin) cannot hide it',
    (await payload.findByID({ collection: 'header', id: header.id, depth: 0 })).isHidden !== true,
  )
  check(
    'header: owner@ hides it',
    await succeeds(payload, () =>
      payload.update({
        collection: 'header',
        id: header.id,
        data: { isHidden: true, visibleTo: [] },
        user: owner,
        overrideAccess: false,
        context,
      }),
    ),
  )
  check('header: editor2@ does not find it', !(await findHeaderAs(editor2)))
  check(
    'header: editor2@ cannot update it',
    await isRefused(
      payload,
      () =>
        payload.update({
          collection: 'header',
          id: header.id,
          data: { navItems: [] },
          user: editor2,
          overrideAccess: false,
          context,
        }),
      [403, 404],
    ),
  )
  check('header: owner@ finds it', await findHeaderAs(owner))
  check('header: anonymous (public site) still gets it', await findHeaderAs(null))
} catch (err) {
  check('no crash', false)
  payload.logger.error({ msg: 'verify: hiddenDocuments crashed', err })
} finally {
  await cleanup()
  if (headerId !== null) {
    await payload.update({
      collection: 'header',
      id: headerId,
      data: { isHidden: false, visibleTo: [] },
      context,
    })
  }
}

if (failures() > 0) {
  payload.logger.error(`verify: hiddenDocuments ${failures()} check(s) failed`)
  process.exit(1)
}
payload.logger.info('verify: hiddenDocuments all checks passed')
process.exit(0)
