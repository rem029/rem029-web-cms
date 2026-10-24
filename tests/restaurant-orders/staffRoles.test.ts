// Staff roles and menus (rem0018 phase 1 step 2, src/common/utils/staffRoles.ts): roles from the
// board rows of the user's profile in that tenant, menus from the published staff lists.
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { staffMenuIds, staffRolesFor } from '@/common/utils/staffRoles'
import type { Tenant } from '@/payload-types'

import { getTestPayload } from '../common/payload'
import { TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { loadUser, reqFor, type SessionUser } from '../common/users'

const context = { disableRevalidate: true }

describe('staffRolesFor', () => {
  let payload: Payload
  let tenantA: Tenant
  let tenantB: Tenant
  let waiter: SessionUser
  let kitchen: SessionUser
  let cashier: SessionUser
  let tenantAdmin: SessionUser
  let superUser: SessionUser

  beforeAll(async () => {
    payload = await getTestPayload()
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    tenantB = await findTenant(payload, TEST_TENANTS.b)
    waiter = await loadUser(payload, TEST_USERS.waiter)
    kitchen = await loadUser(payload, TEST_USERS.kitchen)
    cashier = await loadUser(payload, TEST_USERS.cashier)
    tenantAdmin = await loadUser(payload, TEST_USERS.tenantAdmin)
    superUser = await loadUser(payload, TEST_USERS.superUser)
  })

  it("returns the boards of the user's profile", async () => {
    // arrange: the waiter, kitchen and cashier users of test-a
    // act: staffRolesFor(each, test-a)
    // assert: ['waiter'], ['kitchen'], ['cashier']
    expect(staffRolesFor(waiter, tenantA.id)).toEqual(['waiter'])
    expect(staffRolesFor(kitchen, tenantA.id)).toEqual(['kitchen'])
    expect(staffRolesFor(cashier, tenantA.id)).toEqual(['cashier'])
  })

  it('returns no role in another tenant', async () => {
    // arrange: the waiter of test-a
    // act: staffRolesFor(waiter, test-b)
    // assert: []
    expect(staffRolesFor(waiter, tenantB.id)).toEqual([])
  })

  it('returns every role for tenant admins', async () => {
    // arrange: the tenant admin of test-a, the super user
    // act: staffRolesFor(each, test-a)
    // assert: waiter, kitchen and cashier for both
    expect(staffRolesFor(tenantAdmin, tenantA.id)).toEqual(['waiter', 'kitchen', 'cashier'])
    expect(staffRolesFor(superUser, tenantA.id)).toEqual(['waiter', 'kitchen', 'cashier'])
  })
})

describe('staffMenuIds', () => {
  let payload: Payload
  let tenantA: Tenant
  let waiter: SessionUser
  let member: SessionUser
  let tenantAdmin: SessionUser

  beforeAll(async () => {
    payload = await getTestPayload()
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    waiter = await loadUser(payload, TEST_USERS.waiter)
    member = await loadUser(payload, TEST_USERS.member)
    tenantAdmin = await loadUser(payload, TEST_USERS.tenantAdmin)
  })

  it('lists only published menus that name the user', async () => {
    // arrange: in test-a, a published menu listing the waiter, a published menu without them,
    //          and a never-published draft listing them
    const menuWithWaiter = await payload.create({
      collection: 'menus',
      data: {
        title: uniqueName('Menu Waiter'),
        tenant: tenantA.id,
        _status: 'published',
        ordering: {
          enabled: true,
          staff: [waiter.id],
        },
      },
      draft: false,
      user: member,
      overrideAccess: false,
      context,
    })

    const menuWithoutStaff = await payload.create({
      collection: 'menus',
      data: {
        title: uniqueName('Menu Without Staff'),
        tenant: tenantA.id,
        _status: 'published',
        ordering: {
          enabled: true,
          staff: [],
        },
      },
      draft: false,
      user: member,
      overrideAccess: false,
      context,
    })

    const draftWithWaiter = await payload.create({
      collection: 'menus',
      data: {
        title: uniqueName('Menu Draft With Waiter'),
        tenant: tenantA.id,
        ordering: {
          enabled: true,
          staff: [waiter.id],
        },
      },
      draft: true,
      user: member,
      overrideAccess: false,
      context,
    })

    // act: staffMenuIds(reqFor(waiter), test-a); and for the tenant admin
    const waiterReq = await reqFor(payload, waiter)
    const adminReq = await reqFor(payload, tenantAdmin)
    const waiterMenus = await staffMenuIds(waiterReq, tenantA.id)
    const adminMenus = await staffMenuIds(adminReq, tenantA.id)

    // assert: waiter → only the first menu's id; tenant admin → null (every menu)
    // (other tests' menus may list the seeded waiter too, so check these three by id)
    expect(waiterMenus).toContain(menuWithWaiter.id)
    expect(waiterMenus).not.toContain(menuWithoutStaff.id)
    expect(waiterMenus).not.toContain(draftWithWaiter.id)
    expect(adminMenus).toBeNull()
  })
})
