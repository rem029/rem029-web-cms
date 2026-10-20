// The menu builder's server functions (rem0017 phase 2 step 2, `src/collections/Menus/utils/
// builder.ts`): what the Items tab lists and saves. Each takes (payload, user, args) and runs with
// overrideAccess: false for that user, in the menu's tenant (`tenantId`, from the menu form, so it
// works before the first save). Seeded users, TEST_MENU.
import type { Payload, Where } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import {
  getItemForm,
  listBuilderItems,
  listItemsOfCategory,
  quickUpdateItem,
  reorderCategories,
  saveCategory,
  saveItem,
  uploadItemImage,
} from '@/collections/Menus/utils/builder'
import { extractTenantId } from '@/common/utils/tenantCollections'
import type { Tenant } from '@/payload-types'

import { getTestPayload } from '../common/payload'
import { TEST_MENU, TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { loadUser, type SessionUser } from '../common/users'

// outside Next.js: skip the menus cache revalidation
const context = { disableRevalidate: true }

describe('menu builder', () => {
  let payload: Payload
  let tenantA: Tenant
  let tenantB: Tenant
  let editor: SessionUser
  let multiTenant: SessionUser
  let viewer: SessionUser
  let disabled: SessionUser

  const inTenant = (tenant: Tenant, where: Where): Where => ({
    and: [{ tenant: { equals: tenant.id } }, where],
  })

  const findItem = async (tenant: Tenant, slug: string) => {
    const { docs } = await payload.find({
      collection: 'menu-items',
      where: inTenant(tenant, { slug: { equals: slug } }),
      locale: 'en',
      depth: 1,
      limit: 1,
    })
    if (!docs[0]) throw new Error(`tests: no item ${slug} in ${tenant.slug}`)
    return docs[0]
  }

  const findCategoryId = async (tenant: Tenant, slug: string): Promise<number> => {
    const { docs } = await payload.find({
      collection: 'menu-categories',
      where: inTenant(tenant, { slug: { equals: slug } }),
      depth: 0,
      limit: 1,
    })
    if (!docs[0]) throw new Error(`tests: no category ${slug} in ${tenant.slug}`)
    return docs[0].id
  }

  const createItem = (tenant: Tenant, data: { title?: string; price?: number } = {}) =>
    payload.create({
      collection: 'menu-items',
      data: { title: uniqueName('Builder item'), price: 10, ...data, tenant: tenant.id },
      locale: 'en',
      depth: 0,
      context,
    })

  const createCategory = (tenant: Tenant, sortOrder: number) =>
    payload.create({
      collection: 'menu-categories',
      data: { title: uniqueName('Builder category'), sortOrder, tenant: tenant.id },
      locale: 'en',
      depth: 0,
      context,
    })

  beforeAll(async () => {
    payload = await getTestPayload()
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    tenantB = await findTenant(payload, TEST_TENANTS.b)
    editor = await loadUser(payload, TEST_USERS.member)
    multiTenant = await loadUser(payload, TEST_USERS.multiTenant)
    viewer = await loadUser(payload, TEST_USERS.viewer)
    disabled = await loadUser(payload, TEST_USERS.disabled)
  })

  describe('listing', () => {
    it('lists the tenant items with category and price', async () => {
      // arrange
      const soup = await findItem(tenantA, TEST_MENU.soup)
      const category = typeof soup.category === 'object' ? soup.category : null

      // act
      const result = await listBuilderItems(payload, editor, {
        tenantId: tenantA.id,
        locale: 'en',
      })

      // assert
      expect(result.ok).toBe(true)
      const rows = result.ok ? result.items : []
      expect(rows.find((row) => row.id === soup.id)).toMatchObject({
        title: soup.title,
        price: soup.price,
        categoryId: category?.id,
        categoryTitle: category?.title,
      })
    })

    it('leaves out items of other tenants', async () => {
      // arrange
      const { docs: itemsOfB } = await payload.find({
        collection: 'menu-items',
        where: { tenant: { equals: tenantB.id } },
        depth: 0,
        pagination: false,
      })

      // act
      const result = await listBuilderItems(payload, multiTenant, { tenantId: tenantA.id })

      // assert
      const ids = result.ok ? result.items.map((row) => row.id) : []
      expect(ids.length).toBeGreaterThan(0)
      expect(ids.filter((id) => itemsOfB.some((doc) => doc.id === id))).toEqual([])
    })

    it('filters items by category', async () => {
      // arrange
      const starters = await findCategoryId(tenantA, TEST_MENU.starters)

      // act
      const result = await listBuilderItems(payload, editor, {
        tenantId: tenantA.id,
        categoryId: starters,
      })

      // assert
      const rows = result.ok ? result.items : []
      expect(rows.length).toBeGreaterThan(0)
      expect(rows.every((row) => row.categoryId === starters)).toBe(true)
    })

    it('searches items by title', async () => {
      // act
      const result = await listBuilderItems(payload, editor, {
        tenantId: tenantA.id,
        locale: 'en',
        search: 'tomato',
      })

      // assert
      const slugs = result.ok ? result.items.map((row) => row.slug) : []
      expect(slugs).toContain(TEST_MENU.soup)
      expect(slugs).not.toContain(TEST_MENU.steak)
    })

    it('lists every active item of a category', async () => {
      // arrange
      const category = await createCategory(tenantA, 50)
      const active = await createItem(tenantA)
      const inactive = await createItem(tenantA)
      await payload.update({
        collection: 'menu-items',
        id: active.id,
        data: { category: category.id },
        context,
      })
      await payload.update({
        collection: 'menu-items',
        id: inactive.id,
        data: { category: category.id, isActive: false },
        context,
      })

      // act
      const result = await listItemsOfCategory(payload, editor, {
        tenantId: tenantA.id,
        categoryId: category.id,
      })

      // assert
      expect(result).toEqual({ ok: true, itemIds: [active.id] })
    })

    it('loads an item of the menu tenant', async () => {
      // arrange
      const soup = await findItem(tenantA, TEST_MENU.soup)

      // act
      const result = await getItemForm(payload, editor, {
        tenantId: tenantA.id,
        locale: 'en',
        itemId: soup.id,
      })

      // assert
      expect(result.ok).toBe(true)
      expect(result.ok && result.data).toMatchObject({ title: soup.title, price: soup.price })
    })
  })

  describe('saving', () => {
    it('updates price and stock of an item', async () => {
      // arrange
      const item = await createItem(tenantA)

      // act
      const result = await quickUpdateItem(
        payload,
        editor,
        {
          tenantId: tenantA.id,
          itemId: item.id,
          data: { price: 9, inStock: false },
        },
        { context },
      )

      // assert
      expect(result.ok).toBe(true)
      const saved = await payload.findByID({ collection: 'menu-items', id: item.id, depth: 0 })
      expect(saved).toMatchObject({ price: 9, inStock: false })
    })

    // rem0018 phase 1 step 1a
    it('saves and loads the extra price of a choice', async () => {
      // arrange: saveItem with a Milk group: Oat price 1, Full fat price null
      const modifierGroups = [
        {
          name: 'Milk',
          inputType: 'radio' as const,
          required: false,
          options: [
            { label: 'Full fat', price: null },
            { label: 'Oat', price: 1 },
          ],
        },
      ]
      const saved = await saveItem(
        payload,
        editor,
        {
          tenantId: tenantA.id,
          locale: 'en',
          data: {
            title: uniqueName('Coffee'),
            price: 5,
            category: null,
            description: '',
            image: null,
            allergens: [],
            tags: [],
            availability: ['all_day'],
            inStock: true,
            isActive: true,
            modifierGroups,
          },
        },
        { context },
      )
      expect(saved.ok).toBe(true)

      // act: getItemForm for the saved item
      const form = await getItemForm(payload, editor, {
        tenantId: tenantA.id,
        locale: 'en',
        itemId: saved.ok ? saved.item.id : -1,
      })

      // assert: the form's options are [{ label: 'Full fat', price: null }, { label: 'Oat', price: 1 }]
      expect(form.ok && form.data.modifierGroups[0]?.options).toEqual([
        { label: 'Full fat', price: null },
        { label: 'Oat', price: 1 },
      ])
    })

    it('creates an item in the menu tenant', async () => {
      // act
      const result = await saveItem(
        payload,
        editor,
        {
          tenantId: tenantA.id,
          locale: 'en',
          data: {
            title: uniqueName('New from builder'),
            price: 7,
            category: null,
            description: '',
            image: null,
            allergens: [],
            tags: [],
            availability: ['all_day'],
            inStock: true,
            isActive: true,
            modifierGroups: [],
          },
        },
        { context },
      )

      // assert
      expect(result.ok).toBe(true)
      const id = result.ok ? result.item.id : 0
      const saved = await payload.findByID({ collection: 'menu-items', id, depth: 0 })
      expect(extractTenantId(saved.tenant)).toBe(tenantA.id)
    })

    it('creates a category in the menu tenant', async () => {
      // act
      const result = await saveCategory(
        payload,
        editor,
        {
          tenantId: tenantA.id,
          locale: 'en',
          data: { title: uniqueName('New category') },
        },
        { context },
      )

      // assert
      expect(result.ok).toBe(true)
      const id = result.ok ? result.category.id : 0
      const saved = await payload.findByID({ collection: 'menu-categories', id, depth: 0 })
      expect(extractTenantId(saved.tenant)).toBe(tenantA.id)
    })

    it('reorders categories', async () => {
      // arrange
      const a = await createCategory(tenantA, 60)
      const b = await createCategory(tenantA, 61)
      const c = await createCategory(tenantA, 62)

      // act
      const result = await reorderCategories(
        payload,
        editor,
        {
          tenantId: tenantA.id,
          ids: [c.id, a.id, b.id],
        },
        { context },
      )

      // assert
      expect(result.ok).toBe(true)
      const { docs } = await payload.find({
        collection: 'menu-categories',
        where: { id: { in: [a.id, b.id, c.id] } },
        sort: 'sortOrder',
        depth: 0,
      })
      expect(docs.map((doc) => doc.id)).toEqual([c.id, a.id, b.id])
    })
  })

  describe('refusals', () => {
    it('refuses an item of another tenant', async () => {
      // arrange
      const steakOfB = await findItem(tenantB, TEST_MENU.steak)

      // act
      const result = await quickUpdateItem(
        payload,
        multiTenant,
        {
          tenantId: tenantA.id,
          itemId: steakOfB.id,
          data: { price: 1 },
        },
        { context },
      )

      // assert
      expect(result).toMatchObject({ ok: false, error: expect.stringContaining('this business') })
      const saved = await payload.findByID({ collection: 'menu-items', id: steakOfB.id })
      expect(saved.price).toBe(steakOfB.price)
    })

    it('refuses a viewer without update on items', async () => {
      // arrange
      const item = await createItem(tenantA)

      // act
      const result = await quickUpdateItem(
        payload,
        viewer,
        {
          tenantId: tenantA.id,
          itemId: item.id,
          data: { inStock: false },
        },
        { context },
      )

      // assert
      expect(result).toMatchObject({ ok: false, error: expect.stringContaining('permission') })
    })

    it('refuses a disabled user', async () => {
      // act
      const result = await listBuilderItems(payload, disabled, { tenantId: tenantA.id })

      // assert
      expect(result.ok).toBe(false)
    })

    it('refuses a file that is not an image', async () => {
      // act
      const result = await uploadItemImage(
        payload,
        editor,
        {
          tenantId: tenantA.id,
          file: {
            data: Buffer.from('not an image'),
            name: 'notes.txt',
            mimetype: 'text/plain',
            size: 12,
          },
        },
        { context },
      )

      // assert
      expect(result).toMatchObject({ ok: false, error: expect.stringContaining('image') })
    })
  })
})
