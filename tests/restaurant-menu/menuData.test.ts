// The guest menu page's data (rem0017 phase 3 step 1, `src/app/(frontend)/menu/_data/menuData.ts`):
// findMenuPage and searchMenuItems take the host's tenant id and fail closed without one;
// buildMenuSections is pure. TEST_MENU has a published menu with the same slug in test-a and test-b.
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import {
  buildMenuSections,
  findMenuPage,
  searchMenuItems,
} from '@/app/(frontend)/menu/_data/menuData'
import { extractTenantId } from '@/common/utils/tenantCollections'
import type { MenuCategory, MenuItem, Tenant } from '@/payload-types'

import { getTestPayload } from '../common/payload'
import { TEST_MENU, TEST_TENANTS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'

const context = { disableRevalidate: true }
const published = { draft: false, locale: 'en' } as const

const NOW = '2026-10-17T00:00:00.000Z'

const category = (id: number, sortOrder: number): MenuCategory => ({
  id,
  title: `Category ${id}`,
  slug: `category-${id}`,
  sortOrder,
  updatedAt: NOW,
  createdAt: NOW,
})

const item = (id: number, data: Partial<MenuItem> = {}): MenuItem => ({
  id,
  title: `Item ${id}`,
  slug: `item-${id}`,
  price: 10,
  isActive: true,
  inStock: true,
  updatedAt: NOW,
  createdAt: NOW,
  ...data,
})

const sectionIds = (sections: ReturnType<typeof buildMenuSections>) =>
  sections.map((section) => section.items.map((entry) => entry.id))

describe('menu data', () => {
  let payload: Payload
  let tenantA: Tenant
  let tenantB: Tenant

  beforeAll(async () => {
    payload = await getTestPayload()
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    tenantB = await findTenant(payload, TEST_TENANTS.b)
  })

  const createItem = (title: string) =>
    payload.create({
      collection: 'menu-items',
      data: { title, slug: uniqueName('item'), price: 4, tenant: tenantA.id },
      locale: 'en',
      depth: 0,
      context,
    })

  const createMenu = (data: { items?: number[]; isHidden?: boolean } = {}) =>
    payload.create({
      collection: 'menus',
      data: {
        title: uniqueName('Menu'),
        slug: uniqueName('menu'),
        tenant: tenantA.id,
        _status: 'published',
        ...data,
      },
      depth: 0,
      context,
    })

  describe('findMenuPage', () => {
    it('returns the menu for its own tenant', async () => {
      // act
      const menu = await findMenuPage(payload, tenantA.id, TEST_MENU.dinner, published)

      // assert
      expect(menu?.slug).toBe(TEST_MENU.dinner)
      expect(extractTenantId(menu?.tenant)).toBe(tenantA.id)
    })

    it("returns nothing for another tenant's slug", async () => {
      // arrange: drinks-b exists only in test-b
      expect(await findMenuPage(payload, tenantB.id, TEST_MENU.onlyInB, published)).not.toBeNull()

      // act
      const menu = await findMenuPage(payload, tenantA.id, TEST_MENU.onlyInB, published)

      // assert
      expect(menu).toBeNull()
    })

    it('returns nothing without a tenant', async () => {
      // act
      const menu = await findMenuPage(payload, null, TEST_MENU.dinner, published)

      // assert
      expect(menu).toBeNull()
    })

    it('returns nothing for a draft menu', async () => {
      // act
      const menu = await findMenuPage(payload, tenantA.id, TEST_MENU.draftMenu, published)

      // assert
      expect(menu).toBeNull()
    })

    it('returns the draft while previewing', async () => {
      // act
      const menu = await findMenuPage(payload, tenantA.id, TEST_MENU.draftMenu, {
        draft: true,
        locale: 'en',
      })

      // assert
      expect(menu?.slug).toBe(TEST_MENU.draftMenu)
    })

    it('serves a hidden menu to the public site', async () => {
      // arrange
      const hidden = await createMenu({ isHidden: true })

      // act
      const menu = await findMenuPage(payload, tenantA.id, hidden.slug ?? '', published)

      // assert
      expect(menu?.id).toBe(hidden.id)
    })
  })

  // rem0018 phase 1 step 1a
  describe('choice prices', () => {
    it('passes choice prices to the guest menu', async () => {
      // arrange: a test-a item on a published menu with a choice priced 1.5 and a free one
      const item = await payload.create({
        collection: 'menu-items',
        data: {
          title: uniqueName('Item with choices'),
          slug: uniqueName('item-choices'),
          price: 10,
          tenant: tenantA.id,
          modifierGroups: [
            {
              name: 'Size',
              inputType: 'radio',
              options: [{ label: 'Large', price: 1.5 }, { label: 'Small' }],
            },
          ],
        },
        locale: 'en',
        depth: 0,
        context,
      })
      const menu = await createMenu({ items: [item.id] })

      // act: load the menu page data for test-a
      const page = await findMenuPage(payload, tenantA.id, menu.slug ?? '', published)
      const sections = buildMenuSections(page?.items ?? [], [])

      // assert: the guest item's options are { label, price: 1.5 } and { label, price: null }
      const guestItem = sections
        .flatMap((section) => section.items)
        .find((entry) => entry.id === item.id)
      expect(guestItem?.modifierGroups[0]?.options).toEqual([
        { label: 'Large', price: 1.5 },
        { label: 'Small', price: null },
      ])
    })
  })

  describe('buildMenuSections', () => {
    it('groups items by category in sort order', () => {
      // arrange
      const second = category(1, 2)
      const first = category(2, 1)
      const items = [item(10, { category: second }), item(11, { category: first })]

      // act
      const sections = buildMenuSections(items, [second, first])

      // assert
      expect(sections.map((section) => section.category?.id)).toEqual([first.id, second.id])
    })

    it('keeps the menu order inside a category', () => {
      // arrange
      const one = category(1, 1)
      const items = [
        item(3, { category: one }),
        item(1, { category: one }),
        item(2, { category: one }),
      ]

      // act
      const sections = buildMenuSections(items, [one])

      // assert
      expect(sectionIds(sections)).toEqual([[3, 1, 2]])
    })

    it('puts uncategorized items last', () => {
      // arrange
      const one = category(1, 1)
      const items = [item(10, { category: null }), item(11, { category: one })]

      // act
      const sections = buildMenuSections(items, [one])

      // assert
      expect(sections.map((section) => section.category?.id ?? null)).toEqual([one.id, null])
      expect(sectionIds(sections)).toEqual([[11], [10]])
    })

    it('leaves out inactive items', () => {
      // arrange
      const one = category(1, 1)
      const two = category(2, 2)
      const items = [item(10, { category: one }), item(11, { category: two, isActive: false })]

      // act
      const sections = buildMenuSections(items, [one, two])

      // assert
      expect(sectionIds(sections)).toEqual([[10]])
    })

    it('keeps out of stock items', () => {
      // arrange
      const one = category(1, 1)
      const items = [item(10, { category: one, inStock: false })]

      // act
      const sections = buildMenuSections(items, [one])

      // assert
      expect(sections[0]?.items[0]).toMatchObject({ id: 10, inStock: false })
    })
  })

  describe('searchMenuItems', () => {
    it('finds only items on the menu', async () => {
      // arrange
      const word = uniqueName('Zest')
      const onMenu = await createItem(`${word} tart`)
      await createItem(`${word} cake`)
      const menu = await createMenu({ items: [onMenu.id] })

      // act
      const found = await searchMenuItems(payload, tenantA.id, menu.id, word, 'en')

      // assert
      expect(found.map((entry) => entry.id)).toEqual([onMenu.id])
    })

    it('matches arabic titles in arabic', async () => {
      // arrange
      const dinner = await findMenuPage(payload, tenantA.id, TEST_MENU.dinner, published)
      if (!dinner) throw new Error('tests: no dinner menu in test-a')

      // act
      const found = await searchMenuItems(payload, tenantA.id, dinner.id, 'الطماطم', 'ar')

      // assert
      expect(found.map((entry) => entry.slug)).toEqual([TEST_MENU.soup])
      expect(found[0]?.title).toBe('شوربة الطماطم')
    })

    it('returns nothing without a tenant', async () => {
      // arrange
      const dinner = await findMenuPage(payload, tenantA.id, TEST_MENU.dinner, published)
      if (!dinner) throw new Error('tests: no dinner menu in test-a')

      // act
      const found = await searchMenuItems(payload, null, dinner.id, 'soup', 'en')

      // assert
      expect(found).toEqual([])
    })
  })
})
