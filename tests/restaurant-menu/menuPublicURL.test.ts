// A menu's public address (rem0017 phase 3 step 5, getMenuPublicURL in
// `src/collections/Menus/utils/publicURL.ts`): shown on the menu's edit view once it is saved,
// on the menu's own business host, read with the user's access.
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { getMenuPublicURL } from '@/collections/Menus/utils/publicURL'
import type { Tenant } from '@/payload-types'
import { getTenantURL } from '@/utilities/getURL'

import { getTestPayload } from '../common/payload'
import { TEST_MENU, TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { loadUser, type SessionUser } from '../common/users'

describe('menu public URL', () => {
  let payload: Payload
  let tenantA: Tenant
  let tenantB: Tenant
  let member: SessionUser

  beforeAll(async () => {
    payload = await getTestPayload()
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    tenantB = await findTenant(payload, TEST_TENANTS.b)
    member = await loadUser(payload, TEST_USERS.member)
  })

  const findMenu = async (slug: string, tenantId: number) => {
    const { docs } = await payload.find({
      collection: 'menus',
      where: {
        and: [{ slug: { equals: slug } }, { tenant: { equals: tenantId } }],
      },
      draft: true,
      overrideAccess: true,
      limit: 1,
    })
    const menu = docs[0]
    if (!menu) throw new Error(`tests: no menu ${slug} in tenant ${tenantId}`)
    return menu
  }

  it("returns the address on the menu's business host", async () => {
    // arrange: test-a's published menu TEST_MENU.dinner, the member of test-a
    const menu = await findMenu(TEST_MENU.dinner, tenantA.id)

    // act: getMenuPublicURL(payload, member, { id })
    const result = await getMenuPublicURL(payload, member, { id: menu.id })

    // assert: ok, url = getTenantURL(test-a) + '/menu/dinner'
    expect(result).toEqual({
      ok: true,
      url: `${getTenantURL(tenantA)}/menu/${TEST_MENU.dinner}`,
    })
  })

  it('uses the slug of a menu saved only as a draft', async () => {
    // arrange: test-a's draft menu TEST_MENU.draftMenu, the member of test-a
    const menu = await findMenu(TEST_MENU.draftMenu, tenantA.id)

    // act: getMenuPublicURL(payload, member, { id })
    const result = await getMenuPublicURL(payload, member, { id: menu.id })

    // assert: ok, url ends with '/menu/brunch-draft'
    expect(result).toEqual({
      ok: true,
      url: `${getTenantURL(tenantA)}/menu/${TEST_MENU.draftMenu}`,
    })
  })

  it('refuses a menu of another business', async () => {
    // arrange: test-b's menu TEST_MENU.onlyInB, the member of test-a (no row in test-b)
    const menu = await findMenu(TEST_MENU.onlyInB, tenantB.id)

    // act: getMenuPublicURL(payload, member, { id })
    const result = await getMenuPublicURL(payload, member, { id: menu.id })

    // assert: ok false, with a plain-words error
    expect(result).toEqual({ ok: false, error: "This menu can't be found. Reload the page." })
  })
})
