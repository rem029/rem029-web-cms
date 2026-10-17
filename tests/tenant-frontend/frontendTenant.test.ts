// The public site reads only the tenant its host serves: findFrontendTenantId (host → tenant,
// unknown / inactive → null), frontendTenantWhere, and the frontend's anonymous reads of pages,
// posts, search and redirects while other tenants have docs with the same slugs (TEST_CONTENT).
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { DEFAULT_TENANT_SLUG } from '@/common/utils/defaultTenant'
import { findFrontendTenantId, frontendTenantWhere } from '@/common/utils/frontendTenant'
import { extractTenantId } from '@/common/utils/tenantCollections'
import type { Tenant } from '@/payload-types'
import { getRedirects } from '@/utilities/getRedirects'

import { getTestPayload } from '../common/payload'
import { TEST_CONTENT, TEST_TENANTS } from '../common/seed'
import { findTenant } from '../common/tenants'

const BASE = 'cms.example.test:3000'

describe('frontend tenant', () => {
  let payload: Payload
  let admin: Tenant
  let tenantA: Tenant

  const tenantIdsOf = (docs: { tenant?: unknown }[]) => [
    ...new Set(docs.map((doc) => extractTenantId(doc.tenant))),
  ]

  beforeAll(async () => {
    payload = await getTestPayload()
    admin = await findTenant(payload, DEFAULT_TENANT_SLUG)
    tenantA = await findTenant(payload, TEST_TENANTS.a)

    const homePages = await payload.count({
      collection: 'pages',
      where: { slug: { equals: 'home' } },
    })
    expect(homePages.totalDocs).toBeGreaterThan(1)

    const onlyInAPages = await payload.count({
      collection: 'pages',
      where: { slug: { equals: TEST_CONTENT.onlyInA } },
    })
    expect(onlyInAPages.totalDocs).toBe(1)

    const welcomePosts = await payload.count({
      collection: 'posts',
      where: { slug: { equals: TEST_CONTENT.welcomePost } },
    })
    expect(welcomePosts.totalDocs).toBeGreaterThan(1)

    const welcomeSearch = await payload.count({
      collection: 'search',
      where: { slug: { equals: TEST_CONTENT.welcomePost } },
    })
    expect(welcomeSearch.totalDocs).toBeGreaterThan(1)

    const redirectInA = await payload.count({
      collection: 'redirects',
      where: {
        and: [{ tenant: { equals: tenantA.id } }, { from: { equals: TEST_CONTENT.redirectInA } }],
      },
    })
    expect(redirectInA.totalDocs).toBe(1)
  })

  describe('findFrontendTenantId', () => {
    it('serves admin on every host without a base', async () => {
      // act
      const id = await findFrontendTenantId(payload, 'cms.example.test', undefined)

      // assert
      expect(id).toBe(admin.id)
    })

    it('serves admin on the base host', async () => {
      // act
      const id = await findFrontendTenantId(payload, BASE, BASE)

      // assert
      expect(id).toBe(admin.id)
    })

    it('serves test-a on its subdomain', async () => {
      // act
      const id = await findFrontendTenantId(payload, 'test-a.cms.example.test', BASE)

      // assert
      expect(id).toBe(tenantA.id)
    })

    it('serves test-a on its custom domain', async () => {
      // act
      const id = await findFrontendTenantId(payload, TEST_CONTENT.domainOfA, BASE)

      // assert
      expect(id).toBe(tenantA.id)
    })

    it('serves nothing on an unknown subdomain', async () => {
      // act
      const id = await findFrontendTenantId(payload, 'nope.cms.example.test', BASE)

      // assert
      expect(id).toBe(null)
    })

    it('serves nothing for an inactive tenant', async () => {
      // act
      const id = await findFrontendTenantId(payload, 'test-inactive.cms.example.test', BASE)

      // assert
      expect(id).toBe(null)
    })
  })

  describe('frontendTenantWhere', () => {
    it('gives the tenant filter alone without a where', () => {
      // act
      const where = frontendTenantWhere(admin.id)

      // assert
      expect(where).toEqual({ tenant: { equals: admin.id } })
    })

    it("keeps the caller's where", () => {
      // act
      const where = frontendTenantWhere(admin.id, { slug: { equals: 'home' } })

      // assert
      expect(where).toEqual({
        and: [{ tenant: { equals: admin.id } }, { slug: { equals: 'home' } }],
      })
    })
  })

  // the frontend's queries as admin's host runs them: anonymous, overrideAccess false
  describe('public reads on the admin host', () => {
    it('finds one home page', async () => {
      // act
      const result = await payload.find({
        collection: 'pages',
        draft: false,
        overrideAccess: false,
        depth: 0,
        where: frontendTenantWhere(admin.id, { slug: { equals: 'home' } }),
      })

      // assert
      expect(result.totalDocs).toBe(1)
    })

    it("finds admin's home page", async () => {
      // act
      const { docs } = await payload.find({
        collection: 'pages',
        draft: false,
        overrideAccess: false,
        depth: 0,
        where: frontendTenantWhere(admin.id, { slug: { equals: 'home' } }),
      })

      // assert
      expect(tenantIdsOf(docs)).toEqual([admin.id])
    })

    it("doesn't find a page only test-a has", async () => {
      // act
      const { docs } = await payload.find({
        collection: 'pages',
        overrideAccess: false,
        depth: 0,
        where: frontendTenantWhere(admin.id, { slug: { equals: TEST_CONTENT.onlyInA } }),
      })

      // assert
      expect(docs).toEqual([])
    })

    it('lists only admin pages for the sitemap', async () => {
      // act
      const { docs } = await payload.find({
        collection: 'pages',
        draft: false,
        pagination: false,
        overrideAccess: false,
        depth: 0,
        where: frontendTenantWhere(admin.id),
      })

      // assert
      expect(tenantIdsOf(docs)).toEqual([admin.id])
    })

    it('finds one welcome post', async () => {
      // act
      const result = await payload.find({
        collection: 'posts',
        draft: false,
        overrideAccess: false,
        depth: 0,
        where: frontendTenantWhere(admin.id, { slug: { equals: TEST_CONTENT.welcomePost } }),
      })

      // assert
      expect(result.totalDocs).toBe(1)
    })

    it("finds admin's welcome post", async () => {
      // act
      const { docs } = await payload.find({
        collection: 'posts',
        draft: false,
        overrideAccess: false,
        depth: 0,
        where: frontendTenantWhere(admin.id, { slug: { equals: TEST_CONTENT.welcomePost } }),
      })

      // assert
      expect(tenantIdsOf(docs)).toEqual([admin.id])
    })

    it('lists only admin posts', async () => {
      // act
      const { docs } = await payload.find({
        collection: 'posts',
        pagination: false,
        overrideAccess: false,
        depth: 0,
        where: frontendTenantWhere(admin.id),
      })

      // assert
      expect(tenantIdsOf(docs)).toEqual([admin.id])
    })

    it('searches only admin docs', async () => {
      // act
      const { docs } = await payload.find({
        collection: 'search',
        overrideAccess: false,
        depth: 0,
        where: frontendTenantWhere(admin.id, {
          or: [{ title: { like: 'Welcome' } }, { slug: { equals: TEST_CONTENT.welcomePost } }],
        }),
      })

      // assert
      expect(tenantIdsOf(docs)).toEqual([admin.id])
    })

    it('gets only admin redirects', async () => {
      // act
      const redirects = await getRedirects(admin.id)

      // assert
      expect(tenantIdsOf(redirects)).toEqual([admin.id])
    })

    it("doesn't apply test-a's redirect", async () => {
      // act
      const redirects = await getRedirects(admin.id)

      // assert
      expect(redirects.map((r) => r.from)).not.toContain(TEST_CONTENT.redirectInA)
    })
  })
})
