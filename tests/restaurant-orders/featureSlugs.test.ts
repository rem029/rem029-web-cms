// Feature slugs (rem0018 phase 1 step 2, src/common/utils/featureSlugs.ts): the staff board rows
// of an access profile, read through hasAccess / rowAllows like any slug.
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { getAccessSlugs } from '@/collections/UsersAccess/utils/accessSlugs'
import { FEATURE_SLUG_VALUES } from '@/common/utils/featureSlugs'
import { staffRolesFor } from '@/common/utils/staffRoles'
import type { Tenant } from '@/payload-types'

import { getTestPayload } from '../common/payload'
import { TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { loadUser, type SessionUser } from '../common/users'

describe('feature slugs', () => {
  let payload: Payload
  let tenantA: Tenant
  let tenantAdmin: SessionUser
  let member: SessionUser

  beforeAll(async () => {
    payload = await getTestPayload()
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    tenantAdmin = await loadUser(payload, TEST_USERS.tenantAdmin)
    member = await loadUser(payload, TEST_USERS.member)
  })

  it('offers the board rows in access profiles', async () => {
    // arrange: the test payload's config
    const { collections, globals } = payload.config

    // act: getAccessSlugs(config.collections, config.globals); create a profile in test-a as the
    //      tenant admin without rows (defaultAccessRows fills them)
    const slugs = getAccessSlugs(collections, globals)
    const slug = uniqueName('profile-boards')
    const profile = await payload.create({
      collection: 'users-access',
      data: { name: slug, slug, tenant: tenantA.id },
      user: tenantAdmin,
      overrideAccess: false,
    })
    const boardRows = (profile.access ?? []).filter((row) =>
      FEATURE_SLUG_VALUES.some((value) => value === row.slug),
    )
    const saved = await payload.update({
      collection: 'users-access',
      id: profile.id,
      data: { access: (profile.access ?? []).map(({ id: _id, ...row }) => row) },
      user: tenantAdmin,
      overrideAccess: false,
    })

    // assert: the slugs end with order-waiter, order-kitchen, order-cashier; the new profile has
    //         a row for each (all unticked); a save with those rows passes validateAccessRows
    expect(slugs.slice(-3)).toEqual(['order-waiter', 'order-kitchen', 'order-cashier'])
    expect(boardRows.map((row) => [row.slug, row.read])).toEqual([
      ['order-waiter', false],
      ['order-kitchen', false],
      ['order-cashier', false],
    ])
    expect(saved.access).toHaveLength(profile.access?.length ?? 0)
  })

  it('grants every board to tenant admins', async () => {
    // arrange: the tenant admin of test-a, the member of test-a (editor profile, no board rows)
    // act: staffRolesFor(each, test-a)
    const adminRoles = staffRolesFor(tenantAdmin, tenantA.id)
    const memberRoles = staffRolesFor(member, tenantA.id)

    // assert: tenant admin → waiter, kitchen, cashier; member → none
    expect(adminRoles).toEqual(['waiter', 'kitchen', 'cashier'])
    expect(memberRoles).toEqual([])
  })
})
