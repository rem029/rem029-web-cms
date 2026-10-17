/** One user per role (`TEST_USERS`); each logs in with their email as the password. */
import type { Payload } from 'payload'

import { PAGES_EDITOR_TEMPLATE } from '@/collections/UsersAccess/utils/templates'
import { DEFAULT_TENANT_SLUG } from '@/common/utils/defaultTenant'

import { TEST_USERS, type ProfileIds, type TenantIds } from './fixtures'

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

/** A platform template (made by the migrations on the `admin` tenant) by slug. */
const findTemplateId = async (payload: Payload, slug: string): Promise<number> => {
  const { docs } = await payload.find({
    collection: 'users-access',
    where: {
      and: [
        { slug: { equals: slug } },
        { isTemplate: { equals: true } },
        { 'tenant.slug': { equals: DEFAULT_TENANT_SLUG } },
      ],
    },
    limit: 1,
    depth: 0,
  })
  if (!docs[0]) throw new Error(`test seed: template ${slug} missing, run the migrations`)
  return docs[0].id
}

export const seedTestUsers = async (
  payload: Payload,
  tenants: TenantIds,
  profiles: ProfileIds,
): Promise<void> => {
  const pagesEditor = await findTemplateId(payload, PAGES_EDITOR_TEMPLATE)
  const users: SeedUserSpec[] = [
    {
      email: TEST_USERS.superUser,
      name: 'Super User',
      super_user: true,
      is_disabled: false,
      tenants: [{ tenant: tenants.a, access: profiles.editor.a }],
    },
    {
      email: TEST_USERS.tenantAdmin,
      name: 'Tenant A Admin',
      super_user: false,
      is_disabled: false,
      tenants: [{ tenant: tenants.a, isTenantAdmin: true }],
    },
    {
      email: TEST_USERS.owner,
      name: 'Owner of A and B',
      super_user: false,
      is_disabled: false,
      tenants: [
        { tenant: tenants.a, isTenantAdmin: true },
        { tenant: tenants.b, isTenantAdmin: true },
      ],
    },
    {
      email: TEST_USERS.member,
      name: 'Tenant A Member',
      super_user: false,
      is_disabled: false,
      tenants: [{ tenant: tenants.a, access: profiles.editor.a }],
    },
    {
      email: TEST_USERS.viewer,
      name: 'Tenant A Viewer',
      super_user: false,
      is_disabled: false,
      tenants: [{ tenant: tenants.a, access: profiles.viewer.a }],
    },
    {
      email: TEST_USERS.templateEditor,
      name: 'Tenant A Template Editor',
      super_user: false,
      is_disabled: false,
      tenants: [{ tenant: tenants.a, access: pagesEditor }],
    },
    {
      // no profile on the row: assignDefaultAccess gives it the platform `default`
      email: TEST_USERS.defaultProfile,
      name: 'Tenant A Default',
      super_user: false,
      is_disabled: false,
      tenants: [{ tenant: tenants.a, access: null }],
    },
    {
      email: TEST_USERS.otherTenant,
      name: 'Tenant B Member',
      super_user: false,
      is_disabled: false,
      tenants: [{ tenant: tenants.b, access: profiles.editor.b }],
    },
    {
      email: TEST_USERS.otherViewer,
      name: 'Tenant B Viewer',
      super_user: false,
      is_disabled: false,
      tenants: [{ tenant: tenants.b, access: profiles.viewer.b }],
    },
    {
      email: TEST_USERS.multiTenant,
      name: 'Tenant A and B Member',
      super_user: false,
      is_disabled: false,
      tenants: [
        { tenant: tenants.a, access: profiles.editor.a },
        { tenant: tenants.b, access: profiles.editor.b },
      ],
    },
    {
      email: TEST_USERS.mixed,
      name: 'Mixed Member',
      super_user: false,
      is_disabled: false,
      tenants: [
        { tenant: tenants.a, access: profiles.editor.a },
        { tenant: tenants.b, access: profiles.viewer.b },
      ],
    },
    {
      email: TEST_USERS.disabled,
      name: 'Disabled Member',
      super_user: false,
      is_disabled: true,
      tenants: [{ tenant: tenants.a, access: profiles.editor.a }],
    },
  ]

  for (const user of users) {
    await upsertUser(payload, user)
  }
}
