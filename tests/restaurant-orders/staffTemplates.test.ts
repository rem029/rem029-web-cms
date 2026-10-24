// Staff templates (rem0018 phase 1 step 2): the platform `waiter`, `kitchen` and `cashier`
// profiles (isTemplate, admin tenant, made by the migration), assignable on any business's row
// and read-only for tenant admins.
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import {
  CASHIER_TEMPLATE,
  KITCHEN_TEMPLATE,
  WAITER_TEMPLATE,
} from '@/collections/UsersAccess/utils/templates'
import { hasPermission } from '@/common/utils/access'
import { DEFAULT_TENANT_SLUG } from '@/common/utils/defaultTenant'
import type { Tenant, UsersAccess } from '@/payload-types'

import { findProfile } from '../common/access'
import { getTestPayload } from '../common/payload'
import { TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { loadUser, type SessionUser } from '../common/users'

describe('staff templates', () => {
  let payload: Payload
  let superUser: SessionUser
  let owner: SessionUser
  let tenantB: Tenant
  let adminTenant: Tenant
  let waiterTemplate: UsersAccess
  let kitchenTemplate: UsersAccess
  let cashierTemplate: UsersAccess

  beforeAll(async () => {
    payload = await getTestPayload()
    superUser = await loadUser(payload, TEST_USERS.superUser)
    owner = await loadUser(payload, TEST_USERS.owner)
    tenantB = await findTenant(payload, TEST_TENANTS.b)
    adminTenant = await findTenant(payload, DEFAULT_TENANT_SLUG)
    waiterTemplate = await findProfile(payload, WAITER_TEMPLATE, adminTenant.id)
    kitchenTemplate = await findProfile(payload, KITCHEN_TEMPLATE, adminTenant.id)
    cashierTemplate = await findProfile(payload, CASHIER_TEMPLATE, adminTenant.id)
  })

  it('offers the waiter, kitchen and cashier templates in any business', async () => {
    // arrange: the owner (tenant admin of test-a and test-b), a new user in test-b
    const email = `${uniqueName('staff')}@example.test`
    const user = await payload.create({
      collection: 'users',
      data: {
        email,
        name: email,
        password: email,
        tenants: [{ tenant: tenantB.id }],
      },
      user: superUser,
    })

    // act: as the owner, set that user's test-b row to each of the three templates
    //      (overrideAccess: false)
    const updatedWaiter = await payload.update({
      collection: 'users',
      id: user.id,
      data: {
        tenants: [{ tenant: tenantB.id, access: waiterTemplate.id }],
      },
      user: owner,
      overrideAccess: false,
      depth: 0,
    })

    const updatedKitchen = await payload.update({
      collection: 'users',
      id: user.id,
      data: {
        tenants: [{ tenant: tenantB.id, access: kitchenTemplate.id }],
      },
      user: owner,
      overrideAccess: false,
      depth: 0,
    })

    const updatedCashier = await payload.update({
      collection: 'users',
      id: user.id,
      data: {
        tenants: [{ tenant: tenantB.id, access: cashierTemplate.id }],
      },
      user: owner,
      overrideAccess: false,
      depth: 0,
    })

    // assert: each save succeeds and the row's access is that template's id
    expect(updatedWaiter.tenants?.[0]?.access).toBe(waiterTemplate.id)
    expect(updatedKitchen.tenants?.[0]?.access).toBe(kitchenTemplate.id)
    expect(updatedCashier.tenants?.[0]?.access).toBe(cashierTemplate.id)
  })

  it('keeps the templates read-only for tenant admins', async () => {
    // arrange: the owner, the `waiter` template
    // act: update its name as the owner (overrideAccess: false)
    const call = payload.update({
      collection: 'users-access',
      id: waiterTemplate.id,
      data: { name: 'Attempted Renamed Template' },
      user: owner,
      overrideAccess: false,
    })

    // assert: rejects with 403; the template is unchanged
    await expect(call).rejects.toMatchObject({ status: 403 })
    const reloaded = await payload.findByID({
      collection: 'users-access',
      id: waiterTemplate.id,
      depth: 0,
    })
    expect(reloaded.name).toBe(waiterTemplate.name)
  })

  it('gives each template its board and menus read', async () => {
    // arrange: the three templates
    // act: read their access rows
    // assert: waiter → order-waiter read, kitchen → order-kitchen read, cashier → order-cashier
    //         read; each: menus read, users admin, every other board unticked
    expect(hasPermission(waiterTemplate, 'order-waiter', 'read')).toBe(true)
    expect(hasPermission(waiterTemplate, 'order-kitchen', 'read')).toBe(false)
    expect(hasPermission(waiterTemplate, 'order-cashier', 'read')).toBe(false)
    expect(hasPermission(waiterTemplate, 'menus', 'read')).toBe(true)
    expect(hasPermission(waiterTemplate, 'users', 'admin')).toBe(true)

    expect(hasPermission(kitchenTemplate, 'order-kitchen', 'read')).toBe(true)
    expect(hasPermission(kitchenTemplate, 'order-waiter', 'read')).toBe(false)
    expect(hasPermission(kitchenTemplate, 'order-cashier', 'read')).toBe(false)
    expect(hasPermission(kitchenTemplate, 'menus', 'read')).toBe(true)
    expect(hasPermission(kitchenTemplate, 'users', 'admin')).toBe(true)

    expect(hasPermission(cashierTemplate, 'order-cashier', 'read')).toBe(true)
    expect(hasPermission(cashierTemplate, 'order-waiter', 'read')).toBe(false)
    expect(hasPermission(cashierTemplate, 'order-kitchen', 'read')).toBe(false)
    expect(hasPermission(cashierTemplate, 'menus', 'read')).toBe(true)
    expect(hasPermission(cashierTemplate, 'users', 'admin')).toBe(true)
  })
})
