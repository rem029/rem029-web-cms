/**
 * Checks per-tenant branding: the admin logo/accent of the selected tenant and that tenants'
 * themes differ (seeded: tenant1 Ocean #1d4ed8, tenant2 Sunset #b4232c).
 *
 *   pnpm payload run scripts/verify/branding.ts
 *   or: pnpm verify
 *
 * Read-only. Refuses to run in production.
 */
import config from '@payload-config'
import { getPayload } from 'payload'

import { getTenantDoc } from '@/common/utils/getTenantDoc'
import { accentFromThemeCSS, getAdminBranding } from '@/common/utils/tenantBranding'
import { adminTenantIdOf, createChecker, loadUser } from './lib/verifyKit'

if (process.env.NODE_ENV === 'production') {
  console.error('verify: refusing to run with NODE_ENV=production')
  process.exit(1)
}

const payload = await getPayload({ config })
const { check, failures } = createChecker(payload)

const tenantOf = async (slug: string) => {
  const { docs } = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
  })
  if (!docs[0]) throw new Error(`verify: tenant ${slug} not found, run pnpm seed`)
  return docs[0]
}

check('accent: 6-digit hex', accentFromThemeCSS(':root { --primary: #1D4ED8; }') === '#1D4ED8')
check('accent: 3-digit hex', accentFromThemeCSS('--primary:#abc;') === '#abc')
check('accent: named color is ignored', accentFromThemeCSS('--primary: red;') === null)
check('accent: url() is ignored', accentFromThemeCSS('--primary: url(x);') === null)
check(
  'accent: stops at the declaration end',
  accentFromThemeCSS('--primary: #1d4ed8; } body { color: red }') === '#1d4ed8',
)
check(
  'accent: injection attempt is ignored',
  accentFromThemeCSS('--primary: #1d4ed8 ") ; x') === null,
)
check('accent: no css', accentFromThemeCSS(undefined) === null)

const tenant1 = await tenantOf('tenant1')
const tenant2 = await tenantOf('tenant2')
const adminId = await adminTenantIdOf(payload)
const superUser = await loadUser(payload, process.env.SEED_ADMIN_EMAIL || 'default@payload.com')
const tenant1Editor = await loadUser(payload, 'tenant1-editor@example.test')

const superOnTenant2 = await getAdminBranding(payload, superUser, String(tenant2.id))
check(
  'branding: super user with tenant2 selected gets tenant2',
  superOnTenant2?.tenantName === tenant2.name && superOnTenant2?.accent === '#b4232c',
)

const editorOnTenant2 = await getAdminBranding(payload, tenant1Editor, String(tenant2.id))
check(
  'branding: tenant1 member selecting tenant2 falls back to tenant1',
  editorOnTenant2?.tenantName === tenant1.name && editorOnTenant2?.accent === '#1d4ed8',
)

const editorBadCookie = await getAdminBranding(payload, tenant1Editor, 'nope')
check(
  'branding: invalid cookie falls back to the first tenant',
  editorBadCookie?.tenantName === tenant1.name,
)

const admin = await payload.findByID({ collection: 'tenants', id: adminId, depth: 0 })
const loginPage = await getAdminBranding(payload, null, String(tenant2.id))
check('branding: no user gets the admin tenant', loginPage?.tenantName === admin.name)

const theme1 = await getTenantDoc('theme', tenant1.id)
const theme2 = await getTenantDoc('theme', tenant2.id)
const primaryOf = (css: string | null | undefined) => accentFromThemeCSS(css)
const active1 = theme1?.themes?.find((t) => t.active)?.css
const active2 = theme2?.themes?.find((t) => t.active)?.css
check(
  'themes: tenant1 and tenant2 have different --primary',
  primaryOf(active1) === '#1d4ed8' && primaryOf(active2) === '#b4232c',
)
check('themes: tenant2 uses another font', Boolean(active2?.includes("font-family: 'Urbanist'")))

process.exit(failures() > 0 ? 1 : 0)
