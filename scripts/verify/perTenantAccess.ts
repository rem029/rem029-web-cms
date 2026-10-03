/**
 * Checks per-tenant access (rem0001 phase 4): a user's profile comes from their `tenants[]` row
 * for each tenant. Uses the seeded `mixed@example.test` (editor in tenant1, viewer in tenant2,
 * not in tenant3; `pnpm seed`).
 *
 *   pnpm payload run scripts/verify/perTenantAccess.ts
 *   or: pnpm verify
 *
 * Local API with `overrideAccess: false`. Creates and deletes its own docs (`verify-pta-…`).
 * Refuses to run in production.
 */
import config from '@payload-config'
import type { RequiredDataFromCollectionSlug } from 'payload'
import { getPayload } from 'payload'

import {
  accessCheckResolver,
  adminAccess,
  allowedTenantIds,
  hiddenResolver,
} from '@/common/utils/access'
import { getSelectedTenant } from '@/common/utils/getSelectedTenant'
import type { Tenant } from '@/payload-types'

import {
  createChecker,
  idOf,
  isRefused,
  loadUser,
  makeUser,
  reqFor,
  succeeds,
  type SessionUser,
} from './lib/verifyKit'

if (process.env.NODE_ENV === 'production') {
  console.error('verify: refusing to run with NODE_ENV=production')
  process.exit(1)
}

const payload = await getPayload({ config })
const { check, fail, failures } = createChecker(payload)

const PREFIX = 'verify-pta'
const context = { disableRevalidate: true }

const cleanup = async (): Promise<void> => {
  await payload.delete({ collection: 'pages', where: { slug: { like: `${PREFIX}-` } }, context })
  await payload.delete({ collection: 'users', where: { email: { like: `${PREFIX}-` } } })
  await payload.delete({ collection: 'users-access', where: { slug: { like: `${PREFIX}-` } } })
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

// drafts with an empty hero and layout
const pageData = (tenant: Tenant, name: string): RequiredDataFromCollectionSlug<'pages'> => ({
  title: `Verify per-tenant access ${name}`,
  slug: `${PREFIX}-${name}`,
  tenant: tenant.id,
  hero: { main: { type: 'none' } },
  layout: [],
})

try {
  await cleanup()

  const superUser = await loadUser(payload, process.env.SEED_ADMIN_EMAIL || 'default@payload.com')
  const mixed = await loadUser(payload, 'mixed@example.test')
  const t1 = await findTenant('tenant1')
  const t2 = await findTenant('tenant2')
  const t3 = await findTenant('tenant3')

  // the seed: one profile per row
  const rowProfile = (user: SessionUser, tenant: Tenant): unknown => {
    const row = (user.tenants ?? []).find((r) => idOf(r.tenant) === tenant.id)
    return row?.access && typeof row.access === 'object' ? row.access.slug : null
  }
  check(
    'seed: mixed@ is editor in tenant1, viewer in tenant2, not in tenant3',
    rowProfile(mixed, t1) === 'editor' &&
      rowProfile(mixed, t2) === 'viewer' &&
      (mixed.tenants ?? []).every((r) => idOf(r.tenant) !== t3.id),
  )

  // one draft page per tenant, written without a user
  const pages = new Map<number, number>()
  for (const [tenant, name] of [
    [t1, 't1'],
    [t2, 't2'],
    [t3, 't3'],
  ] as const) {
    const page = await payload.create({
      collection: 'pages',
      draft: true,
      data: pageData(tenant, name),
      context,
    })
    pages.set(tenant.id, page.id)
  }
  const pageIn = (tenant: Tenant): number => {
    const id = pages.get(tenant.id)
    if (!id) throw new Error(`verify: no test page for tenant ${tenant.slug}`)
    return id
  }

  // read: across tenants without a tenant filter
  const { docs: seen } = await payload.find({
    collection: 'pages',
    where: { slug: { like: `${PREFIX}-` } },
    draft: true,
    depth: 0,
    limit: 100,
    user: mixed,
    overrideAccess: false,
  })
  const seenTenants = seen.map((doc) => idOf(doc.tenant))
  check(
    'read: mixed@ sees the tenant1 and tenant2 drafts, not tenant3',
    seenTenants.includes(t1.id) && seenTenants.includes(t2.id) && !seenTenants.includes(t3.id),
  )
  check(
    'read: mixed@ gets no document outside their tenants',
    seen.every((doc) => [t1.id, t2.id].includes(Number(idOf(doc.tenant)))),
  )
  check(
    'read: mixed@ cannot read the tenant3 page by id',
    await isRefused(
      payload,
      () =>
        payload.findByID({
          collection: 'pages',
          id: pageIn(t3),
          draft: true,
          user: mixed,
          overrideAccess: false,
        }),
      [403, 404],
    ),
  )

  // update
  const updatePage = (tenant: Tenant, data: Record<string, unknown>) => () =>
    payload.update({
      collection: 'pages',
      id: pageIn(tenant),
      draft: true,
      data,
      user: mixed,
      overrideAccess: false,
      context,
    })
  check(
    'update: mixed@ edits in tenant1 (editor)',
    await succeeds(payload, updatePage(t1, { title: 'edited in t1' })),
  )
  check(
    'update: mixed@ cannot edit in tenant2 (viewer)',
    await isRefused(payload, updatePage(t2, { title: 'edited in t2' }), [403, 404]),
  )
  check(
    'update: mixed@ cannot edit in tenant3 (not a member)',
    await isRefused(payload, updatePage(t3, { title: 'edited in t3' }), [403, 404]),
  )
  check(
    'update: mixed@ cannot move a tenant1 page into tenant2',
    await isRefused(payload, updatePage(t1, { tenant: t2.id })),
  )
  check(
    'update: mixed@ cannot move a tenant1 page into tenant3',
    await isRefused(payload, updatePage(t1, { tenant: t3.id })),
  )
  const moved = await payload.findByID({ collection: 'pages', id: pageIn(t1), draft: true })
  check('update: the tenant1 page is still in tenant1', idOf(moved.tenant) === t1.id)

  // create, with data.tenant set
  const createIn = (tenant: Tenant, name: string) => () =>
    payload.create({
      collection: 'pages',
      draft: true,
      data: pageData(tenant, name),
      user: mixed,
      overrideAccess: false,
      context,
    })
  check('create: mixed@ creates in tenant1', await succeeds(payload, createIn(t1, 'new-t1')))
  check('create: mixed@ cannot create in tenant2', await isRefused(payload, createIn(t2, 'new-t2')))
  check('create: mixed@ cannot create in tenant3', await isRefused(payload, createIn(t3, 'new-t3')))

  // delete
  const deletePage = (tenant: Tenant) => () =>
    payload.delete({
      collection: 'pages',
      id: pageIn(tenant),
      user: mixed,
      overrideAccess: false,
      context,
    })
  check(
    'delete: mixed@ cannot delete in tenant2',
    await isRefused(payload, deletePage(t2), [403, 404]),
  )
  check(
    'delete: mixed@ cannot delete in tenant3',
    await isRefused(payload, deletePage(t3), [403, 404]),
  )
  check('delete: mixed@ deletes in tenant1', await succeeds(payload, deletePage(t1)))

  // header (one per tenant): editor updates, viewer doesn't
  const headerOf = async (tenant: Tenant) => {
    const { docs } = await payload.find({
      collection: 'header',
      where: { tenant: { equals: tenant.id } },
      limit: 1,
      depth: 0,
    })
    if (!docs[0]) throw new Error(`verify: no header for tenant ${tenant.slug}`)
    return docs[0]
  }
  const updateHeader = (id: number) => () =>
    payload.update({
      collection: 'header',
      id,
      data: {},
      user: mixed,
      overrideAccess: false,
      context,
    })
  check(
    'header: mixed@ updates the tenant1 header',
    await succeeds(payload, updateHeader((await headerOf(t1)).id)),
  )
  check(
    'header: mixed@ cannot update the tenant2 header',
    await isRefused(payload, updateHeader((await headerOf(t2)).id), [403, 404]),
  )

  // the selected tenant (payload-tenant cookie)
  const createPages = accessCheckResolver('pages', 'create')
  const withCookie = (tenantId: number) => reqFor(payload, mixed, { tenantCookie: tenantId })
  check(
    'cookie: tenant1 is a valid selection for mixed@',
    getSelectedTenant(await withCookie(t1.id)) === t1.id,
  )
  check(
    'cookie: a forged tenant3 cookie is ignored (not a member)',
    getSelectedTenant(await withCookie(t3.id)) === null,
  )
  check(
    'cookie: create without data.tenant follows the cookie (tenant1 allowed)',
    createPages({ req: await withCookie(t1.id), data: {} }) === true,
  )
  check(
    'cookie: create without data.tenant, tenant2 cookie (viewer) denied',
    createPages({ req: await withCookie(t2.id), data: {} }) === false,
  )
  check(
    'cookie: create without data.tenant, forged tenant3 cookie denied',
    createPages({ req: await withCookie(t3.id), data: {} }) === false,
  )
  const readWithForgedCookie = await payload.find({
    collection: 'pages',
    where: { slug: { like: `${PREFIX}-` } },
    draft: true,
    depth: 0,
    req: await withCookie(t3.id),
    overrideAccess: false,
  })
  check(
    'cookie: a forged tenant3 cookie gives no tenant3 data',
    readWithForgedCookie.docs.every((doc) => idOf(doc.tenant) !== t3.id),
  )

  // nav and /admin come from any row
  check('nav: mixed@ sees pages', hiddenResolver('pages')({ user: mixed }) === false)
  check('nav: mixed@ does not see tenants', hiddenResolver('tenants')({ user: mixed }) === true)
  check('admin: mixed@ can open /admin', adminAccess({ req: await reqFor(payload, mixed) }))

  // a row with no profile: denied, no crash
  const noProfile = makeUser({ id: 990001, tenants: [{ tenant: t1.id, access: null }] })
  const noProfileReq = await reqFor(payload, noProfile)
  check(
    'no profile: pages read denied',
    accessCheckResolver('pages', 'read')({ req: noProfileReq }) === false,
  )
  check('no profile: /admin denied', adminAccess({ req: noProfileReq }) === false)
  check('no profile: pages hidden', hiddenResolver('pages')({ user: noProfile }) === true)

  // a deleted profile leaves the row empty (ON DELETE set null): the user is denied
  const editorProfile = (
    await payload.find({ collection: 'users-access', where: { slug: { equals: 'editor' } } })
  ).docs[0]
  if (!editorProfile) throw new Error('verify: editor profile not found, run pnpm seed')
  const tempProfile = await payload.create({
    collection: 'users-access',
    data: {
      name: 'Verify temp',
      slug: `${PREFIX}-temp`,
      access: (editorProfile.access ?? []).map(({ id: _id, ...row }) =>
        row.slug === 'tenants' ? { ...row, hidden: false, read: true, update: true } : row,
      ),
    },
  })
  const tempEmail = `${PREFIX}-user@example.test`
  const viewerProfile = (
    await payload.find({ collection: 'users-access', where: { slug: { equals: 'viewer' } } })
  ).docs[0]
  if (!viewerProfile) throw new Error('verify: viewer profile not found, run pnpm seed')
  await payload.create({
    collection: 'users',
    data: {
      email: tempEmail,
      password: tempEmail,
      tenants: [
        { tenant: t1.id, access: tempProfile.id },
        { tenant: t2.id, access: viewerProfile.id },
      ],
    },
    user: superUser,
    overrideAccess: false,
  })
  const tempUser = await loadUser(payload, tempEmail)

  // tenants: updating needs the profile of that tenant's row
  const updateTenant = (tenant: Tenant) => () =>
    payload.update({
      collection: 'tenants',
      id: tenant.id,
      data: {},
      user: tempUser,
      overrideAccess: false,
      context,
    })
  check(
    'tenants: allowed ids are tenant1 only',
    JSON.stringify(allowedTenantIds(await reqFor(payload, tempUser), 'tenants', 'update')) ===
      JSON.stringify([t1.id]),
  )
  check('tenants: updates tenant1 (row allows it)', await succeeds(payload, updateTenant(t1)))
  check(
    'tenants: cannot update tenant2 with the tenant1 row',
    await isRefused(payload, updateTenant(t2), [403, 404]),
  )

  await payload.delete({ collection: 'users-access', id: tempProfile.id })
  const orphaned = await loadUser(payload, tempEmail)
  check(
    'deleted profile: the row is left without a profile',
    (orphaned.tenants ?? []).some((r) => idOf(r.tenant) === t1.id && r.access == null),
  )
  check(
    'deleted profile: tenant1 pages read denied, no crash',
    !(await payload.find({
      collection: 'pages',
      where: { tenant: { equals: t1.id } },
      draft: true,
      user: orphaned,
      overrideAccess: false,
    }).then(
      ({ docs }) => docs.some((doc) => doc._status === 'draft'),
      () => false,
    )),
  )

  // super users: unchanged
  const all = await payload.count({ collection: 'pages', where: { slug: { like: `${PREFIX}-` } } })
  const asSuper = await payload.count({
    collection: 'pages',
    where: { slug: { like: `${PREFIX}-` } },
    user: superUser,
    overrideAccess: false,
  })
  check('super user: sees every tenant', asSuper.totalDocs === all.totalDocs && all.totalDocs > 0)
  check(
    'super user: edits in tenant3',
    await succeeds(payload, () =>
      payload.update({
        collection: 'pages',
        id: pageIn(t3),
        draft: true,
        data: { title: 'super edit' },
        user: superUser,
        overrideAccess: false,
        context,
      }),
    ),
  )
} catch (err) {
  fail()
  payload.logger.error({ msg: 'verify: perTenantAccess crashed', err })
} finally {
  await cleanup()
}

if (failures() > 0) {
  payload.logger.error(`verify: perTenantAccess ${failures()} check(s) failed`)
  process.exit(1)
}
payload.logger.info('verify: perTenantAccess all checks passed')
process.exit(0)
