// Inactive tenants: content in a business with `isActive` false is read-only for its members and
// tenant admins (reads, nav and membership unchanged); super users and active businesses are
// unaffected. inactiveMember is an editor of test-inactive, inactiveAdmin its tenant admin.
import type { Payload, RequiredDataFromCollectionSlug } from 'payload'
import { beforeAll, describe, expect, it, onTestFinished } from 'vitest'

import { accessCheckResolver } from '@/common/utils/access'
import { extractTenantId } from '@/common/utils/tenantCollections'
import type { Header, Page, Tenant } from '@/payload-types'

import { contentLayout, richText } from '../common/content'
import { getTestPayload } from '../common/payload'
import { TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { loadUser, reqFor, type SessionUser } from '../common/users'
import { context } from './pages'

describe('inactive tenants', () => {
  let payload: Payload
  let superUser: SessionUser
  let inactiveMember: SessionUser
  let inactiveAdmin: SessionUser
  let templateEditor: SessionUser
  let inactive: Tenant
  let tenantA: Tenant
  let homeInactive: Page
  let headerInactive: Header

  const findAs = (user: SessionUser, collection: 'pages' | 'header' | 'theme' | 'settings') =>
    payload.find({
      collection,
      where: { tenant: { equals: inactive.id } },
      user,
      overrideAccess: false,
    })

  const newPageData = (tenantId: number): RequiredDataFromCollectionSlug<'pages'> => {
    const slug = uniqueName('inactive')
    return {
      title: slug,
      slug,
      tenant: tenantId,
      hero: { main: { type: 'none' } },
      layout: contentLayout(richText('Inactive test')),
    }
  }

  const createPageAsSuperUser = (tenantId: number): Promise<Page> =>
    payload.create({
      collection: 'pages',
      data: newPageData(tenantId),
      overrideAccess: true,
      context,
    })

  beforeAll(async () => {
    payload = await getTestPayload()
    superUser = await loadUser(payload, TEST_USERS.superUser)
    inactiveMember = await loadUser(payload, TEST_USERS.inactiveMember)
    inactiveAdmin = await loadUser(payload, TEST_USERS.inactiveAdmin)
    templateEditor = await loadUser(payload, TEST_USERS.templateEditor)
    inactive = await findTenant(payload, TEST_TENANTS.inactive)
    tenantA = await findTenant(payload, TEST_TENANTS.a)

    const { docs: pages } = await payload.find({
      collection: 'pages',
      where: { and: [{ tenant: { equals: inactive.id } }, { slug: { equals: 'home' } }] },
      limit: 1,
      depth: 0,
    })
    if (!pages[0]) {
      throw new Error(`tests: no home page in tenant ${inactive.slug}`)
    }
    homeInactive = pages[0]

    const { docs: headers } = await payload.find({
      collection: 'header',
      where: { tenant: { equals: inactive.id } },
      limit: 1,
      depth: 0,
    })
    if (!headers[0]) {
      throw new Error(`tests: no header doc in tenant ${inactive.slug}`)
    }
    headerInactive = headers[0]
  })

  describe('seed', () => {
    it('has test-inactive inactive', () => {
      // assert
      expect(inactive.isActive).toBe(false)
    })

    it('gives inactiveMember a test-inactive row', () => {
      // assert
      expect(
        (inactiveMember.tenants ?? []).some((r) => extractTenantId(r.tenant) === inactive.id),
      ).toBe(true)
    })

    it('makes inactiveAdmin tenant admin of test-inactive', () => {
      // assert
      expect(
        (inactiveAdmin.tenants ?? []).some(
          (r) => extractTenantId(r.tenant) === inactive.id && r.isTenantAdmin === true,
        ),
      ).toBe(true)
    })
  })

  describe('member', () => {
    it.each(['pages', 'header', 'theme', 'settings'] as const)('reads %s', async (collection) => {
      // act
      const result = await findAs(inactiveMember, collection)

      // assert
      expect(result.totalDocs).toBeGreaterThan(0)
    })

    it('refuses creating a page', async () => {
      // act / assert
      await expect(
        payload.create({
          collection: 'pages',
          data: newPageData(inactive.id),
          user: inactiveMember,
          overrideAccess: false,
          context,
        }),
      ).rejects.toMatchObject({ status: 403 })
    })

    it('refuses updating a page', async () => {
      // act / assert
      await expect(
        payload.update({
          collection: 'pages',
          id: homeInactive.id,
          data: { title: 'updated by member', slug: homeInactive.slug },
          user: inactiveMember,
          overrideAccess: false,
          context,
        }),
      ).rejects.toMatchObject({ status: expect.toBeOneOf([403, 404]) })
    })

    it('refuses deleting a page', async () => {
      // act / assert
      await expect(
        payload.delete({
          collection: 'pages',
          id: homeInactive.id,
          user: inactiveMember,
          overrideAccess: false,
          context,
        }),
      ).rejects.toMatchObject({ status: expect.toBeOneOf([403, 404]) })
    })

    it('refuses updating the header', async () => {
      // act / assert
      await expect(
        payload.update({
          collection: 'header',
          id: headerInactive.id,
          data: { navItems: [] },
          user: inactiveMember,
          overrideAccess: false,
          context,
        }),
      ).rejects.toMatchObject({ status: expect.toBeOneOf([403, 404]) })
    })

    it('refuses creating media', async () => {
      // act / assert
      await expect(
        payload.create({
          collection: 'media',
          data: { alt: uniqueName('inactive-media'), tenant: inactive.id },
          user: inactiveMember,
          overrideAccess: false,
          context,
        }),
      ).rejects.toMatchObject({ status: 403 })
    })

    it('refuses creating a category', async () => {
      // act / assert
      await expect(
        payload.create({
          collection: 'categories',
          data: { title: uniqueName('inactive-cat'), tenant: inactive.id },
          user: inactiveMember,
          overrideAccess: false,
        }),
      ).rejects.toMatchObject({ status: 403 })
    })
  })

  describe('tenant admin', () => {
    it.each(['pages', 'header'] as const)('reads %s', async (collection) => {
      // act
      const result = await findAs(inactiveAdmin, collection)

      // assert
      expect(result.totalDocs).toBeGreaterThan(0)
    })

    it('refuses creating a page', async () => {
      // act / assert
      await expect(
        payload.create({
          collection: 'pages',
          data: newPageData(inactive.id),
          user: inactiveAdmin,
          overrideAccess: false,
          context,
        }),
      ).rejects.toMatchObject({ status: 403 })
    })

    it('refuses updating a page', async () => {
      // act / assert
      await expect(
        payload.update({
          collection: 'pages',
          id: homeInactive.id,
          data: { title: 'updated by admin', slug: homeInactive.slug },
          user: inactiveAdmin,
          overrideAccess: false,
          context,
        }),
      ).rejects.toMatchObject({ status: expect.toBeOneOf([403, 404]) })
    })

    it('refuses deleting a page', async () => {
      // act / assert
      await expect(
        payload.delete({
          collection: 'pages',
          id: homeInactive.id,
          user: inactiveAdmin,
          overrideAccess: false,
          context,
        }),
      ).rejects.toMatchObject({ status: expect.toBeOneOf([403, 404]) })
    })

    it('refuses updating the header', async () => {
      // act / assert
      await expect(
        payload.update({
          collection: 'header',
          id: headerInactive.id,
          data: { navItems: [] },
          user: inactiveAdmin,
          overrideAccess: false,
          context,
        }),
      ).rejects.toMatchObject({ status: expect.toBeOneOf([403, 404]) })
    })

    it('refuses renaming the business', async () => {
      // act / assert
      await expect(
        payload.update({
          collection: 'tenants',
          id: inactive.id,
          data: { name: 'Attempted Renamed Inactive' },
          user: inactiveAdmin,
          overrideAccess: false,
          context,
        }),
      ).rejects.toMatchObject({ status: expect.toBeOneOf([403, 404]) })
    })

    it('still reads its members', async () => {
      // act
      const { docs } = await payload.find({
        collection: 'users',
        user: inactiveAdmin,
        overrideAccess: false,
        pagination: false,
      })

      // assert
      expect(docs.map((u) => u.email)).toContain(inactiveMember.email)
    })
  })

  it('lets the super user update a page', async () => {
    // arrange
    const page = await createPageAsSuperUser(inactive.id)

    // act
    const updated = await payload.update({
      collection: 'pages',
      id: page.id,
      data: { title: 'updated by super user', slug: page.slug },
      user: superUser,
      overrideAccess: false,
      context,
    })

    // assert
    expect(updated.id).toBe(page.id)
  })

  describe('an active business', () => {
    it('lets templateEditor create a test-a page', async () => {
      // act
      const created = await payload.create({
        collection: 'pages',
        data: newPageData(tenantA.id),
        user: templateEditor,
        overrideAccess: false,
        context,
      })

      // assert
      expect(created.id).toBeTypeOf('number')
    })

    it('lets templateEditor delete a test-a page', async () => {
      // arrange
      const created = await payload.create({
        collection: 'pages',
        data: newPageData(tenantA.id),
        user: templateEditor,
        overrideAccess: false,
        context,
      })

      // act
      const deleted = await payload.delete({
        collection: 'pages',
        id: created.id,
        user: templateEditor,
        overrideAccess: false,
        context,
      })

      // assert
      expect(deleted.id).toBe(created.id)
    })
  })

  it('denies the member update in accessCheckResolver', async () => {
    // act
    const allowed = await accessCheckResolver(
      'pages',
      'update',
    )({
      req: await reqFor(payload, inactiveMember),
    })

    // assert
    expect(allowed).toBe(false)
  })

  it('lets the member update a page once reactivated', async () => {
    // arrange
    const page = await createPageAsSuperUser(inactive.id)
    onTestFinished(async () => {
      await payload.update({
        collection: 'tenants',
        id: inactive.id,
        data: { isActive: false },
        overrideAccess: true,
      })
    })
    await payload.update({
      collection: 'tenants',
      id: inactive.id,
      data: { isActive: true },
      overrideAccess: true,
    })
    const reloadedMember = await loadUser(payload, TEST_USERS.inactiveMember)

    // act
    const updated = await payload.update({
      collection: 'pages',
      id: page.id,
      data: { title: 'reactivated title', slug: page.slug },
      user: reloadedMember,
      overrideAccess: false,
      context,
    })

    // assert
    expect(updated.id).toBe(page.id)
  })
})
