/**
 * Checks that the public site reads only the tenant it serves (rem0011 phase 0: always `admin`),
 * while other tenants have docs with the same slugs (`src/seeds/multiTenancy.ts`).
 *
 *   pnpm payload run scripts/verify/frontendTenant.ts
 *   or: pnpm verify
 *
 * Runs the frontend's queries (anonymous, `overrideAccess: false`) with `frontendTenantWhere`; the
 * pages themselves are checked over HTTP on the dev server. Read-only. Refuses to run in production.
 */
import config from '@payload-config'
import { getPayload } from 'payload'
import type { Where } from 'payload'

import { DEFAULT_TENANT_SLUG } from '@/common/utils/defaultTenant'
import { frontendTenantWhere, getFrontendTenantId } from '@/common/utils/frontendTenant'
import { extractTenantId } from '@/common/utils/tenantCollections'
import { getRedirects } from '@/utilities/getRedirects'
import { createChecker } from './lib/verifyKit'

if (process.env.NODE_ENV === 'production') {
  console.error('verify: refusing to run with NODE_ENV=production')
  process.exit(1)
}

const payload = await getPayload({ config })
const { check, failures } = createChecker(payload)

const tenantIdOf = async (slug: string): Promise<number> => {
  const { docs } = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
  })
  if (!docs[0]) throw new Error(`verify: tenant ${slug} not found, run pnpm seed`)
  return docs[0].id
}

const onlyTenant = (docs: { tenant?: unknown }[], tenantId: number): boolean =>
  docs.every((doc) => extractTenantId(doc.tenant) === tenantId)

try {
  const adminId = await tenantIdOf(DEFAULT_TENANT_SLUG)
  const tenant1Id = await tenantIdOf('tenant1')

  const tenantId = await getFrontendTenantId()
  check('helper: the public site serves the admin tenant', tenantId === adminId)
  if (tenantId === null) throw new Error('verify: no frontend tenant')

  const extra: Where = { slug: { equals: 'home' } }
  check(
    'helper: no where gives the tenant filter alone',
    JSON.stringify(frontendTenantWhere(tenantId)) ===
      JSON.stringify({ tenant: { equals: tenantId } }),
  )
  check(
    "helper: the caller's where is kept",
    JSON.stringify(frontendTenantWhere(tenantId, extra)) ===
      JSON.stringify({ and: [{ tenant: { equals: tenantId } }, extra] }),
  )

  // pages: every tenant has `home`; only tenant1 has `tenant1-only`
  const allHomes = await payload.count({ collection: 'pages', where: extra })
  check('setup: several tenants have a home page', allHomes.totalDocs > 1)
  const homes = await payload.find({
    collection: 'pages',
    overrideAccess: false,
    draft: false,
    depth: 0,
    where: frontendTenantWhere(tenantId, extra),
  })
  check('pages: home resolves to the admin page only', homes.docs.length === 1)
  check('pages: home is the admin tenant', onlyTenant(homes.docs, adminId))

  const onlyInTenant1: Where = { slug: { equals: 'tenant1-only' } }
  const tenant1Pages = await payload.count({ collection: 'pages', where: onlyInTenant1 })
  check('setup: tenant1 has a tenant1-only page', tenant1Pages.totalDocs === 1)
  const leaked = await payload.find({
    collection: 'pages',
    overrideAccess: false,
    depth: 0,
    where: frontendTenantWhere(tenantId, onlyInTenant1),
  })
  check('pages: a tenant1-only slug is not found', leaked.docs.length === 0)

  const published = await payload.find({
    collection: 'pages',
    overrideAccess: false,
    draft: false,
    depth: 0,
    limit: 1000,
    pagination: false,
    where: frontendTenantWhere(tenantId),
  })
  check('pages: static params / sitemap list only admin pages', onlyTenant(published.docs, adminId))

  // posts: every tenant has `welcome`
  const welcome: Where = { slug: { equals: 'welcome' } }
  const allWelcome = await payload.count({ collection: 'posts', where: welcome })
  check('setup: several tenants have a welcome post', allWelcome.totalDocs > 1)
  const posts = await payload.find({
    collection: 'posts',
    overrideAccess: false,
    draft: false,
    depth: 0,
    where: frontendTenantWhere(tenantId, welcome),
  })
  check('posts: welcome resolves to the admin post only', posts.docs.length === 1)
  check('posts: welcome is the admin tenant', onlyTenant(posts.docs, adminId))

  const postList = await payload.find({
    collection: 'posts',
    overrideAccess: false,
    depth: 0,
    limit: 1000,
    where: frontendTenantWhere(tenantId),
  })
  check('posts: list / sitemap only admin posts', onlyTenant(postList.docs, adminId))

  // search: synced docs carry the post's tenant
  const allSearch = await payload.count({ collection: 'search', where: welcome })
  check('setup: several tenants have a welcome search doc', allSearch.totalDocs > 1)
  const search = await payload.find({
    collection: 'search',
    depth: 0,
    where: frontendTenantWhere(tenantId, { or: [{ title: { like: 'Welcome' } }, welcome] }),
  })
  check(
    'search: results only from admin',
    search.docs.length > 0 && onlyTenant(search.docs, adminId),
  )

  // redirects: tenant1's /tenant1-redirect must not apply to the admin site
  const tenant1Redirect = await payload.count({
    collection: 'redirects',
    where: { and: [{ tenant: { equals: tenant1Id } }, { from: { equals: '/tenant1-redirect' } }] },
  })
  check('setup: tenant1 has a redirect', tenant1Redirect.totalDocs === 1)
  const redirects = await getRedirects(tenantId)
  check('redirects: only admin redirects', onlyTenant(redirects, adminId))
  check(
    "redirects: tenant1's redirect is not applied",
    !redirects.some((r) => r.from === '/tenant1-redirect'),
  )
} catch (err) {
  check('no crash', false)
  payload.logger.error({ msg: 'verify: frontendTenant crashed', err })
}

if (failures() > 0) {
  payload.logger.error(`verify: frontendTenant ${failures()} check(s) failed`)
  process.exit(1)
}
payload.logger.info('verify: frontendTenant all checks passed')
process.exit(0)
