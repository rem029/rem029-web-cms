// Menu items (rem0017 phase 1 step 1): price, category, slug per tenant, options (modifier
// groups), defaults, the same-tenant check on relationships, and who sees inactive items.
// Created as the editor of test-a with overrideAccess: false; TEST_MENU fixtures for lookups.
import type { Payload, Where } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { extractTenantId } from '@/common/utils/tenantCollections'
import type { MenuItem, Tenant } from '@/payload-types'

import { rejectionText } from '../common/errors'
import { getTestPayload } from '../common/payload'
import { TEST_MENU, TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { loadUser, type SessionUser } from '../common/users'

type ItemData = Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt' | 'tenant' | 'title' | 'price'> & {
  title?: string
  price?: number
}

describe('menu items', () => {
  let payload: Payload
  let tenantA: Tenant
  let tenantB: Tenant
  let member: SessionUser
  let otherTenant: SessionUser
  let superUser: SessionUser

  const inTenant = (tenant: Tenant, where: Where): Where => ({
    and: [{ tenant: { equals: tenant.id } }, where],
  })

  const findId = async (
    collection: 'menu-categories' | 'menu-allergens',
    tenant: Tenant,
    where: Where,
  ): Promise<number> => {
    const { docs } = await payload.find({
      collection,
      where: inTenant(tenant, where),
      locale: 'en',
      limit: 1,
      depth: 0,
    })
    if (!docs[0]) throw new Error(`tests: no ${collection} in ${tenant.slug}`)
    return docs[0].id
  }

  const createItem = (user: SessionUser, tenant: Tenant, data: ItemData = {}) =>
    payload.create({
      collection: 'menu-items',
      data: { title: uniqueName('Item'), price: 10, ...data, tenant: tenant.id },
      user,
      overrideAccess: false,
      depth: 0,
    })

  beforeAll(async () => {
    payload = await getTestPayload()
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    tenantB = await findTenant(payload, TEST_TENANTS.b)
    member = await loadUser(payload, TEST_USERS.member)
    otherTenant = await loadUser(payload, TEST_USERS.otherTenant)
    superUser = await loadUser(payload, TEST_USERS.superUser)
  })

  describe('create', () => {
    it('creates an item with price and category', async () => {
      // arrange
      const starters = await findId('menu-categories', tenantA, {
        slug: { equals: TEST_MENU.starters },
      })

      // act
      const item = await createItem(member, tenantA, { price: 12.5, category: starters })

      // assert
      expect(item.price).toBe(12.5)
      expect(extractTenantId(item.category)).toBe(starters)
    })

    it('fills the slug from the title', async () => {
      // arrange
      const title = uniqueName('Iced Tea')

      // act
      const item = await createItem(member, tenantA, { title })

      // assert
      expect(item.slug).toBe(title.replace(/ /g, '-').toLowerCase())
    })

    it('defaults to in stock, shown, all day', async () => {
      // act
      const item = await createItem(member, tenantA)

      // assert
      expect(item).toMatchObject({ inStock: true, isActive: true, availability: ['all_day'] })
    })

    it('saves modifier groups with options', async () => {
      // arrange
      const modifierGroups = [
        {
          name: 'Size',
          inputType: 'radio' as const,
          required: true,
          options: [{ label: 'Small' }, { label: 'Large' }],
        },
      ]

      // act
      const item = await createItem(member, tenantA, { modifierGroups })

      // assert
      expect(item.modifierGroups).toMatchObject(modifierGroups)
    })
  })

  describe('validation', () => {
    it('refuses a duplicate slug in one tenant', async () => {
      // arrange
      const slug = uniqueName('dup-item')
      await createItem(member, tenantA, { slug })

      // act
      const message = await rejectionText(createItem(member, tenantA, { slug }))

      // assert
      expect(message).toContain('already exists in this business')
    })

    it('allows the same slug in another tenant', async () => {
      // arrange
      const slug = uniqueName('shared-item')
      await createItem(member, tenantA, { slug })

      // act
      const inB = await createItem(otherTenant, tenantB, { slug })

      // assert
      expect(inB.slug).toBe(slug)
    })

    it('refuses a negative price', async () => {
      // act
      const message = await rejectionText(createItem(member, tenantA, { price: -1 }))

      // assert
      expect(message).toMatch(/price/i)
    })

    it('refuses a category from another tenant', async () => {
      // arrange
      const startersOfB = await findId('menu-categories', tenantB, {
        slug: { equals: TEST_MENU.starters },
      })

      // act
      const message = await rejectionText(createItem(superUser, tenantA, { category: startersOfB }))

      // assert
      expect(message).toContain('belongs to another business')
    })

    it('refuses an allergen from another tenant', async () => {
      // arrange
      const glutenOfB = await findId('menu-allergens', tenantB, {
        title: { equals: TEST_MENU.gluten },
      })

      // act
      const message = await rejectionText(
        createItem(superUser, tenantA, { allergens: [glutenOfB] }),
      )

      // assert
      expect(message).toContain('belongs to another business')
    })

    it('refuses a modifier group without options', async () => {
      // act
      const message = await rejectionText(
        createItem(member, tenantA, {
          modifierGroups: [{ name: 'Milk', inputType: 'checkbox', options: [] }],
        }),
      )

      // assert
      expect(message).toMatch(/choices|options/i)
    })
  })

  describe('inactive items', () => {
    const readSlugs = async (user: SessionUser | null): Promise<string[]> => {
      const { docs } = await payload.find({
        collection: 'menu-items',
        where: { tenant: { equals: tenantA.id } },
        ...(user ? { user } : {}),
        overrideAccess: false,
        depth: 0,
        pagination: false,
      })
      return docs.map((doc) => doc.slug ?? '')
    }

    it('hides inactive items from anonymous readers', async () => {
      // act
      const slugs = await readSlugs(null)

      // assert
      expect(slugs).toContain(TEST_MENU.soup)
      expect(slugs).not.toContain(TEST_MENU.inactiveItem)
    })

    it('shows inactive items to editors', async () => {
      // act
      const slugs = await readSlugs(member)

      // assert
      expect(slugs).toContain(TEST_MENU.inactiveItem)
    })
  })
})
