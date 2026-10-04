/**
 * Checks that the public site reads only the tenant it serves,
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
import { findHomePage } from '@/common/utils/frontendHomePage'
import { findFrontendTenantId, frontendTenantWhere } from '@/common/utils/frontendTenant'
import { isAdminAliasHost, resolveTenantHost } from '@/common/utils/resolveTenantHost'
import { extractTenantId } from '@/common/utils/tenantCollections'
import { getRedirects } from '@/utilities/getRedirects'
import { getServerSideURL, getTenantURL } from '@/utilities/getURL'
import { createChecker, loadUser } from './lib/verifyKit'

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

const NEW_TENANT_SLUG = 'verify-new-tenant'
const disableRevalidate = { disableRevalidate: true }

// removes the throwaway tenant and the docs createTenantDocs made for it (also a crashed run's)
const removeNewTenant = async () => {
  const { docs } = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: NEW_TENANT_SLUG } },
    depth: 0,
  })
  for (const tenant of docs) {
    const where: Where = { tenant: { equals: tenant.id } }
    for (const collection of ['settings', 'pages', 'header', 'footer', 'theme'] as const) {
      await payload.delete({ collection, where, context: disableRevalidate })
    }
    await payload.delete({ collection: 'tenants', id: tenant.id, context: disableRevalidate })
  }
}

// a new business gets a published `home` page, set as its homepage
const checkNewTenant = async () => {
  await removeNewTenant()
  try {
    const tenant = await payload.create({
      collection: 'tenants',
      data: { name: 'Verify new tenant', slug: NEW_TENANT_SLUG },
    })
    const { docs: pages } = await payload.find({
      collection: 'pages',
      where: { and: [{ tenant: { equals: tenant.id } }, { slug: { equals: 'home' } }] },
      depth: 0,
    })
    const home = pages[0]
    check('new tenant: gets a published home page', home?._status === 'published')
    const { docs: settings } = await payload.find({
      collection: 'settings',
      where: { tenant: { equals: tenant.id } },
      depth: 0,
    })
    check(
      'new tenant: the home page is its homepage',
      Boolean(home) && extractTenantId(settings[0]?.homepage) === home?.id,
    )
    const served = await findHomePage(payload, tenant.id, { draft: false, locale: 'en' })
    check('new tenant: / serves it', served.source === 'settings' && served.page?.id === home?.id)
  } finally {
    await removeNewTenant()
  }
}

try {
  const adminId = await tenantIdOf(DEFAULT_TENANT_SLUG)
  const tenant1Id = await tenantIdOf('tenant1')
  const base = 'cms.example.test:3000'

  // resolveTenantHost unit checks
  check(
    'resolveTenantHost: base unset → default',
    resolveTenantHost('anything.test', undefined).kind === 'default',
  )
  check(
    'resolveTenantHost: CMS.example.test:3000 → default',
    resolveTenantHost('CMS.example.test:3000', base).kind === 'default',
  )
  const slugRes = resolveTenantHost('tenant1.cms.example.test', base)
  check(
    'resolveTenantHost: tenant1.cms.example.test → slug tenant1',
    slugRes.kind === 'slug' && slugRes.slug === 'tenant1',
  )
  const nestedRes = resolveTenantHost('a.b.cms.example.test', base)
  check(
    'resolveTenantHost: a.b.cms.example.test → domain',
    nestedRes.kind === 'domain' && nestedRes.domain === 'a.b.cms.example.test',
  )
  const customDomainRes = resolveTenantHost('shop.example.com', base)
  check(
    'resolveTenantHost: shop.example.com → domain',
    customDomainRes.kind === 'domain' && customDomainRes.domain === 'shop.example.com',
  )
  check(
    'resolveTenantHost: isAdminAliasHost on admin.cms.example.test is true',
    isAdminAliasHost('admin.cms.example.test', base) === true,
  )

  // findFrontendTenantId: base unset: every host serves admin
  const tenantId = await findFrontendTenantId(payload, 'cms.example.test', undefined)
  check('base unset: every host serves admin', tenantId === adminId)
  if (tenantId === null) throw new Error('verify: no frontend tenant')

  // findFrontendTenantId: base host → admin id
  const baseHostId = await findFrontendTenantId(payload, 'cms.example.test:3000', base)
  check('findFrontendTenantId: base host → admin id', baseHostId === adminId)

  // findFrontendTenantId: tenant1.cms.example.test → tenant1 id
  const tenant1HostId = await findFrontendTenantId(payload, 'tenant1.cms.example.test', base)
  check('findFrontendTenantId: tenant1.cms.example.test → tenant1 id', tenant1HostId === tenant1Id)

  // findFrontendTenantId: nope.cms.example.test → null
  const nopeHostId = await findFrontendTenantId(payload, 'nope.cms.example.test', base)
  check('findFrontendTenantId: nope.cms.example.test → null', nopeHostId === null)

  // findFrontendTenantId: tenant3.cms.example.test → null (tenant3 is inactive in the seed)
  const tenant3HostId = await findFrontendTenantId(payload, 'tenant3.cms.example.test', base)
  check(
    'findFrontendTenantId: tenant3.cms.example.test → null (tenant3 inactive)',
    tenant3HostId === null,
  )

  // custom domain check if seeded
  const { docs: tenant1Docs } = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: 'tenant1' } },
    limit: 1,
    depth: 0,
  })
  const tenant1 = tenant1Docs[0]
  const customDomain = tenant1?.domains?.[0]?.domain
  if (customDomain) {
    const customDomainTenantId = await findFrontendTenantId(payload, customDomain, base)
    check(
      'findFrontendTenantId: custom domain resolves to tenant1',
      customDomainTenantId === tenant1Id,
    )
  }

  // getTenantURL checks
  const prevBase = process.env.TENANT_BASE_DOMAIN
  try {
    process.env.TENANT_BASE_DOMAIN = 'cms.example.test:3000'
    const protocol = new URL(getServerSideURL()).protocol

    check(
      'getTenantURL: slug subdomain keeps port',
      getTenantURL({ slug: 'tenant1', domains: [] }) ===
        `${protocol}//tenant1.cms.example.test:3000`,
    )
    check(
      'getTenantURL: admin slug uses base domain',
      getTenantURL({ slug: DEFAULT_TENANT_SLUG, domains: [] }) ===
        `${protocol}//cms.example.test:3000`,
    )
    check(
      'getTenantURL: custom domain overrides slug',
      getTenantURL({ slug: 'x', domains: [{ domain: 'shop.example.com' }] }) ===
        `${protocol}//shop.example.com`,
    )
  } finally {
    // assigning undefined would store the string "undefined"
    if (prevBase === undefined) delete process.env.TENANT_BASE_DOMAIN
    else process.env.TENANT_BASE_DOMAIN = prevBase
  }

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

  // homepage: Settings → Homepage, else slug `home`, never another tenant's page
  const tenant2Id = await tenantIdOf('tenant2')
  const homeOptions = { draft: false, locale: 'en' } as const
  const adminHome = await findHomePage(payload, adminId, homeOptions)
  check(
    'homepage: admin serves its own home (slug fallback)',
    adminHome.source === 'slug' &&
      adminHome.page?.slug === 'home' &&
      onlyTenant([adminHome.page], adminId),
  )
  const tenant1Home = await findHomePage(payload, tenant1Id, homeOptions)
  check(
    'homepage: tenant1 serves a tenant1 page or the empty state',
    tenant1Home.page === null
      ? tenant1Home.source === 'none'
      : onlyTenant([tenant1Home.page], tenant1Id),
  )
  const tenant2Home = await findHomePage(payload, tenant2Id, homeOptions)
  check(
    'homepage: tenant2 serves the page picked in Settings (about)',
    tenant2Home.source === 'settings' &&
      tenant2Home.page?.slug === 'about' &&
      onlyTenant([tenant2Home.page], tenant2Id),
  )

  // admin: the Homepage column (virtual isHomepage) as a tenant2 editor sees it
  const tenant2Editor = await loadUser(payload, 'tenant2-editor@example.test')
  const { docs: tenant2Pages } = await payload.find({
    collection: 'pages',
    user: tenant2Editor,
    overrideAccess: false,
    depth: 0,
    where: { tenant: { equals: tenant2Id } },
  })
  const bySlug = (slug: string) => tenant2Pages.find((page) => page.slug === slug)
  check('admin: tenant2 about is marked Homepage', bySlug('about')?.isHomepage === true)
  check('admin: tenant2 home is not marked Homepage', bySlug('home')?.isHomepage === false)

  // no homepage picked (admin): the page with slug home is the one served at /
  const adminEditor = await loadUser(payload, 'admin-editor@example.test')
  const { docs: adminHomes } = await payload.find({
    collection: 'pages',
    user: adminEditor,
    overrideAccess: false,
    depth: 0,
    where: { and: [{ tenant: { equals: adminId } }, { slug: { equals: 'home' } }] },
  })
  check('admin: admin home is marked Homepage (slug fallback)', adminHomes[0]?.isHomepage === true)

  await checkNewTenant()
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
