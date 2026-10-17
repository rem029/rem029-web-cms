// Per-tenant branding: the admin's name and accent come from the selected tenant
// (getAdminBranding), and the seeded themes differ (TEST_THEMES).
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { DEFAULT_TENANT_SLUG } from '@/common/utils/defaultTenant'
import { getTenantDoc } from '@/common/utils/getTenantDoc'
import { accentFromThemeCSS, getAdminBranding } from '@/common/utils/tenantBranding'
import type { Tenant } from '@/payload-types'

import { getTestPayload } from '../common/payload'
import { TEST_TENANTS, TEST_THEMES, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { loadUser, type SessionUser } from '../common/users'

describe('admin branding', () => {
  let payload: Payload
  let admin: Tenant
  let tenantA: Tenant
  let tenantB: Tenant
  let superUser: SessionUser
  let member: SessionUser

  beforeAll(async () => {
    payload = await getTestPayload()
    admin = await findTenant(payload, DEFAULT_TENANT_SLUG)
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    tenantB = await findTenant(payload, TEST_TENANTS.b)
    superUser = await loadUser(payload, TEST_USERS.superUser)
    member = await loadUser(payload, TEST_USERS.member)
  })

  it('gives the super user the selected business', async () => {
    // act
    const result = await getAdminBranding(payload, superUser, String(tenantB.id))

    // assert
    expect(result).toMatchObject({ tenantName: tenantB.name, accent: TEST_THEMES.b.primary })
  })

  it("falls back to the member's business for another one", async () => {
    // act
    const result = await getAdminBranding(payload, member, String(tenantB.id))

    // assert
    expect(result).toMatchObject({ tenantName: tenantA.name, accent: TEST_THEMES.a.primary })
  })

  it('falls back to the first business on a bad cookie', async () => {
    // act
    const result = await getAdminBranding(payload, member, 'nope')

    // assert
    expect(result).toMatchObject({ tenantName: tenantA.name })
  })

  it('gives the login page the admin tenant', async () => {
    // act
    const result = await getAdminBranding(payload, null, String(tenantB.id))

    // assert
    expect(result).toMatchObject({ tenantName: admin.name })
  })

  describe('themes', () => {
    const activeCSS = async (tenantId: number) =>
      (await getTenantDoc('theme', tenantId))?.themes?.find((t) => t.active)?.css

    it('gives test-a and test-b different primaries', async () => {
      // act
      const primaries = [
        accentFromThemeCSS(await activeCSS(tenantA.id)),
        accentFromThemeCSS(await activeCSS(tenantB.id)),
      ]

      // assert
      expect(primaries).toEqual([TEST_THEMES.a.primary, TEST_THEMES.b.primary])
    })

    it('gives test-b another font', async () => {
      // act
      const css = await activeCSS(tenantB.id)

      // assert
      expect(css).toContain(`font-family: '${TEST_THEMES.b.font}'`)
    })
  })
})
