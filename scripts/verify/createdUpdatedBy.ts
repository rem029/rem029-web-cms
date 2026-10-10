/**
 * Checks `createdBy` / `updatedBy` (rem0003): every collection is either in
 * `createdUpdatedByCollections` (gets both fields and the hook from the `addCreatedUpdatedBy`
 * plugin) or in `withoutCreatedUpdatedBy` (gets neither); writes to every collection in `STAMPED`
 * stamp the signed-in user and ignore values sent by the client; deleting a user empties their
 * stamps without being blocked; signed-in readers who can't read that user get it empty, anonymous
 * readers get neither field. As the seeded users (`pnpm seed`): the super user, owner@ (tenant1 +
 * tenant2), editor2@ (tenant1), tenant2-editor@ (tenant2), multi-editor@ (tenant1 + tenant2).
 *
 *   pnpm payload run scripts/verify/createdUpdatedBy.ts
 *   or: pnpm verify
 *
 * Local API with `overrideAccess: false`. Creates a business `verify-cub` with one doc per stamped
 * collection, its tenant admin and a member (`verify-cub-admin@`, `verify-cub-member@`), a user it
 * deletes (`verify-cub-gone@`) and two pages (`verify-cub-…`), and removes them all at the end.
 * Refuses to run in production.
 */
import { randomUUID } from 'crypto'

import config from '@payload-config'
import { getPayload, type CollectionSlug } from 'payload'

import { setCreatedUpdatedBy } from '@/common/hooks/setCreatedUpdatedBy'
import {
  createdUpdatedByCollections,
  withoutCreatedUpdatedBy,
} from '@/common/utils/createdUpdatedByCollections'
import { extractTenantId as relationId } from '@/common/utils/tenantCollections'
import type { Tenant } from '@/payload-types'
import { createChecker, loadUser, statusOf, succeeds, type SessionUser } from './lib/verifyKit'
import { contentLayout, richText } from '@/seeds/multiTenancy'

if (process.env.NODE_ENV === 'production') {
  console.error('verify: refusing to run with NODE_ENV=production')
  process.exit(1)
}

const payload = await getPayload({ config })
const { check, failures } = createChecker(payload)

const PREFIX = 'verify-cub'
const ADMIN_EMAIL = `${PREFIX}-admin@example.test`
const MEMBER_EMAIL = `${PREFIX}-member@example.test`
const GONE_EMAIL = `${PREFIX}-gone@example.test`
const TEST_EMAILS = [ADMIN_EMAIL, MEMBER_EMAIL, GONE_EMAIL]

// the collections whose writes must be stamped (rem0003 requirement), independent of the config
// list, so a collection missing from createdUpdatedByCollections fails here
const STAMPED: CollectionSlug[] = [
  'pages',
  'posts',
  'media',
  'header',
  'footer',
  'theme',
  'settings',
  'tenants',
  'users-access',
  'categories',
  'forms',
  'redirects',
  'users',
]
const context = { disableRevalidate: true }
const AUDIT_FIELDS = ['createdBy', 'updatedBy'] as const

// a 1x1 transparent png, for the media doc
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
)

const findTenant = async (slug: string): Promise<Tenant | null> => {
  const { docs } = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
  })
  return docs[0] ?? null
}

// cleanupAfterTenantDelete is off, so the business's docs are deleted first
const cleanup = async (): Promise<void> => {
  await payload.delete({ collection: 'pages', where: { slug: { like: `${PREFIX}-` } }, context })
  const tenant = await findTenant(PREFIX)
  if (tenant) {
    for (const slug of STAMPED) {
      const fields = payload.collections[slug].config.flattenedFields
      if (slug === 'tenants' || !fields.some((field) => field.name === 'tenant')) continue
      await payload.delete({ collection: slug, where: { tenant: { equals: tenant.id } }, context })
    }
    await payload.delete({ collection: 'tenants', id: tenant.id, context })
  }
  await payload.delete({ collection: 'users', where: { email: { in: TEST_EMAILS } } })
}

// the tenant admin of the test business, a real member editing it; the password is random and
// never printed
const makeTenantAdmin = async (tenantId: number): Promise<SessionUser> => {
  await payload.create({
    collection: 'users',
    data: {
      email: ADMIN_EMAIL,
      name: 'verify tenant admin',
      password: randomUUID(),
      tenants: [{ tenant: tenantId, isTenantAdmin: true }],
    },
  })
  return loadUser(payload, ADMIN_EMAIL)
}

// any collection's doc; a collection without the fields reads as empty
const auditIds = (doc: object) => ({
  createdBy: 'createdBy' in doc ? relationId(doc.createdBy) : null,
  updatedBy: 'updatedBy' in doc ? relationId(doc.updatedBy) : null,
})

// anonymous readers don't get the fields at all
const lacksAuditFields = (doc: object): boolean =>
  Object.entries(doc).every(
    ([key, value]) => !AUDIT_FIELDS.some((name) => name === key) || value === undefined,
  )

// the doc as an anonymous api reader gets it, or null when they can't read it
const readAnonymously = async (slug: CollectionSlug, id: number): Promise<object | null> => {
  try {
    return await payload.findByID({ collection: slug, id, depth: 0, overrideAccess: false })
  } catch (err) {
    const status = statusOf(err)
    if (status === 403 || status === 404) return null
    throw err
  }
}

try {
  await cleanup()

  // --- coverage: every collection is in exactly one list, and has the fields + hook only if listed
  const slugs = payload.config.collections
    .map((collection) => collection.slug)
    .filter((slug) => !slug.startsWith('payload-'))
  for (const slug of [...createdUpdatedByCollections, ...withoutCreatedUpdatedBy]) {
    check(`coverage: listed ${slug} is a collection`, slugs.includes(slug))
  }
  for (const collection of payload.config.collections) {
    const slug = collection.slug
    if (slug.startsWith('payload-')) continue
    const listed = createdUpdatedByCollections.includes(slug)
    const without = withoutCreatedUpdatedBy.includes(slug)
    check(`coverage: ${slug} is in exactly one list`, listed !== without)

    const fields = AUDIT_FIELDS.map((name) =>
      collection.flattenedFields.find((field) => field.name === name),
    )
    const hasHook = (collection.hooks.beforeChange ?? []).includes(setCreatedUpdatedBy)
    if (listed) {
      check(
        `coverage: ${slug} has createdBy and updatedBy (users, id only)`,
        fields.every(
          (field) =>
            field?.type === 'relationship' && field.relationTo === 'users' && field.maxDepth === 0,
        ),
      )
      check(
        `coverage: ${slug} shows them read-only in the sidebar`,
        fields.every(
          (field) => field?.admin?.position === 'sidebar' && field.admin.readOnly === true,
        ),
      )
      check(`coverage: ${slug} has the setCreatedUpdatedBy hook`, hasHook)
    } else {
      check(
        `coverage: ${slug} has neither field`,
        fields.every((field) => field === undefined),
      )
      check(`coverage: ${slug} has no setCreatedUpdatedBy hook`, !hasHook)
    }
  }

  // --- stamping: the super user creates one doc per listed collection, the business's tenant
  // admin edits it
  const superUser = await loadUser(payload, process.env.SEED_ADMIN_EMAIL || 'default@payload.com')
  const asSuper = { user: superUser, overrideAccess: false, context }

  // the business; its header, footer, theme and settings are created with it (createTenantDocs)
  const tenant = await payload.create({
    collection: 'tenants',
    data: { name: PREFIX, slug: PREFIX },
    ...asSuper,
    context: { ...context, skipHomePage: true },
  })
  const tenantAdmin = await makeTenantAdmin(tenant.id)
  // values a client might send; the stamps must ignore them
  const forgedCreate = { createdBy: tenantAdmin.id, updatedBy: tenantAdmin.id }
  const forgedUpdate = { createdBy: tenantAdmin.id, updatedBy: superUser.id }

  await payload.update({ collection: 'tenants', id: tenant.id, data: forgedCreate, ...asSuper })
  await payload.create({
    collection: 'pages',
    data: {
      title: PREFIX,
      slug: `${PREFIX}-stamp`,
      tenant: tenant.id,
      _status: 'published',
      hero: { main: { type: 'none' } },
      layout: contentLayout(richText(PREFIX)),
      ...forgedCreate,
    },
    ...asSuper,
  })
  await payload.create({
    collection: 'posts',
    data: {
      title: PREFIX,
      slug: PREFIX,
      tenant: tenant.id,
      _status: 'published',
      content: richText(PREFIX),
      ...forgedCreate,
    },
    ...asSuper,
  })
  await payload.create({
    collection: 'media',
    data: { alt: PREFIX, tenant: tenant.id, ...forgedCreate },
    file: { data: PNG, mimetype: 'image/png', name: `${PREFIX}.png`, size: PNG.length },
    ...asSuper,
  })
  await payload.create({
    collection: 'users-access',
    data: { name: PREFIX, slug: PREFIX, tenant: tenant.id, ...forgedCreate },
    ...asSuper,
  })
  await payload.create({
    collection: 'categories',
    data: { title: PREFIX, tenant: tenant.id, ...forgedCreate },
    ...asSuper,
  })
  await payload.create({
    collection: 'forms',
    data: {
      title: PREFIX,
      tenant: tenant.id,
      confirmationType: 'message',
      confirmationMessage: richText(PREFIX),
      ...forgedCreate,
    },
    ...asSuper,
  })
  await payload.create({
    collection: 'redirects',
    data: {
      from: `/${PREFIX}`,
      to: { type: 'custom', url: '/' },
      tenant: tenant.id,
      ...forgedCreate,
    },
    ...asSuper,
  })
  // a member of the business (default profile), added by the super user. the password is random,
  // kept only to log in below, never printed
  const memberPassword = randomUUID()
  const member = await payload.create({
    collection: 'users',
    data: {
      email: MEMBER_EMAIL,
      name: 'verify member',
      password: memberPassword,
      tenants: [{ tenant: tenant.id }],
      ...forgedCreate,
    },
    ...asSuper,
  })

  // the doc this script made in each collection
  const testDocId = async (slug: CollectionSlug): Promise<number | undefined> => {
    if (slug === 'tenants') return tenant.id
    if (slug === 'users') return member.id
    const { docs } = await payload.find({
      collection: slug,
      where: { tenant: { equals: tenant.id } },
      limit: 1,
      depth: 0,
    })
    return docs[0]?.id
  }

  for (const slug of STAMPED) {
    const id = await testDocId(slug)
    if (id === undefined) {
      check(`${slug}: has a test doc in ${PREFIX}`, false)
      continue
    }
    const stored = async () => auditIds(await payload.findByID({ collection: slug, id, depth: 0 }))

    // tenants: the create above is followed by the forged update, both by the super user
    const created = await stored()
    check(`${slug}: createdBy is the creator`, created.createdBy === superUser.id)
    check(`${slug}: updatedBy is the creator`, created.updatedBy === superUser.id)

    await payload.update({
      collection: slug,
      id,
      data: forgedUpdate,
      user: tenantAdmin,
      overrideAccess: false,
      context,
    })
    const updated = await stored()
    check(
      `${slug}: an edit by the tenant admin keeps createdBy`,
      updated.createdBy === superUser.id,
    )
    check(
      `${slug}: an edit by the tenant admin sets updatedBy`,
      updated.updatedBy === tenantAdmin.id,
    )

    // the tenant admin can read themselves, not the super user (no row in this business)
    const byTenantAdmin = auditIds(
      await payload.findByID({
        collection: slug,
        id,
        depth: 0,
        user: tenantAdmin,
        overrideAccess: false,
      }),
    )
    check(
      `${slug}: the tenant admin sees themselves as updatedBy, not the super user as createdBy`,
      byTenantAdmin.updatedBy === tenantAdmin.id && byTenantAdmin.createdBy === null,
    )

    const anonymous = await readAnonymously(slug, id)
    if (anonymous === null) {
      payload.logger.info(`SKIP ${slug}: anonymous readers can't read it`)
    } else {
      check(`${slug}: an anonymous reader gets neither field`, lacksAuditFields(anonymous))
    }
  }

  // a login writes to the user (sessions, login attempts), but isn't an edit: updatedBy stays
  const memberUpdatedBy = async () =>
    auditIds(await payload.findByID({ collection: 'users', id: member.id, depth: 0 })).updatedBy
  const beforeLogin = await memberUpdatedBy()
  await payload.login({
    collection: 'users',
    data: { email: MEMBER_EMAIL, password: memberPassword },
  })
  check(
    'users: logging in leaves updatedBy as it was',
    beforeLogin === tenantAdmin.id && (await memberUpdatedBy()) === beforeLogin,
  )

  // --- deleting a user who stamped docs: the delete isn't blocked, their stamps go empty
  // (the foreign keys are ON DELETE SET NULL)
  const gone = await payload.create({
    collection: 'users',
    data: { email: GONE_EMAIL, name: 'verify deleted user', password: randomUUID() },
  })
  const stampedIds: { slug: CollectionSlug; id: number }[] = []
  for (const slug of STAMPED) {
    const id = await testDocId(slug)
    if (id === undefined) continue
    // written with no user, so the hook leaves the value as given
    await payload.update({ collection: slug, id, data: { createdBy: gone.id }, context })
    stampedIds.push({ slug, id })
  }
  const storedCreatedBy = async (slug: CollectionSlug, id: number) =>
    auditIds(await payload.findByID({ collection: slug, id, depth: 0 })).createdBy
  const before = new Map<string, number | null>()
  for (const { slug, id } of stampedIds) before.set(slug, await storedCreatedBy(slug, id))
  check(
    'delete user: the super user deletes a user who created docs',
    await succeeds(payload, () => payload.delete({ collection: 'users', id: gone.id, ...asSuper })),
  )
  for (const { slug, id } of stampedIds) {
    check(
      `${slug}: deleting the creator empties createdBy`,
      before.get(slug) === gone.id && (await storedCreatedBy(slug, id)) === null,
    )
  }

  // --- hiding: readers who can't read that user get both fields empty
  const owner = await loadUser(payload, 'owner@example.test')
  const editor2 = await loadUser(payload, 'editor2@example.test')
  const tenant2Editor = await loadUser(payload, 'tenant2-editor@example.test')
  const multiEditor = await loadUser(payload, 'multi-editor@example.test')
  const t1 = await findTenant('tenant1')
  const t2 = await findTenant('tenant2')
  if (!t1 || !t2) throw new Error('verify: tenant1/tenant2 not found, run pnpm seed')

  const pageData = (name: string, tenantId: number) => ({
    title: name,
    slug: `${PREFIX}-${name}`,
    tenant: tenantId,
    hero: { main: { type: 'none' as const } },
    layout: contentLayout(richText(name)),
  })
  const readAs = async (actor: SessionUser, id: number) =>
    auditIds(
      await payload.findByID({
        collection: 'pages',
        id,
        depth: 0,
        draft: true,
        user: actor,
        overrideAccess: false,
      }),
    )

  // pages written with no user, then given their stored createdBy / updatedBy directly, so these
  // checks test only the hiding (not the stamping above)
  const pageAuditedBy = async (name: string, tenantId: number, userId: number) => {
    const page = await payload.create({
      collection: 'pages',
      data: pageData(name, tenantId),
      draft: true,
      context,
    })
    await payload.update({
      collection: 'pages',
      id: page.id,
      data: { _status: 'published', createdBy: userId, updatedBy: userId },
      context,
    })
    return page.id
  }
  const storedOf = async (id: number) =>
    auditIds(await payload.findByID({ collection: 'pages', id, depth: 0 }))
  const isEmpty = (ids: { createdBy: number | null; updatedBy: number | null }) =>
    ids.createdBy === null && ids.updatedBy === null

  // a published tenant1 page by owner@
  const ownersPage = await pageAuditedBy('by-owner', t1.id, owner.id)
  // a published tenant2 page by editor2@ (tenant1 only)
  const editor2sPage = await pageAuditedBy('by-editor2', t2.id, editor2.id)
  check(
    'hiding setup: the stored values are set',
    (await storedOf(ownersPage)).createdBy === owner.id &&
      (await storedOf(editor2sPage)).createdBy === editor2.id,
  )

  const byColleague = await readAs(editor2, ownersPage)
  check(
    'hiding: a colleague (editor2@) sees createdBy and updatedBy',
    byColleague.createdBy === owner.id && byColleague.updatedBy === owner.id,
  )
  check(
    'hiding: an anonymous reader gets neither field',
    lacksAuditFields(
      await payload.findByID({
        collection: 'pages',
        id: ownersPage,
        depth: 0,
        overrideAccess: false,
      }),
    ),
  )
  check(
    'hiding: a reader from another business (tenant2-editor@) gets both empty',
    isEmpty(await readAs(tenant2Editor, editor2sPage)),
  )
  const bySharedMember = await readAs(multiEditor, editor2sPage)
  check(
    'hiding: a member of both businesses (multi-editor@) sees them',
    bySharedMember.createdBy === editor2.id && bySharedMember.updatedBy === editor2.id,
  )
  check(
    'hiding: the stored values are untouched by the reads',
    (await storedOf(ownersPage)).createdBy === owner.id &&
      (await storedOf(editor2sPage)).createdBy === editor2.id,
  )
} catch (err) {
  payload.logger.error({ msg: 'verify: createdUpdatedBy crashed', err })
  check('verify ran to the end', false)
} finally {
  await cleanup()
}

if (failures() > 0) {
  payload.logger.error(`verify: createdUpdatedBy ${failures()} check(s) failed`)
  process.exit(1)
}
payload.logger.info('verify: createdUpdatedBy all checks passed')
process.exit(0)
