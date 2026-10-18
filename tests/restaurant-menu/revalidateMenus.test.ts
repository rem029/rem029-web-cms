// Menu cache revalidation (rem0017, `src/common/hooks/revalidateMenus.ts`): what guests see is
// revalidated per tenant, but a new draft menu revalidates nothing. Payload creates that draft
// while rendering the admin's create view (autosave), where Next refuses `revalidateTag` and the
// view rendered blank (found in the phase 3 step 4 walkthrough).
import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Tenant } from '@/payload-types'

import { getTestPayload } from '../common/payload'
import { TEST_TENANTS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'

// the outside edge: Next's cache, which needs a running Next request
const { revalidateTag } = vi.hoisted(() => ({ revalidateTag: vi.fn() }))
vi.mock('next/cache', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/cache')>()),
  revalidateTag,
  revalidatePath: vi.fn(),
}))

describe('revalidateMenus', () => {
  let payload: Payload
  let tenantA: Tenant

  beforeAll(async () => {
    payload = await getTestPayload()
    tenantA = await findTenant(payload, TEST_TENANTS.a)
  })

  beforeEach(() => {
    revalidateTag.mockClear()
  })

  it("doesn't revalidate for a new draft menu", async () => {
    // act
    await payload.create({
      collection: 'menus',
      data: { title: uniqueName('Draft menu'), tenant: tenantA.id },
      draft: true,
      depth: 0,
    })

    // assert
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it("revalidates the tenant's menus when a menu is published", async () => {
    // act
    await payload.create({
      collection: 'menus',
      data: { title: uniqueName('Published menu'), tenant: tenantA.id, _status: 'published' },
      depth: 0,
    })

    // assert
    expect(revalidateTag).toHaveBeenCalledWith(`menus_${tenantA.id}`)
  })

  it("revalidates the tenant's menus when a published menu is unpublished", async () => {
    // arrange
    const menu = await payload.create({
      collection: 'menus',
      data: { title: uniqueName('Unpublished menu'), tenant: tenantA.id, _status: 'published' },
      depth: 0,
    })
    revalidateTag.mockClear()

    // act
    await payload.update({
      collection: 'menus',
      id: menu.id,
      data: { _status: 'draft' },
      depth: 0,
    })

    // assert
    expect(revalidateTag).toHaveBeenCalledWith(`menus_${tenantA.id}`)
  })

  it("revalidates the tenant's menus when an item changes", async () => {
    // act
    await payload.create({
      collection: 'menu-items',
      data: { title: uniqueName('Item'), price: 5, tenant: tenantA.id },
      depth: 0,
    })

    // assert
    expect(revalidateTag).toHaveBeenCalledWith(`menus_${tenantA.id}`)
  })
})
