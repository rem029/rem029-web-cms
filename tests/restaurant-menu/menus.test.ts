// Menus (rem0017 phase 2 step 1): a menu is the page at /menu/<slug>; it picks items from its
// tenant's catalog and has drafts and hidden documents like Pages. Local API with overrideAccess:
// false and seeded users; TEST_MENU fixtures (items and menus in test-a and test-b).
import type { Payload, Where } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { extractTenantId } from '@/common/utils/tenantCollections'
import type { Menu, Tenant } from '@/payload-types'

import { rejectionText } from '../common/errors'
import { getTestPayload } from '../common/payload'
import { TEST_MENU, TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { loadUser, type SessionUser } from '../common/users'

const context = { disableRevalidate: true }

type MenuData = Partial<Pick<Menu, 'slug' | 'items' | 'isHidden' | 'visibleTo' | '_status'>> & {
  title?: string
}

describe('menus', () => {
  let payload: Payload
  let tenantA: Tenant
  let tenantB: Tenant
  let member: SessionUser
  let otherTenant: SessionUser
  let multiTenant: SessionUser
  let viewer: SessionUser
  let superUser: SessionUser

  const inTenant = (tenant: Tenant, where: Where): Where => ({
    and: [{ tenant: { equals: tenant.id } }, where],
  })

  const itemId = async (tenant: Tenant, slug: string): Promise<number> => {
    const { docs } = await payload.find({
      collection: 'menu-items',
      where: inTenant(tenant, { slug: { equals: slug } }),
      limit: 1,
      depth: 0,
    })
    if (!docs[0]) throw new Error(`tests: no item ${slug} in ${tenant.slug}`)
    return docs[0].id
  }

  const createMenu = (user: SessionUser, tenant: Tenant, data: MenuData = {}) =>
    payload.create({
      collection: 'menus',
      data: { title: uniqueName('Menu'), ...data, tenant: tenant.id },
      draft: data._status !== 'published',
      user,
      overrideAccess: false,
      depth: 0,
      context,
    })

  const slugsSeenBy = async (user: SessionUser | null, tenant: Tenant): Promise<string[]> => {
    const { docs } = await payload.find({
      collection: 'menus',
      where: { tenant: { equals: tenant.id } },
      ...(user ? { user } : {}),
      overrideAccess: false,
      depth: 0,
      pagination: false,
    })
    return docs.map((doc) => doc.slug ?? '')
  }

  beforeAll(async () => {
    payload = await getTestPayload()
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    tenantB = await findTenant(payload, TEST_TENANTS.b)
    member = await loadUser(payload, TEST_USERS.member)
    otherTenant = await loadUser(payload, TEST_USERS.otherTenant)
    multiTenant = await loadUser(payload, TEST_USERS.multiTenant)
    viewer = await loadUser(payload, TEST_USERS.viewer)
    superUser = await loadUser(payload, TEST_USERS.superUser)
  })

  describe('access', () => {
    it('lets an editor create a menu in their tenant', async () => {
      // act
      const menu = await createMenu(member, tenantA)

      // assert
      expect(extractTenantId(menu.tenant)).toBe(tenantA.id)
    })

    it('hides menus of other tenants from members', async () => {
      // act
      const { docs } = await payload.find({
        collection: 'menus',
        draft: true,
        user: otherTenant,
        overrideAccess: false,
        depth: 0,
        pagination: false,
      })

      // assert
      expect(docs.length).toBeGreaterThan(0)
      expect([...new Set(docs.map((doc) => extractTenantId(doc.tenant)))]).toEqual([tenantB.id])
    })

    it('denies menus to a viewer for writes', async () => {
      // act / assert
      await expect(createMenu(viewer, tenantA)).rejects.toMatchObject({ status: 403 })
    })

    it('keeps draft menus from anonymous readers', async () => {
      // act
      const slugs = await slugsSeenBy(null, tenantA)

      // assert
      expect(slugs).toContain(TEST_MENU.dinner)
      expect(slugs).not.toContain(TEST_MENU.draftMenu)
    })

    it('hides a hidden menu from other members', async () => {
      // arrange
      const hidden = await createMenu(member, tenantA, { isHidden: true })

      // act
      const slugs = await slugsSeenBy(multiTenant, tenantA)

      // assert
      expect(slugs).not.toContain(hidden.slug)
    })
  })

  describe('slug', () => {
    it('fills the slug from the title', async () => {
      // arrange
      const title = uniqueName('Late Breakfast')

      // act
      const menu = await createMenu(member, tenantA, { title })

      // assert
      expect(menu.slug).toBe(title.replace(/ /g, '-').toLowerCase())
    })

    it('refuses a duplicate slug in one tenant', async () => {
      // arrange
      const slug = uniqueName('dup-menu')
      await createMenu(member, tenantA, { slug })

      // act
      const message = await rejectionText(createMenu(member, tenantA, { slug }))

      // assert
      expect(message).toContain('already exists in this business')
    })

    it('allows the same slug in another tenant', async () => {
      // arrange
      const slug = uniqueName('shared-menu')
      await createMenu(member, tenantA, { slug })

      // act
      const inB = await createMenu(otherTenant, tenantB, { slug })

      // assert
      expect(inB.slug).toBe(slug)
    })
  })

  describe('items', () => {
    it('keeps the order of picked items', async () => {
      // arrange
      const soup = await itemId(tenantA, TEST_MENU.soup)
      const steak = await itemId(tenantA, TEST_MENU.steak)
      const lemonade = await itemId(tenantA, TEST_MENU.lemonade)

      // act
      const menu = await createMenu(member, tenantA, { items: [lemonade, soup, steak] })

      // assert
      expect((menu.items ?? []).map(extractTenantId)).toEqual([lemonade, soup, steak])
    })

    it('refuses an item from another tenant', async () => {
      // arrange
      const soupOfB = await itemId(tenantB, TEST_MENU.soup)

      // act
      const message = await rejectionText(
        createMenu(superUser, tenantA, { items: [soupOfB], _status: 'published' }),
      )

      // assert
      expect(message).toContain('belongs to another business')
    })

    it('refuses an item from another tenant on a draft save', async () => {
      // arrange
      const menu = await createMenu(superUser, tenantA)
      const soupOfB = await itemId(tenantB, TEST_MENU.soup)

      // act
      const message = await rejectionText(
        payload.update({
          collection: 'menus',
          id: menu.id,
          data: { items: [soupOfB] },
          draft: true,
          user: superUser,
          overrideAccess: false,
          context,
        }),
      )

      // assert
      expect(message).toContain('belongs to another business')
    })
  })

  describe('page fields', () => {
    it('starts with search on and other filters off', async () => {
      // act
      const menu = await createMenu(member, tenantA)

      // assert
      expect(menu.filters).toMatchObject({
        showSearch: true,
        showAllergens: false,
        showAvailability: false,
      })
    })
  })
})
