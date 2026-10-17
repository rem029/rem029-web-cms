// The page a tenant serves at `/` (findHomePage: Settings → Homepage, else slug `home`, else
// none), the admin's Homepage column (virtual isHomepage), and a new business's home page.
// admin has no homepage picked (its `home` page is the fallback), test-b picked `about`.
import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { DEFAULT_TENANT_SLUG } from '@/common/utils/defaultTenant'
import { findHomePage } from '@/common/utils/frontendHomePage'
import { extractTenantId } from '@/common/utils/tenantCollections'
import type { Page, Setting, Tenant } from '@/payload-types'

import { getTestPayload } from '../common/payload'
import { TEST_CONTENT, TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { loadUser, type SessionUser } from '../common/users'

describe('home page', () => {
  let payload: Payload
  let admin: Tenant
  let tenantA: Tenant
  let tenantB: Tenant
  let otherTenant: SessionUser
  let superUser: SessionUser

  beforeAll(async () => {
    payload = await getTestPayload()
    admin = await findTenant(payload, DEFAULT_TENANT_SLUG)
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    tenantB = await findTenant(payload, TEST_TENANTS.b)
    otherTenant = await loadUser(payload, TEST_USERS.otherTenant)
    superUser = await loadUser(payload, TEST_USERS.superUser)
  })

  describe('findHomePage', () => {
    const options = { draft: false, locale: 'en' } as const

    it('serves admin its own home page by slug', async () => {
      // act
      const result = await findHomePage(payload, admin.id, options)

      // assert
      expect(result).toMatchObject({ source: 'slug', page: { slug: 'home' } })
      expect(extractTenantId(result.page?.tenant)).toBe(admin.id)
    })

    it('serves test-a its own home page', async () => {
      // act
      const result = await findHomePage(payload, tenantA.id, options)

      // assert
      expect(result).toMatchObject({ source: 'settings', page: { slug: 'home' } })
      expect(extractTenantId(result.page?.tenant)).toBe(tenantA.id)
    })

    it('serves test-b the page picked in Settings', async () => {
      // act
      const result = await findHomePage(payload, tenantB.id, options)

      // assert
      expect(result).toMatchObject({ source: 'settings', page: { slug: TEST_CONTENT.homepageOfB } })
      expect(extractTenantId(result.page?.tenant)).toBe(tenantB.id)
    })
  })

  describe('the Homepage column', () => {
    it("marks test-b's picked page", async () => {
      // act
      const { docs } = await payload.find({
        collection: 'pages',
        where: { tenant: { equals: tenantB.id } },
        user: otherTenant,
        overrideAccess: false,
        depth: 0,
        pagination: false,
      })

      // assert
      const page = docs.find((d) => d.slug === TEST_CONTENT.homepageOfB)
      expect(page?.isHomepage).toBe(true)
    })

    it("doesn't mark test-b's home page", async () => {
      // act
      const { docs } = await payload.find({
        collection: 'pages',
        where: { tenant: { equals: tenantB.id } },
        user: otherTenant,
        overrideAccess: false,
        depth: 0,
        pagination: false,
      })

      // assert
      const page = docs.find((d) => d.slug === 'home')
      expect(page?.isHomepage).toBe(false)
    })

    it("marks admin's home page without a pick", async () => {
      // act
      const { docs } = await payload.find({
        collection: 'pages',
        where: { and: [{ tenant: { equals: admin.id } }, { slug: { equals: 'home' } }] },
        user: superUser,
        overrideAccess: false,
        depth: 0,
      })

      // assert
      expect(docs[0]?.isHomepage).toBe(true)
    })
  })

  describe('a new business', () => {
    let tenant: Tenant
    let home: Page | undefined
    let settings: Setting | undefined

    beforeAll(async () => {
      // arrange
      const slug = uniqueName('new-business')
      tenant = await payload.create({
        collection: 'tenants',
        data: { name: slug, slug },
        context: { disableRevalidate: true },
      })
      const { docs: pages } = await payload.find({
        collection: 'pages',
        where: { and: [{ tenant: { equals: tenant.id } }, { slug: { equals: 'home' } }] },
        depth: 0,
        limit: 1,
      })
      home = pages[0]
      const { docs: settingsDocs } = await payload.find({
        collection: 'settings',
        where: { tenant: { equals: tenant.id } },
        depth: 0,
        limit: 1,
      })
      settings = settingsDocs[0]
    })

    afterAll(async () => {
      for (const collection of ['settings', 'pages', 'header', 'footer', 'theme'] as const) {
        await payload.delete({
          collection,
          where: { tenant: { equals: tenant.id } },
          context: { disableRevalidate: true },
        })
      }
      await payload.delete({
        collection: 'tenants',
        id: tenant.id,
        context: { disableRevalidate: true },
      })
    })

    it('gets a published home page', () => {
      // assert
      expect(home?._status).toBe('published')
    })

    it('has the home page as its homepage', () => {
      // assert
      expect(extractTenantId(settings?.homepage)).toBe(home?.id)
    })

    it('serves the home page at /', async () => {
      // act
      const result = await findHomePage(payload, tenant.id, { draft: false, locale: 'en' })

      // assert
      expect(result).toMatchObject({ source: 'settings', page: { id: home?.id } })
    })
  })
})
