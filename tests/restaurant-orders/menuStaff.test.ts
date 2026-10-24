// A menu's staff (rem0018 phase 1 step 2, `ordering.staff`): only members of the menu's business,
// also on drafts; the list counts once the menu is published.
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { staffMenuIds } from '@/common/utils/staffRoles'
import type { Menu, Tenant } from '@/payload-types'

import { rejectionText } from '../common/errors'
import { getTestPayload } from '../common/payload'
import { TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { loadUser, reqFor, type SessionUser } from '../common/users'

const context = { disableRevalidate: true }

describe('menu staff', () => {
  let payload: Payload
  let tenantA: Tenant
  let member: SessionUser
  let waiter: SessionUser
  let otherWaiter: SessionUser

  const createMenu = (tenant: Tenant, user: SessionUser): Promise<Menu> =>
    payload.create({
      collection: 'menus',
      data: { title: uniqueName('Menu'), tenant: tenant.id, _status: 'published' },
      draft: false,
      user,
      overrideAccess: false,
      context,
    })

  beforeAll(async () => {
    payload = await getTestPayload()
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    member = await loadUser(payload, TEST_USERS.member)
    waiter = await loadUser(payload, TEST_USERS.waiter)
    otherWaiter = await loadUser(payload, TEST_USERS.otherWaiter)
  })

  it('refuses a user who is not a member of the tenant', async () => {
    // arrange: a new published test-a menu; otherWaiter (waiter in test-b only)
    const menu = await createMenu(tenantA, member)

    // act: save a draft listing otherWaiter as staff, as the member (overrideAccess: false)
    const call = payload.update({
      collection: 'menus',
      id: menu.id,
      data: {
        ordering: {
          enabled: true,
          staff: [otherWaiter.id],
        },
      },
      draft: true,
      user: member,
      overrideAccess: false,
      context,
    })

    // assert: rejects with a ValidationError on ordering.staff naming the user
    await expect(call).rejects.toMatchObject({ status: 400 })
    const text = await rejectionText(call)
    expect(text).toMatch(new RegExp(`${otherWaiter.name}|${otherWaiter.email}`))
  })

  it('applies staff changes once the menu is published', async () => {
    // arrange: a new published test-a menu without staff; the waiter of test-a
    const menu = await createMenu(tenantA, member)

    // act: save a draft listing the waiter; then publish it
    await payload.update({
      collection: 'menus',
      id: menu.id,
      data: {
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

    // assert: after the draft, staffMenuIds(waiter, test-a) lacks the menu; after publishing it
    //         has it
    const reqAfterDraft = await reqFor(payload, waiter)
    const menusAfterDraft = await staffMenuIds(reqAfterDraft, tenantA.id)
    expect(menusAfterDraft).not.toContain(menu.id)

    await payload.update({
      collection: 'menus',
      id: menu.id,
      data: {
        _status: 'published',
      },
      draft: false,
      user: member,
      overrideAccess: false,
      context,
    })

    const reqAfterPublish = await reqFor(payload, waiter)
    const menusAfterPublish = await staffMenuIds(reqAfterPublish, tenantA.id)
    expect(menusAfterPublish).toContain(menu.id)
  })
})
