/** One user per role (`TEST_USERS`); each logs in with their email as the password. */
import type { Payload } from 'payload'

import { TEST_USERS, type TenantIds } from './fixtures'

type SeedUserSpec = {
  email: string
  name: string
  super_user: boolean
  is_disabled: boolean
  tenants: { tenant: number; access?: number | null; isTenantAdmin?: boolean }[]
}

const upsertUser = async (payload: Payload, spec: SeedUserSpec): Promise<void> => {
  const { docs } = await payload.find({
    collection: 'users',
    where: { email: { equals: spec.email } },
    limit: 1,
    depth: 0,
  })

  if (docs[0]) {
    await payload.update({
      collection: 'users',
      id: docs[0].id,
      data: {
        name: spec.name,
        tenants: spec.tenants,
        super_user: spec.super_user,
        is_disabled: spec.is_disabled,
      },
    })
    payload.logger.info(`test seed: updated user ${spec.email}`)
    return
  }

  const created = await payload.create({
    collection: 'users',
    data: {
      email: spec.email,
      name: spec.name,
      password: spec.email,
      tenants: spec.tenants,
      super_user: spec.super_user,
      is_disabled: spec.is_disabled,
    },
  })

  // the super user is the first user, and setupFirstUser replaces its rows with the admin tenant:
  // write the intended rows again
  if (spec.super_user) {
    await payload.update({
      collection: 'users',
      id: created.id,
      data: {
        tenants: spec.tenants,
        super_user: true,
        is_disabled: spec.is_disabled,
      },
    })
  }

  payload.logger.info(`test seed: created user ${spec.email}`)
}

export const seedTestUsers = async (
  payload: Payload,
  tenants: TenantIds,
  editors: TenantIds,
): Promise<void> => {
  const users: SeedUserSpec[] = [
    {
      email: TEST_USERS.superUser,
      name: 'Super User',
      super_user: true,
      is_disabled: false,
      tenants: [{ tenant: tenants.a, access: editors.a }],
    },
    {
      email: TEST_USERS.tenantAdmin,
      name: 'Tenant A Admin',
      super_user: false,
      is_disabled: false,
      tenants: [{ tenant: tenants.a, isTenantAdmin: true }],
    },
    {
      email: TEST_USERS.member,
      name: 'Tenant A Member',
      super_user: false,
      is_disabled: false,
      tenants: [{ tenant: tenants.a, access: editors.a }],
    },
    {
      email: TEST_USERS.otherTenant,
      name: 'Tenant B Member',
      super_user: false,
      is_disabled: false,
      tenants: [{ tenant: tenants.b, access: editors.b }],
    },
    {
      email: TEST_USERS.multiTenant,
      name: 'Tenant A and B Member',
      super_user: false,
      is_disabled: false,
      tenants: [
        { tenant: tenants.a, access: editors.a },
        { tenant: tenants.b, access: editors.b },
      ],
    },
    {
      email: TEST_USERS.disabled,
      name: 'Disabled Member',
      super_user: false,
      is_disabled: true,
      tenants: [{ tenant: tenants.a, access: editors.a }],
    },
  ]

  for (const user of users) {
    await upsertUser(payload, user)
  }
}
