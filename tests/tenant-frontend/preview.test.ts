// Who may preview a tenant (canPreviewTenant) and the signed preview link (previewURL): the
// tenant's host, the path, the collection, and a token for that user and tenant.
import type { Payload } from 'payload'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { canPreviewTenant, previewURL } from '@/common/utils/preview'
import { verifyPreview } from '@/common/utils/previewToken'
import type { Page, Tenant } from '@/payload-types'

import { getTestPayload } from '../common/payload'
import { TEST_CONTENT, TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { loadUser, reqFor, type SessionUser } from '../common/users'

describe('preview', () => {
  let payload: Payload
  let tenantA: Tenant
  let tenantB: Tenant
  let inactive: Tenant
  let member: SessionUser
  let otherTenant: SessionUser
  let inactiveMember: SessionUser
  let superUser: SessionUser
  let disabled: SessionUser
  let templateEditor: SessionUser
  let homeA: Page

  beforeAll(async () => {
    payload = await getTestPayload()
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    tenantB = await findTenant(payload, TEST_TENANTS.b)
    inactive = await findTenant(payload, TEST_TENANTS.inactive)
    member = await loadUser(payload, TEST_USERS.member)
    otherTenant = await loadUser(payload, TEST_USERS.otherTenant)
    inactiveMember = await loadUser(payload, TEST_USERS.inactiveMember)
    superUser = await loadUser(payload, TEST_USERS.superUser)
    disabled = await loadUser(payload, TEST_USERS.disabled)
    templateEditor = await loadUser(payload, TEST_USERS.templateEditor)

    const { docs: pages } = await payload.find({
      collection: 'pages',
      where: { and: [{ tenant: { equals: tenantA.id } }, { slug: { equals: 'home' } }] },
      depth: 0,
      limit: 1,
    })
    if (!pages[0]) {
      throw new Error('tests: no home page in test-a')
    }
    homeA = pages[0]
  })

  describe('canPreviewTenant', () => {
    it('lets a member preview their business', () => {
      // act
      const allowed = canPreviewTenant(member, tenantA.id, 'pages')

      // assert
      expect(allowed).toBe(true)
    })

    it("refuses a member another business's preview", () => {
      // act
      const allowed = canPreviewTenant(member, tenantB.id, 'pages')

      // assert
      expect(allowed).toBe(false)
    })

    it('lets the super user preview test-a', () => {
      // act
      const allowed = canPreviewTenant(superUser, tenantA.id, 'pages')

      // assert
      expect(allowed).toBe(true)
    })

    it('lets the super user preview test-b', () => {
      // act
      const allowed = canPreviewTenant(superUser, tenantB.id, 'pages')

      // assert
      expect(allowed).toBe(true)
    })

    it('refuses a disabled user', () => {
      // act
      const allowed = canPreviewTenant(disabled, tenantA.id, 'pages')

      // assert
      expect(allowed).toBe(false)
    })

    it('refuses a member of an inactive business', () => {
      // act
      const allowed = canPreviewTenant(inactiveMember, inactive.id, 'pages')

      // assert
      expect(allowed).toBe(false)
    })

    it('lets a pages-only reader preview pages', () => {
      // act
      const allowed = canPreviewTenant(templateEditor, tenantA.id, 'pages')

      // assert
      expect(allowed).toBe(true)
    })

    it('refuses a pages-only reader the header', () => {
      // act
      const allowed = canPreviewTenant(templateEditor, tenantA.id, 'header')

      // assert
      expect(allowed).toBe(false)
    })
  })

  describe('previewURL', () => {
    const linkFor = async (user: SessionUser) =>
      previewURL({
        collection: 'pages',
        slug: homeA.slug,
        tenant: homeA.tenant,
        req: await reqFor(payload, user),
      })

    beforeEach(() => {
      // arrange
      vi.stubEnv('TENANT_BASE_DOMAIN', 'cms.example.test')
      vi.stubEnv('NEXT_PUBLIC_SERVER_URL', 'http://localhost:3000')
    })

    afterEach(() => {
      vi.unstubAllEnvs()
    })

    it("gives a member a link for their business's page", async () => {
      // act
      const url = await linkFor(member)

      // assert
      expect(url).toEqual(expect.any(String))
    })

    it("points at the business's host", async () => {
      // act
      const url = await linkFor(member)

      // assert
      // test-a's public url: its custom domain wins over the slug
      expect(new URL(url ?? '').origin).toBe(`http://${TEST_CONTENT.domainOfA}`)
    })

    it('passes the page path with the locale', async () => {
      // act
      const url = await linkFor(member)

      // assert
      expect(new URL(url ?? '').searchParams.get('path')).toBe('/home?lang=en')
    })

    it('passes the collection', async () => {
      // act
      const url = await linkFor(member)

      // assert
      expect(new URL(url ?? '').searchParams.get('collection')).toBe('pages')
    })

    it('signs a token for the user and the business', async () => {
      // act
      const url = await linkFor(member)
      const result = verifyPreview(
        new URL(url ?? '').searchParams.get('token') ?? '',
        process.env.PAYLOAD_SECRET ?? '',
      )

      // assert
      expect(result).toEqual({
        ok: true,
        claims: expect.objectContaining({ tenantId: tenantA.id, userId: member.id }),
      })
    })

    it("gives another business's member no link", async () => {
      // act
      const url = await linkFor(otherTenant)

      // assert
      expect(url).toBeNull()
    })
  })
})
