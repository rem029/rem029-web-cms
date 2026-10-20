// The menu's Ordering tab (rem0018 phase 1 step 1b, src/collections/Menus/fields/ordering.ts):
// off by default, so menus stay browse-only; the flow defaults to waiter, kitchen and cashier.
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import type { Tenant } from '@/payload-types'

import { getTestPayload } from '../common/payload'
import { TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { loadUser, type SessionUser } from '../common/users'

const context = { disableRevalidate: true }

describe('menu ordering', () => {
  let payload: Payload
  let tenantA: Tenant
  let member: SessionUser

  beforeAll(async () => {
    payload = await getTestPayload()
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    member = await loadUser(payload, TEST_USERS.member)
  })

  it('defaults to browse-only with ordering off', async () => {
    // arrange: —
    // act: create a test-a menu as the member without ordering
    const menu = await payload.create({
      collection: 'menus',
      data: {
        title: uniqueName('Menu Browse'),
        tenant: tenantA.id,
        _status: 'published',
      },
      draft: false,
      user: member,
      overrideAccess: false,
      context,
    })

    // assert: ordering.enabled is false
    expect(menu.ordering?.enabled).toBe(false)
  })

  it('defaults the flow to waiter, kitchen and cashier', async () => {
    // arrange: —
    // act: create a menu with ordering { enabled: true }
    const menu = await payload.create({
      collection: 'menus',
      data: {
        title: uniqueName('Menu Ordering'),
        tenant: tenantA.id,
        _status: 'published',
        ordering: { enabled: true },
      },
      draft: false,
      user: member,
      overrideAccess: false,
      context,
    })

    // assert: ordering.flow is 'waiter_kitchen_cashier', ordering.showPrices is true
    expect(menu.ordering?.flow).toBe('waiter_kitchen_cashier')
    expect(menu.ordering?.showPrices).toBe(true)
  })

  it('keeps ordering settings on a draft until published', async () => {
    // arrange: a published menu with ordering off
    const menu = await payload.create({
      collection: 'menus',
      data: {
        title: uniqueName('Menu Draft Test'),
        tenant: tenantA.id,
        _status: 'published',
        ordering: { enabled: false },
      },
      draft: false,
      user: member,
      overrideAccess: false,
      context,
    })

    // act: save a draft with ordering on
    await payload.update({
      collection: 'menus',
      id: menu.id,
      data: {
        ordering: { enabled: true },
      },
      draft: true,
      user: member,
      overrideAccess: false,
      context,
    })

    // assert: the published version still has ordering off; the draft has it on
    const published = await payload.findByID({
      collection: 'menus',
      id: menu.id,
      draft: false,
      user: member,
      overrideAccess: false,
    })
    const draft = await payload.findByID({
      collection: 'menus',
      id: menu.id,
      draft: true,
      user: member,
      overrideAccess: false,
    })
    expect(published.ordering?.enabled).toBe(false)
    expect(draft.ordering?.enabled).toBe(true)
  })
})
