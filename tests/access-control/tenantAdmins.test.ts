// Tenant admins: the "Tenant admin" box on a tenants[] row lets that user manage the tenant's
// members, profiles and name, and nothing outside it. owner is tenant admin of test-a and test-b
// (the only one of test-b); templateEditor has the pages-editor template in test-a; otherViewer is
// a viewer in test-b; test-c is outside.
import type { Payload, PayloadRequest } from 'payload'
import { beforeAll, describe, expect, it, onTestFinished } from 'vitest'

import { canCreatePassword, isSelfOrSuperUserField } from '@/collections/Users/utils/access'
import { DEFAULT_ACCESS_SLUG } from '@/collections/UsersAccess/utils/defaultProfile'
import { PAGES_EDITOR_TEMPLATE } from '@/collections/UsersAccess/utils/templates'
import { adminAccess, hiddenResolver } from '@/common/utils/access'
import { DEFAULT_TENANT_SLUG } from '@/common/utils/defaultTenant'
import { extractTenantId } from '@/common/utils/tenantCollections'
import type { Tenant, User, UsersAccess } from '@/payload-types'

import { findProfile } from '../common/access'
import { getTestPayload } from '../common/payload'
import { TEST_PROFILES, TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { loadUser, makeUser, reqFor, type SessionUser, type TenantRow } from '../common/users'
import { context } from './pages'

type RowIds = {
  tenant: number
  access: number | null
  isTenantAdmin: boolean
}

const SENSITIVE_FIELDS = ['password', 'name', 'email', 'super_user', 'is_disabled'] as const
type SensitiveField = (typeof SENSITIVE_FIELDS)[number]

const SENSITIVE: Record<SensitiveField, () => Partial<User>> = {
  password: () => ({ password: 'something-else' }),
  name: () => ({ name: 'renamed by owner' }),
  email: () => ({ email: `${uniqueName('tenant-admins-changed')}@example.test` }),
  super_user: () => ({ super_user: true }),
  is_disabled: () => ({ is_disabled: true }),
}

describe('tenant admins', () => {
  let payload: Payload
  let superUser: SessionUser
  let owner: SessionUser
  let templateEditor: SessionUser
  let otherViewer: SessionUser
  let tenantA: Tenant
  let tenantB: Tenant
  let tenantC: Tenant
  let adminTenant: Tenant
  let editorA: number
  let viewerA: number
  let editorB: number
  let viewerB: number
  let platformDefault: number
  let pagesEditorTemplate: number
  let platformProfile: number

  const rowsOf = (user: Pick<User, 'tenants'>): RowIds[] =>
    (user.tenants ?? []).flatMap((row) => {
      const tenant = extractTenantId(row.tenant)
      if (tenant === null) return []
      return [
        {
          tenant,
          access: extractTenantId(row.access),
          isTenantAdmin: row.isTenantAdmin === true,
        },
      ]
    })

  const storedRows = async (id: number): Promise<RowIds[]> =>
    rowsOf(await payload.findByID({ collection: 'users', id, depth: 0 }))

  const createUser = async (
    tenants: TenantRow[],
    extra?: { super_user?: boolean },
  ): Promise<User> => {
    const email = `${uniqueName('tenant-admins')}@example.test`
    return payload.create({
      collection: 'users',
      data: {
        email,
        password: email,
        tenants,
        ...extra,
      },
      user: superUser,
      overrideAccess: false,
    })
  }

  const updateRows = (actor: SessionUser, id: number, tenants: TenantRow[]) =>
    payload.update({
      collection: 'users',
      id,
      data: { tenants },
      user: actor,
      overrideAccess: false,
    })

  beforeAll(async () => {
    payload = await getTestPayload()
    superUser = await loadUser(payload, TEST_USERS.superUser)
    owner = await loadUser(payload, TEST_USERS.owner)
    templateEditor = await loadUser(payload, TEST_USERS.templateEditor)
    otherViewer = await loadUser(payload, TEST_USERS.otherViewer)
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    tenantB = await findTenant(payload, TEST_TENANTS.b)
    tenantC = await findTenant(payload, TEST_TENANTS.c)
    adminTenant = await findTenant(payload, DEFAULT_TENANT_SLUG)
    editorA = (await findProfile(payload, TEST_PROFILES.editor, tenantA.id)).id
    viewerA = (await findProfile(payload, TEST_PROFILES.viewer, tenantA.id)).id
    editorB = (await findProfile(payload, TEST_PROFILES.editor, tenantB.id)).id
    viewerB = (await findProfile(payload, TEST_PROFILES.viewer, tenantB.id)).id
    platformDefault = (await findProfile(payload, DEFAULT_ACCESS_SLUG, adminTenant.id)).id
    pagesEditorTemplate = (await findProfile(payload, PAGES_EDITOR_TEMPLATE, adminTenant.id)).id

    const platformSlug = uniqueName('platform')
    platformProfile = (
      await payload.create({
        collection: 'users-access',
        data: {
          name: platformSlug,
          slug: platformSlug,
          tenant: adminTenant.id,
          access: [{ slug: 'pages', hidden: false, read: true }],
        },
        user: superUser,
        overrideAccess: false,
      })
    ).id
  })

  describe('seed', () => {
    it('makes owner tenant admin of test-a and test-b only', () => {
      // assert
      const rows = rowsOf(owner)
      expect(rows).toHaveLength(2)
      expect(rows.every((r) => r.isTenantAdmin)).toBe(true)
      expect(rows.map((r) => r.tenant).sort()).toEqual([tenantA.id, tenantB.id].sort())
    })

    it('gives templateEditor the template and otherViewer the b viewer', () => {
      // assert
      expect(rowsOf(templateEditor).map((r) => [r.tenant, r.access])).toEqual([
        [tenantA.id, pagesEditorTemplate],
      ])
      expect(rowsOf(otherViewer).map((r) => [r.tenant, r.access])).toEqual([[tenantB.id, viewerB]])
    })
  })

  describe('nav', () => {
    it('lets owner open /admin', async () => {
      // act
      const allowed = adminAccess({ req: await reqFor(payload, owner) })

      // assert
      expect(allowed).toBe(true)
    })

    it.each(['users', 'users-access', 'tenants', 'pages', 'header'] as const)(
      'shows owner %s',
      (slug) => {
        // act
        const hidden = hiddenResolver(slug)({ user: owner })

        // assert
        expect(hidden).toBe(false)
      },
    )

    it('hides users-access from templateEditor', () => {
      // act
      const hidden = hiddenResolver('users-access')({ user: templateEditor })

      // assert
      expect(hidden).toBe(true)
    })
  })

  describe('reading users', () => {
    let shared: User
    let cOnly: User
    let visible: User[]

    beforeAll(async () => {
      shared = await createUser([
        { tenant: tenantA.id, access: editorA },
        { tenant: tenantC.id, access: platformProfile },
      ])
      cOnly = await createUser([{ tenant: tenantC.id, access: platformProfile }])
      const result = await payload.find({
        collection: 'users',
        user: owner,
        overrideAccess: false,
        depth: 0,
        pagination: false,
      })
      visible = result.docs
    })

    it('shows owner only users of their tenants, and themselves', () => {
      // assert
      const visibleIds = visible.map((u) => u.id)
      expect(
        visible.every(
          (u) =>
            u.id === owner.id ||
            rowsOf(u).some((r) => r.tenant === tenantA.id || r.tenant === tenantB.id),
        ),
      ).toBe(true)
      expect(visibleIds).toContain(shared.id)
      expect(visibleIds).toContain(templateEditor.id)
    })

    it('hides a user only in test-c', () => {
      // assert
      expect(visible.map((u) => u.id)).not.toContain(cOnly.id)
    })

    it('shows only the a row of an a + c user', () => {
      // assert
      const sharedSeen = visible.find((u) => u.id === shared.id)
      expect(sharedSeen).toBeDefined()
      expect(rowsOf(sharedSeen ?? { tenants: [] }).map((r) => r.tenant)).toEqual([tenantA.id])
    })

    it('shows owner all of their own rows', () => {
      // assert
      const ownerSelf = visible.find((u) => u.id === owner.id)
      expect(ownerSelf).toBeDefined()
      expect(rowsOf(ownerSelf ?? { tenants: [] })).toHaveLength(2)
    })

    it('shows a member colleagues without their rows', async () => {
      // act
      const { docs } = await payload.find({
        collection: 'users',
        user: templateEditor,
        overrideAccess: false,
        depth: 0,
        pagination: false,
      })

      // assert
      expect(docs.map((u) => u.id)).toContain(templateEditor.id)
      expect(docs.every((u) => u.id === templateEditor.id || rowsOf(u).length === 0)).toBe(true)
    })
  })

  describe('tenant rows', () => {
    it('lets owner change the a profile of a shared user', async () => {
      // arrange
      const shared = await createUser([
        { tenant: tenantA.id, access: editorA },
        { tenant: tenantC.id, access: platformProfile },
      ])

      // act
      const updated = await updateRows(owner, shared.id, [{ tenant: tenantA.id, access: viewerA }])

      // assert
      expect(updated.id).toBe(shared.id)
    })

    it('keeps the c row the owner never saw', async () => {
      // arrange
      const shared = await createUser([
        { tenant: tenantA.id, access: editorA },
        { tenant: tenantC.id, access: platformProfile },
      ])
      await updateRows(owner, shared.id, [{ tenant: tenantA.id, access: viewerA }])

      // act
      const rows = await storedRows(shared.id)

      // assert
      expect(rows).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ tenant: tenantC.id, access: platformProfile }),
          expect.objectContaining({ tenant: tenantA.id, access: viewerA }),
        ]),
      )
    })

    it('refuses owner adding or editing a c row', async () => {
      // arrange
      const shared = await createUser([
        { tenant: tenantA.id, access: editorA },
        { tenant: tenantC.id, access: platformProfile },
      ])

      // act / assert
      await expect(
        updateRows(owner, shared.id, [
          { tenant: tenantA.id, access: viewerA },
          { tenant: tenantC.id, access: viewerA },
        ]),
      ).rejects.toMatchObject({ status: 403 })
    })

    it("refuses another business's profile on an a row", async () => {
      // arrange
      const aMember = await createUser([{ tenant: tenantA.id, access: viewerA }])

      // act / assert
      await expect(
        updateRows(owner, aMember.id, [{ tenant: tenantA.id, access: editorB }]),
      ).rejects.toMatchObject({ status: 403 })
    })

    it('refuses a platform profile other than default on an a row', async () => {
      // arrange
      const aMember = await createUser([{ tenant: tenantA.id, access: viewerA }])

      // act / assert
      await expect(
        updateRows(owner, aMember.id, [{ tenant: tenantA.id, access: platformProfile }]),
      ).rejects.toMatchObject({ status: 403 })
    })

    it('accepts the platform default profile', async () => {
      // arrange
      const aMember = await createUser([{ tenant: tenantA.id, access: viewerA }])

      // act
      const updated = await updateRows(owner, aMember.id, [
        { tenant: tenantA.id, access: platformDefault },
      ])

      // assert
      expect(updated.id).toBe(aMember.id)
    })

    it('keeps an untouched row with a platform profile when saving', async () => {
      // arrange
      const shared = await createUser([
        { tenant: tenantA.id, access: editorA },
        { tenant: tenantC.id, access: platformProfile },
      ])
      const seen = await payload.findByID({
        collection: 'users',
        id: shared.id,
        user: owner,
        overrideAccess: false,
        depth: 0,
      })

      // act
      const updated = await updateRows(
        owner,
        shared.id,
        rowsOf(seen).map((r) => ({ ...r, access: viewerA })),
      )

      // assert
      expect(updated.id).toBe(shared.id)
    })

    it('accepts a b profile on a b row with the a cookie selected', async () => {
      // arrange
      const aMember = await createUser([{ tenant: tenantA.id, access: viewerA }])

      // act
      const updated = await payload.update({
        collection: 'users',
        id: aMember.id,
        data: {
          tenants: [
            { tenant: tenantA.id, access: platformDefault },
            { tenant: tenantB.id, access: viewerB },
          ],
        },
        req: await reqFor(payload, owner, { tenantCookie: tenantA.id }),
        overrideAccess: false,
      })

      // assert
      expect(updated.id).toBe(aMember.id)
    })
  })

  describe('appointing tenant admins', () => {
    it('lets owner make an a member tenant admin', async () => {
      // arrange
      const aMember = await createUser([{ tenant: tenantA.id, access: platformDefault }])

      // act
      const updated = await updateRows(owner, aMember.id, [
        { tenant: tenantA.id, access: platformDefault, isTenantAdmin: true },
      ])

      // assert
      expect(updated.id).toBe(aMember.id)
    })

    it('lets owner demote them again', async () => {
      // arrange
      const aMember = await createUser([{ tenant: tenantA.id, access: platformDefault }])
      await updateRows(owner, aMember.id, [
        { tenant: tenantA.id, access: platformDefault, isTenantAdmin: true },
      ])

      // act
      const updated = await updateRows(owner, aMember.id, [
        { tenant: tenantA.id, access: platformDefault, isTenantAdmin: false },
      ])

      // assert
      expect(updated.id).toBe(aMember.id)
    })

    it('keeps the profile while the row is tenant admin', async () => {
      // arrange
      const aMember = await createUser([{ tenant: tenantA.id, access: platformDefault }])
      await updateRows(owner, aMember.id, [
        { tenant: tenantA.id, access: platformDefault, isTenantAdmin: true },
      ])
      await updateRows(owner, aMember.id, [
        { tenant: tenantA.id, access: platformDefault, isTenantAdmin: false },
      ])

      // act
      const rows = await storedRows(aMember.id)

      // assert
      expect(rows).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ tenant: tenantA.id, access: platformDefault }),
        ]),
      )
    })

    it('refuses owner changing their own row', async () => {
      // act / assert
      await expect(
        updateRows(owner, owner.id, [
          { tenant: tenantA.id, access: editorA, isTenantAdmin: false },
        ]),
      ).rejects.toMatchObject({ status: 403 })
    })

    it('lets owner still rename themselves', async () => {
      // act
      const updated = await payload.update({
        collection: 'users',
        id: owner.id,
        data: { name: owner.name ?? 'Owner' },
        user: owner,
        overrideAccess: false,
      })

      // assert
      expect(updated.id).toBe(owner.id)
    })

    // nobody can edit their own row, so the last admin only goes through a race; an actor that
    //   isn't stored stands in for the other side: ghost = makeUser({ id: 999001, rows a and b
    //   tenant admin }). owner is the only tenant admin of test-b (test-a also has tenantAdmin)

    it('refuses demoting the last tenant admin', async () => {
      // arrange
      const ghost = makeUser({
        id: 999001,
        tenants: [
          { tenant: tenantA.id, isTenantAdmin: true },
          { tenant: tenantB.id, isTenantAdmin: true },
        ],
      })

      // act / assert
      await expect(
        updateRows(ghost, owner.id, [
          { tenant: tenantA.id, isTenantAdmin: true },
          { tenant: tenantB.id, isTenantAdmin: false },
        ]),
      ).rejects.toMatchObject({ status: 403 })
    })

    it('refuses removing the last tenant admin row', async () => {
      // arrange
      const ghost = makeUser({
        id: 999001,
        tenants: [
          { tenant: tenantA.id, isTenantAdmin: true },
          { tenant: tenantB.id, isTenantAdmin: true },
        ],
      })

      // act / assert
      await expect(
        updateRows(ghost, owner.id, [{ tenant: tenantA.id, isTenantAdmin: true }]),
      ).rejects.toMatchObject({ status: 403 })
    })

    it("refuses owner changing a super user's row", async () => {
      // arrange
      const superMember = await createUser([{ tenant: tenantA.id, access: editorA }], {
        super_user: true,
      })

      // act / assert
      await expect(
        updateRows(owner, superMember.id, [{ tenant: tenantA.id, access: viewerA }]),
      ).rejects.toMatchObject({ status: expect.toBeOneOf([403, 404]) })
    })

    it('refuses owner deleting a super user', async () => {
      // arrange
      const superMember = await createUser([{ tenant: tenantA.id, access: editorA }], {
        super_user: true,
      })

      // act / assert
      await expect(
        payload.delete({
          collection: 'users',
          id: superMember.id,
          user: owner,
          overrideAccess: false,
        }),
      ).rejects.toMatchObject({ status: expect.toBeOneOf([403, 404]) })
    })
  })

  describe('admin UI field access', () => {
    let aMember: User
    let ownerReq: PayloadRequest

    beforeAll(async () => {
      aMember = await createUser([{ tenant: tenantA.id, access: viewerA }])
      ownerReq = await reqFor(payload, owner)
    })

    it("denies owner setting another user's password", () => {
      // act
      const allowed = isSelfOrSuperUserField({ req: ownerReq, id: aMember.id })

      // assert
      expect(allowed).toBe(false)
    })

    it("allows a super user setting another user's password", async () => {
      // act
      const allowed = isSelfOrSuperUserField({
        req: await reqFor(payload, superUser),
        id: aMember.id,
      })

      // assert
      expect(allowed).toBe(true)
    })

    it('allows owner setting their own password', () => {
      // act
      const allowed = isSelfOrSuperUserField({ req: ownerReq, id: owner.id })

      // assert
      expect(allowed).toBe(true)
    })

    it('allows owner setting a password on a new user', () => {
      // act
      const allowed = canCreatePassword({ req: ownerReq })

      // assert
      expect(allowed).toBe(true)
    })

    it('refuses owner unlocking another user', async () => {
      // act / assert
      await expect(
        payload.unlock({
          collection: 'users',
          // Payload's generated unlock type requires a password; unlock ignores it
          data: { email: aMember.email, password: '' },
          req: ownerReq,
          overrideAccess: false,
        }),
      ).rejects.toMatchObject({ status: 403 })
    })
  })

  describe("another user's sensitive fields", () => {
    let aMember: User

    beforeAll(async () => {
      aMember = await createUser([{ tenant: tenantA.id, access: viewerA }])
    })

    it.each(SENSITIVE_FIELDS)("refuses owner changing another user's %s", async (field) => {
      // arrange
      const data = SENSITIVE[field]()

      // act / assert
      await expect(
        payload.update({
          collection: 'users',
          id: aMember.id,
          data,
          user: owner,
          overrideAccess: false,
        }),
      ).rejects.toMatchObject({ status: 403 })
    })
  })

  describe('creating and deleting users', () => {
    const createAs = (
      actor: SessionUser,
      tenants: TenantRow[],
      extra?: { super_user?: boolean },
    ) => {
      const email = `${uniqueName('tenant-admins')}@example.test`
      return payload.create({
        collection: 'users',
        data: {
          email,
          password: email,
          tenants,
          ...extra,
        },
        user: actor,
        overrideAccess: false,
        depth: 1,
      })
    }

    it('lets owner create an a member, who gets the default profile', async () => {
      // act
      const created = await createAs(owner, [{ tenant: tenantA.id }])

      // assert
      expect(rowsOf(created)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ tenant: tenantA.id, access: platformDefault }),
        ]),
      )
    })

    it('refuses a c row', async () => {
      // act / assert
      await expect(createAs(owner, [{ tenant: tenantC.id }])).rejects.toMatchObject({ status: 403 })
    })

    it('refuses no row', async () => {
      // act / assert
      await expect(createAs(owner, [])).rejects.toMatchObject({ status: 403 })
    })

    it('refuses super_user', async () => {
      // act / assert
      await expect(
        createAs(owner, [{ tenant: tenantA.id }], { super_user: true }),
      ).rejects.toMatchObject({ status: 403 })
    })

    it('refuses templateEditor creating users', async () => {
      // act / assert
      await expect(createAs(templateEditor, [{ tenant: tenantA.id }])).rejects.toMatchObject({
        status: 403,
      })
    })

    it('lets owner delete a user only in test-a', async () => {
      // arrange
      const created = await createAs(owner, [{ tenant: tenantA.id }])

      // act
      const deleted = await payload.delete({
        collection: 'users',
        id: created.id,
        user: owner,
        overrideAccess: false,
      })

      // assert
      expect(deleted.id).toBe(created.id)
    })

    it('refuses deleting a user also in test-c', async () => {
      // arrange
      const shared = await createUser([
        { tenant: tenantA.id, access: editorA },
        { tenant: tenantC.id, access: platformProfile },
      ])

      // act / assert
      await expect(
        payload.delete({
          collection: 'users',
          id: shared.id,
          user: owner,
          overrideAccess: false,
        }),
      ).rejects.toMatchObject({ status: 403 })
    })
  })

  describe('profiles', () => {
    const createProfileAs = (
      actor: SessionUser,
      tenant: number,
      access: NonNullable<UsersAccess['access']> = [{ slug: 'pages', hidden: false, read: true }],
    ) => {
      const slug = uniqueName('ta-profile')
      return payload.create({
        collection: 'users-access',
        data: { name: slug, slug, tenant, access },
        user: actor,
        overrideAccess: false,
      })
    }

    const ownProfile = () => createProfileAs(owner, tenantA.id)

    it('lets owner create a profile in test-a', async () => {
      // act
      const profile = await createProfileAs(owner, tenantA.id)

      // assert
      expect(profile.id).toBeTypeOf('number')
    })

    it('lets owner assign it to an a member', async () => {
      // arrange
      const profile = await ownProfile()
      const aMember = await createUser([{ tenant: tenantA.id, access: viewerA }])

      // act
      const updated = await updateRows(owner, aMember.id, [
        { tenant: tenantA.id, access: profile.id },
      ])

      // assert
      expect(updated.id).toBe(aMember.id)
    })

    it('refuses it on their b row', async () => {
      // arrange
      const profile = await ownProfile()
      const aMember = await createUser([{ tenant: tenantA.id, access: viewerA }])

      // act / assert
      await expect(
        updateRows(owner, aMember.id, [
          { tenant: tenantA.id, access: profile.id },
          { tenant: tenantB.id, access: profile.id },
        ]),
      ).rejects.toMatchObject({ status: 403 })
    })

    it('lets owner update it', async () => {
      // arrange
      const profile = await ownProfile()

      // act
      const updated = await payload.update({
        collection: 'users-access',
        id: profile.id,
        data: { description: 'edited' },
        user: owner,
        overrideAccess: false,
      })

      // assert
      expect(updated.id).toBe(profile.id)
    })

    it('refuses owner moving it to test-c', async () => {
      // arrange
      const profile = await ownProfile()

      // act / assert
      await expect(
        payload.update({
          collection: 'users-access',
          id: profile.id,
          data: { tenant: tenantC.id },
          user: owner,
          overrideAccess: false,
        }),
      ).rejects.toMatchObject({ status: 403 })
    })

    it('rejects a profile with users update, naming the slug', async () => {
      // act / assert
      await expect(
        createProfileAs(owner, tenantA.id, [
          { slug: 'users', hidden: false, read: true, update: true },
        ]),
      ).rejects.toMatchObject({
        status: 400,
        data: {
          errors: expect.arrayContaining([
            expect.objectContaining({ message: expect.stringContaining('"users"') }),
          ]),
        },
      })
    })

    it('rejects a profile with users-access update', async () => {
      // act / assert
      await expect(
        createProfileAs(owner, tenantA.id, [
          { slug: 'users-access', hidden: false, read: true, update: true },
        ]),
      ).rejects.toMatchObject({
        status: 400,
        data: {
          errors: expect.arrayContaining([
            expect.objectContaining({ message: expect.stringContaining('"users-access"') }),
          ]),
        },
      })
    })

    it('refuses owner creating one in test-c', async () => {
      // act / assert
      await expect(createProfileAs(owner, tenantC.id)).rejects.toMatchObject({ status: 403 })
    })

    it('refuses owner creating one on the admin tenant', async () => {
      // act / assert
      await expect(createProfileAs(owner, adminTenant.id)).rejects.toMatchObject({ status: 403 })
    })

    it('refuses owner editing the platform default', async () => {
      // act / assert
      await expect(
        payload.update({
          collection: 'users-access',
          id: platformDefault,
          data: { description: 'hacked' },
          user: owner,
          overrideAccess: false,
        }),
      ).rejects.toMatchObject({ status: expect.toBeOneOf([403, 404]) })
    })

    it('shows owner their profiles and the platform templates only', async () => {
      // act
      const { docs: profiles } = await payload.find({
        collection: 'users-access',
        user: owner,
        overrideAccess: false,
        depth: 0,
        pagination: false,
      })

      // assert
      const profileIds = profiles.map((p) => p.id)
      expect(
        profiles.every((p) => {
          const tenant = extractTenantId(p.tenant)
          return (
            tenant === tenantA.id ||
            tenant === tenantB.id ||
            (p.isTemplate === true && tenant === adminTenant.id)
          )
        }),
      ).toBe(true)
      expect(profileIds).toContain(platformDefault)
      expect(profileIds).toContain(pagesEditorTemplate)
      expect(profileIds).not.toContain(platformProfile)
    })

    it('refuses templateEditor reading profiles', async () => {
      // act / assert
      await expect(
        payload.find({
          collection: 'users-access',
          user: templateEditor,
          overrideAccess: false,
        }),
      ).rejects.toMatchObject({ status: 403 })
    })

    it('lets owner delete it', async () => {
      // arrange
      const profile = await ownProfile()

      // act
      const deleted = await payload.delete({
        collection: 'users-access',
        id: profile.id,
        user: owner,
        overrideAccess: false,
      })

      // assert
      expect(deleted.id).toBe(profile.id)
    })
  })

  describe('tenants', () => {
    const updateTenant = (
      id: number,
      data: Partial<Pick<Tenant, 'name' | 'slug' | 'isActive' | 'domains'>>,
    ) =>
      payload.update({
        collection: 'tenants',
        id,
        data,
        user: owner,
        overrideAccess: false,
        locale: 'en',
        context,
      })

    it('lets owner rename test-a', async () => {
      // arrange
      onTestFinished(async () => {
        await payload.update({
          collection: 'tenants',
          id: tenantA.id,
          data: { name: tenantA.name },
          user: superUser,
          locale: 'en',
          context,
        })
      })

      // act
      const updated = await updateTenant(tenantA.id, { name: `${tenantA.name} (renamed)` })

      // assert
      expect(updated.id).toBe(tenantA.id)
    })

    it('refuses a slug change', async () => {
      // act / assert
      await expect(updateTenant(tenantA.id, { slug: uniqueName('renamed') })).rejects.toMatchObject(
        { status: 403 },
      )
    })

    it('refuses an isActive change', async () => {
      // act / assert
      await expect(updateTenant(tenantA.id, { isActive: false })).rejects.toMatchObject({
        status: 403,
      })
    })

    it('refuses a domains change', async () => {
      // act / assert
      await expect(
        updateTenant(tenantA.id, { domains: [{ domain: 'tenant-admins.example.test' }] }),
      ).rejects.toMatchObject({ status: 403 })
    })

    it('refuses updating test-c', async () => {
      // act / assert
      await expect(updateTenant(tenantC.id, { name: 'x' })).rejects.toMatchObject({
        status: expect.toBeOneOf([403, 404]),
      })
    })

    it('refuses owner creating a tenant', async () => {
      // arrange
      const slug = uniqueName('tenant')

      // act / assert
      await expect(
        payload.create({
          collection: 'tenants',
          data: { name: slug, slug },
          user: owner,
          overrideAccess: false,
        }),
      ).rejects.toMatchObject({ status: 403 })
    })

    it('refuses owner deleting a tenant', async () => {
      // act / assert
      await expect(
        payload.delete({
          collection: 'tenants',
          id: tenantB.id,
          user: owner,
          overrideAccess: false,
        }),
      ).rejects.toMatchObject({ status: expect.toBeOneOf([403, 404]) })
    })
  })

  describe.each(['header', 'footer', 'theme', 'settings'] as const)('%s', (slug) => {
    let docA: number
    let docC: number

    beforeAll(async () => {
      const findDoc = async (tenant: Tenant): Promise<number> => {
        const { docs } = await payload.find({
          collection: slug,
          where: { tenant: { equals: tenant.id } },
          limit: 1,
          depth: 0,
        })
        if (!docs[0]) {
          throw new Error(`tests: no ${slug} doc in tenant ${tenant.slug}`)
        }
        return docs[0].id
      }
      docA = await findDoc(tenantA)
      docC = await findDoc(tenantC)
    })

    it("lets owner update test-a's", async () => {
      // act
      const updated = await payload.update({
        collection: slug,
        id: docA,
        data: {},
        user: owner,
        overrideAccess: false,
        context,
      })

      // assert
      expect(updated.id).toBe(docA)
    })

    it("refuses owner updating test-c's", async () => {
      // act / assert
      await expect(
        payload.update({
          collection: slug,
          id: docC,
          data: {},
          user: owner,
          overrideAccess: false,
          context,
        }),
      ).rejects.toMatchObject({ status: expect.toBeOneOf([403, 404]) })
    })

    it("refuses owner deleting test-a's", async () => {
      // act / assert
      await expect(
        payload.delete({
          collection: slug,
          id: docA,
          user: owner,
          overrideAccess: false,
          context,
        }),
      ).rejects.toMatchObject({ status: expect.toBeOneOf([403, 404]) })
    })

    it('refuses owner creating one', async () => {
      // act / assert
      await expect(
        payload.create({
          collection: slug,
          // every field is optional; the tenant alone is a valid doc
          data: { tenant: tenantA.id },
          user: owner,
          overrideAccess: false,
          context,
        }),
      ).rejects.toMatchObject({ status: expect.toBeOneOf([400, 403]) })
    })
  })

  describe('members', () => {
    const homeOf = async (tenant: Tenant): Promise<number> => {
      const { docs } = await payload.find({
        collection: 'pages',
        where: { and: [{ tenant: { equals: tenant.id } }, { slug: { equals: 'home' } }] },
        limit: 1,
        depth: 0,
      })
      if (!docs[0]) {
        throw new Error(`tests: no home page in tenant ${tenant.slug}`)
      }
      return docs[0].id
    }

    it('lets templateEditor edit an a page', async () => {
      // arrange
      const homeA = await homeOf(tenantA)

      // act
      const updated = await payload.update({
        collection: 'pages',
        id: homeA,
        data: {},
        user: templateEditor,
        overrideAccess: false,
        context,
      })

      // assert
      expect(updated.id).toBe(homeA)
    })

    it('refuses templateEditor editing a b page', async () => {
      // arrange
      const homeB = await homeOf(tenantB)

      // act / assert
      await expect(
        payload.update({
          collection: 'pages',
          id: homeB,
          data: {},
          user: templateEditor,
          overrideAccess: false,
          context,
        }),
      ).rejects.toMatchObject({ status: expect.toBeOneOf([403, 404]) })
    })

    it('lets otherViewer read b pages', async () => {
      // act
      const result = await payload.count({
        collection: 'pages',
        where: { tenant: { equals: tenantB.id } },
        user: otherViewer,
        overrideAccess: false,
      })

      // assert
      expect(result.totalDocs).toBeGreaterThan(0)
    })

    it('refuses otherViewer editing a b page', async () => {
      // arrange
      const homeB = await homeOf(tenantB)

      // act / assert
      await expect(
        payload.update({
          collection: 'pages',
          id: homeB,
          data: {},
          user: otherViewer,
          overrideAccess: false,
          context,
        }),
      ).rejects.toMatchObject({ status: expect.toBeOneOf([403, 404]) })
    })

    it('refuses otherViewer editing an a page', async () => {
      // arrange
      const homeA = await homeOf(tenantA)

      // act / assert
      await expect(
        payload.update({
          collection: 'pages',
          id: homeA,
          data: {},
          user: otherViewer,
          overrideAccess: false,
          context,
        }),
      ).rejects.toMatchObject({ status: expect.toBeOneOf([403, 404]) })
    })
  })
})
