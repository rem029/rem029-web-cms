/**
 * Checks signed preview token, canPreviewTenant, and previewURL.
 *
 *   pnpm payload run scripts/verify/preview.ts
 *   or: pnpm verify
 *
 * Read-only. Refuses to run in production.
 */
import config from '@payload-config'
import { getPayload } from 'payload'

import { canPreviewTenant, previewURL } from '@/common/utils/preview'
import { signPreview, verifyPreview } from '@/common/utils/previewToken'
import { getTenantURL } from '@/utilities/getURL'
import { SUPPORTED_LOCALES } from '@/utilities/constant'
import { createChecker, loadUser, reqFor } from './lib/verifyKit'

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

const tenant1Id = await tenantIdOf('tenant1')
const tenant2Id = await tenantIdOf('tenant2')
const tenant3Id = await tenantIdOf('tenant3')

// 1. Token verification checks
const secret = process.env.PAYLOAD_SECRET || 'test-secret'
const nowSec = Math.floor(Date.now() / 1000)
const validToken = signPreview({ userId: 1, tenantId: tenant1Id, exp: nowSec + 60 }, secret)

const roundtrip = verifyPreview(validToken, secret)
check(
  'token: sign/verify roundtrip',
  roundtrip.ok && roundtrip.claims.userId === 1 && roundtrip.claims.tenantId === tenant1Id,
)

const parts = validToken.split('.')
const tamperedPayload = Buffer.from(
  JSON.stringify({ userId: 999, tenantId: tenant1Id, exp: nowSec + 60 }),
  'utf8',
).toString('base64url')
const tamperedToken = `${tamperedPayload}.${parts[1]}`
const tampered = verifyPreview(tamperedToken, secret)
check('token: tampered payload returns signature', !tampered.ok && tampered.reason === 'signature')

const expiredToken = signPreview({ userId: 1, tenantId: tenant1Id, exp: nowSec - 10 }, secret)
const expired = verifyPreview(expiredToken, secret)
check('token: expired returns expired', !expired.ok && expired.reason === 'expired')

const garbage = verifyPreview('not-a-valid-token', secret)
check('token: garbage returns malformed', !garbage.ok && garbage.reason === 'malformed')

const wrongSecret = verifyPreview(validToken, 'wrong-secret')
check(
  'token: wrong secret returns signature',
  !wrongSecret.ok && wrongSecret.reason === 'signature',
)

// 2. canPreviewTenant checks with seeded users
const tenant1Editor = await loadUser(payload, 'tenant1-editor@example.test')
const tenant2Editor = await loadUser(payload, 'tenant2-editor@example.test')
const tenant3Editor = await loadUser(payload, 'tenant3-editor@example.test')
const superUser = await loadUser(payload, process.env.SEED_ADMIN_EMAIL || 'default@payload.com')
const disabled = await loadUser(payload, 'disabled@example.test')

check(
  'canPreviewTenant: tenant1 member for tenant1 is true',
  canPreviewTenant(tenant1Editor, tenant1Id, 'pages') === true,
)
check(
  'canPreviewTenant: tenant1 member for tenant2 is false',
  canPreviewTenant(tenant1Editor, tenant2Id, 'pages') === false,
)
check(
  'canPreviewTenant: super user for tenant1 is true',
  canPreviewTenant(superUser, tenant1Id, 'pages') === true,
)
check(
  'canPreviewTenant: super user for tenant2 is true',
  canPreviewTenant(superUser, tenant2Id, 'pages') === true,
)
check(
  'canPreviewTenant: disabled user is false',
  canPreviewTenant(disabled, tenant1Id, 'pages') === false,
)
check(
  'canPreviewTenant: inactive tenant for non-super member is false',
  canPreviewTenant(tenant3Editor, tenant3Id, 'pages') === false,
)

// cashier profile (access seed): reads pages, not header
const cashier = await loadUser(payload, 'cashier2@example.test')
check(
  'canPreviewTenant: tenant2 cashier previews tenant2 pages',
  canPreviewTenant(cashier, tenant2Id, 'pages') === true,
)
check(
  'canPreviewTenant: tenant2 cashier (no header read) cannot preview the header',
  canPreviewTenant(cashier, tenant2Id, 'header') === false,
)

// 3. previewURL checks
const prevBase = process.env.TENANT_BASE_DOMAIN
try {
  process.env.TENANT_BASE_DOMAIN = 'cms.app.rem029.com'

  const { docs: pages } = await payload.find({
    collection: 'pages',
    where: { tenant: { equals: tenant1Id } },
    limit: 1,
    depth: 0,
  })
  if (!pages[0]) throw new Error('verify: no page found for tenant1')
  const page = pages[0]

  const req1 = await reqFor(payload, tenant1Editor)
  const url1 = await previewURL({
    collection: 'pages',
    slug: page.slug,
    tenant: page.tenant,
    req: req1,
  })
  check('previewURL: tenant1 page for tenant1 editor returns url', url1 !== null)

  if (url1) {
    const parsed = new URL(url1)
    const expectedOrigin = getTenantURL({ slug: 'tenant1', domains: [] })
    check('previewURL: host is tenant1 URL', parsed.origin === expectedOrigin)
    const expectedPath =
      req1.locale && SUPPORTED_LOCALES.includes(req1.locale)
        ? `/${page.slug}?lang=${req1.locale}`
        : `/${page.slug}`
    check('previewURL: path param is correct', parsed.searchParams.get('path') === expectedPath)
    check(
      'previewURL: collection param is pages',
      parsed.searchParams.get('collection') === 'pages',
    )
    const tokenParam = parsed.searchParams.get('token')
    const verified = verifyPreview(tokenParam || '', process.env.PAYLOAD_SECRET || '')
    check(
      'previewURL: token verifies with tenantId=tenant1',
      verified.ok &&
        verified.claims.tenantId === tenant1Id &&
        verified.claims.userId === tenant1Editor.id,
    )
  }

  const req2 = await reqFor(payload, tenant2Editor)
  const url2 = await previewURL({
    collection: 'pages',
    slug: page.slug,
    tenant: page.tenant,
    req: req2,
  })
  check('previewURL: tenant2 editor on tenant1 page is null', url2 === null)
} finally {
  if (prevBase === undefined) delete process.env.TENANT_BASE_DOMAIN
  else process.env.TENANT_BASE_DOMAIN = prevBase
}

process.exit(failures() > 0 ? 1 : 0)
