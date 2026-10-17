// Field access on users: a member edits only their own name and password and raises nobody's
// access; disabled users get nothing; the last super user stays. Members are editors (member,
// or a fresh one per self-edit check) and viewers of test-a.
import { createLocalReq, type Payload, type PayloadRequest } from 'payload'
import { beforeAll, describe, expect, it, onTestFinished } from 'vitest'

import { DEFAULT_ACCESS_SLUG } from '@/collections/UsersAccess/utils/defaultProfile'
import { adminAccess, hasAccess } from '@/common/utils/access'
import { DEFAULT_TENANT_SLUG } from '@/common/utils/defaultTenant'
import { extractTenantId } from '@/common/utils/tenantCollections'
import type { Tenant, User, UsersAccess } from '@/payload-types'

import { findProfile, profileSlugOn } from '../common/access'
import { getTestPayload } from '../common/payload'
import { TEST_PROFILES, TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { asSessionUser, loadUser, reqFor, type SessionUser } from '../common/users'

const ESCALATION_FIELDS = [
  'super_user',
  'tenants.access',
  'tenants',
  'is_disabled',
  'email',
] as const
type EscalationField = (typeof ESCALATION_FIELDS)[number]

const accessIdOf = (access: unknown): number | null => {
  if (typeof access === 'number') return access
  if (access && typeof access === 'object' && 'id' in access && typeof access.id === 'number') {
    return access.id
  }
  return null
}

describe('user field access', () => {
  let payload: Payload
  let superUser: SessionUser
  let member: SessionUser
  let viewer: SessionUser
  let disabled: SessionUser
  let adminTenant: Tenant
  let tenantA: Tenant
  let editorProfile: UsersAccess
  let viewerProfile: UsersAccess

  const createEditor = async (): Promise<SessionUser> => {
    const email = `${uniqueName('field-access')}@example.test`
    await payload.create({
      collection: 'users',
      data: {
        email,
        password: email,
        tenants: [{ tenant: tenantA.id, access: editorProfile.id }],
      },
      user: superUser,
      overrideAccess: false,
    })
    return loadUser(payload, email)
  }

  const updateSelf = (user: SessionUser, data: Partial<User>) =>
    payload.update({
      collection: 'users',
      id: user.id,
      data,
      user,
      overrideAccess: false,
    })

  const canLogin = async (email: string, password: string): Promise<boolean> => {
    try {
      const result = await payload.login({
        collection: 'users',
        data: { email, password },
      })
      return Boolean(result.token)
    } catch {
      return false
    }
  }

  const escalatedTenants = (editor: SessionUser) =>
    (editor.tenants ?? []).map((row) => ({
      ...row,
      tenant: extractTenantId(row.tenant) ?? tenantA.id,
      access: viewerProfile.id,
    }))

  const ESCALATIONS: Record<EscalationField, (editor: SessionUser) => Partial<User>> = {
    super_user: () => ({ super_user: true }),
    'tenants.access': (editor) => ({ tenants: escalatedTenants(editor) }),
    tenants: () => ({ tenants: [] }),
    is_disabled: () => ({ is_disabled: true }),
    email: () => ({ email: `${uniqueName('field-access-renamed')}@example.test` }),
  }

  beforeAll(async () => {
    payload = await getTestPayload()
    superUser = await loadUser(payload, TEST_USERS.superUser)
    member = await loadUser(payload, TEST_USERS.member)
    viewer = await loadUser(payload, TEST_USERS.viewer)
    disabled = await loadUser(payload, TEST_USERS.disabled)
    adminTenant = await findTenant(payload, DEFAULT_TENANT_SLUG)
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    editorProfile = await findProfile(payload, TEST_PROFILES.editor, tenantA.id)
    viewerProfile = await findProfile(payload, TEST_PROFILES.viewer, tenantA.id)
  })

  describe('self', () => {
    it.each(ESCALATION_FIELDS)('refuses an editor setting their own %s', async (field) => {
      // arrange
      const editor = await createEditor()
      const data = ESCALATIONS[field](editor)

      // act / assert
      await expect(updateSelf(editor, data)).rejects.toMatchObject({ status: 403 })
    })

    it('refuses duplicate tenant rows', async () => {
      // arrange
      const editor = await createEditor()
      const rows = [
        ...(editor.tenants ?? []).map((row) => ({
          tenant: extractTenantId(row.tenant) ?? tenantA.id,
          access: accessIdOf(row.access),
        })),
        { tenant: tenantA.id, access: viewerProfile.id },
      ]

      // act / assert
      await expect(updateSelf(editor, { tenants: rows })).rejects.toMatchObject({ status: 403 })
    })

    it('leaves the editor not a super user after the refusals', async () => {
      // arrange
      const editor = await createEditor()
      await expect(updateSelf(editor, { super_user: true })).rejects.toMatchObject({ status: 403 })

      // act
      const after = await loadUser(payload, editor.email)

      // assert
      expect(after.super_user).not.toBe(true)
    })

    it('leaves the profile and email unchanged after the refusals', async () => {
      // arrange
      const editor = await createEditor()
      await expect(updateSelf(editor, { tenants: escalatedTenants(editor) })).rejects.toMatchObject(
        { status: 403 },
      )
      await expect(
        updateSelf(editor, { email: `${uniqueName('field-access-renamed')}@example.test` }),
      ).rejects.toMatchObject({ status: 403 })

      // act
      const after = await loadUser(payload, editor.email)

      // assert
      const rowPairs = (u: SessionUser): string[] =>
        (u.tenants ?? [])
          .map((r) => `${String(extractTenantId(r.tenant))}:${String(accessIdOf(r.access))}`)
          .sort()
      expect(rowPairs(after)).toEqual(rowPairs(editor))
      expect(after.email).toBe(editor.email)
    })

    it('lets an editor change their own name', async () => {
      // arrange
      const editor = await createEditor()

      // act / assert
      await expect(updateSelf(editor, { name: 'Editor Renamed' })).resolves.toBeDefined()
    })

    it('accepts a save that resends unchanged sensitive fields', async () => {
      // arrange
      const editor = await createEditor()

      // act / assert
      await expect(
        updateSelf(editor, {
          name: 'Editor User',
          email: ` ${editor.email.toUpperCase()} `,
          super_user: false,
          is_disabled: null,
          tenants: editor.tenants,
        }),
      ).resolves.toBeDefined()
    })

    it('keeps the tenant rows after own saves', async () => {
      // arrange
      const editor = await createEditor()
      const beforeTenants = (editor.tenants ?? []).map((row) => extractTenantId(row.tenant))
      await updateSelf(editor, { name: 'Editor Renamed' })
      await updateSelf(editor, {
        name: 'Editor User',
        email: ` ${editor.email.toUpperCase()} `,
        super_user: false,
        is_disabled: null,
        tenants: editor.tenants,
      })

      // act
      const after = await loadUser(payload, editor.email)
      const afterTenants = (after.tenants ?? []).map((row) => extractTenantId(row.tenant))

      // assert
      expect(beforeTenants.length).toBeGreaterThan(0)
      expect(afterTenants).toEqual(beforeTenants)
    })

    it('lets an editor change their own password', async () => {
      // arrange
      const editor = await createEditor()

      // act / assert
      await expect(updateSelf(editor, { password: `${editor.email}-new` })).resolves.toBeDefined()
    })

    it('logs in with the new password', async () => {
      // arrange
      const editor = await createEditor()
      const newPassword = `${editor.email}-new`
      await updateSelf(editor, { password: newPassword })

      // act / assert
      expect(await canLogin(editor.email, newPassword)).toBe(true)
    })
  })

  describe('other users', () => {
    it("refuses the editor changing the viewer's name", async () => {
      // act / assert
      await expect(
        payload.update({
          collection: 'users',
          id: viewer.id,
          data: { name: 'hacked' },
          user: member,
          overrideAccess: false,
        }),
      ).rejects.toMatchObject({ status: expect.toBeOneOf([403, 404]) })
    })

    it('refuses the editor making the viewer a super user', async () => {
      // act / assert
      await expect(
        payload.update({
          collection: 'users',
          id: viewer.id,
          data: { super_user: true },
          user: member,
          overrideAccess: false,
        }),
      ).rejects.toMatchObject({ status: expect.toBeOneOf([403, 404]) })
    })

    it('leaves the viewer not a super user', async () => {
      // arrange
      await expect(
        payload.update({
          collection: 'users',
          id: viewer.id,
          data: { super_user: true },
          user: member,
          overrideAccess: false,
        }),
      ).rejects.toMatchObject({ status: expect.toBeOneOf([403, 404]) })

      // act
      const after = await loadUser(payload, TEST_USERS.viewer)

      // assert
      expect(after.super_user).not.toBe(true)
    })

    it('refuses a bulk update by the editor', async () => {
      // arrange
      const editor = await createEditor()

      // act / assert
      await expect(
        payload.update({
          collection: 'users',
          where: { id: { equals: editor.id } },
          data: { name: 'bulk' },
          user: editor,
          overrideAccess: false,
        }),
      ).rejects.toMatchObject({ status: 403 })
    })

    it('shows the editor themselves, no super users', async () => {
      // act
      const { docs } = await payload.find({
        collection: 'users',
        user: member,
        overrideAccess: false,
        depth: 0,
        pagination: false,
      })

      // assert
      expect(docs.some((u) => u.id === member.id)).toBe(true)
      expect(docs.some((u) => u.super_user === true)).toBe(false)
    })

    it('hides is_disabled from the editor', async () => {
      // act
      const { docs } = await payload.find({
        collection: 'users',
        user: member,
        overrideAccess: false,
        depth: 0,
        pagination: false,
      })

      // assert
      expect(docs.length).toBeGreaterThan(0)
      expect(docs.every((u) => !('is_disabled' in u))).toBe(true)
    })

    it('refuses the editor creating users', async () => {
      // arrange
      const email = `${uniqueName('field-access')}@example.test`

      // act / assert
      await expect(
        payload.create({
          collection: 'users',
          data: { email, password: email },
          user: member,
          overrideAccess: false,
        }),
      ).rejects.toMatchObject({ status: 403 })
    })

    it('refuses the editor deleting the viewer', async () => {
      // act / assert
      await expect(
        payload.delete({
          collection: 'users',
          id: viewer.id,
          user: member,
          overrideAccess: false,
        }),
      ).rejects.toMatchObject({ status: expect.toBeOneOf([403, 404]) })
    })
  })

  describe('disabled users', () => {
    let disabledEmail: string
    let oldSession: SessionUser | null

    beforeAll(async () => {
      disabledEmail = `${uniqueName('field-access-disabled')}@example.test`
      const created = await payload.create({
        collection: 'users',
        data: { email: disabledEmail, password: disabledEmail, name: 'verify' },
        user: superUser,
        overrideAccess: false,
      })
      const { token } = await payload.login({
        collection: 'users',
        data: { email: disabledEmail, password: disabledEmail },
      })
      await payload.update({
        collection: 'users',
        id: created.id,
        data: { is_disabled: true },
        user: superUser,
        overrideAccess: false,
      })
      const { user: sessionUser } = await payload.auth({
        headers: new Headers({ Authorization: `JWT ${token}` }),
      })
      oldSession = sessionUser ? asSessionUser(sessionUser) : null
    })

    it('seeds disabled as disabled', () => {
      // assert
      expect(disabled.is_disabled).toBe(true)
    })

    it('refuses the seeded disabled user logging in', async () => {
      // act / assert
      expect(await canLogin(disabled.email, disabled.email)).toBe(false)
    })

    it('gives an old token no /admin', async () => {
      // arrange
      const req = await reqFor(payload, oldSession)

      // act / assert
      expect(oldSession).not.toBeNull()
      expect(adminAccess({ req })).toBe(false)
    })

    it('refuses an old token reading users', async () => {
      // act / assert
      expect(oldSession).not.toBeNull()
      await expect(
        payload.find({
          collection: 'users',
          user: oldSession ?? undefined,
          overrideAccess: false,
        }),
      ).rejects.toMatchObject({ status: 403 })
    })

    it('refuses logging in after disabling', async () => {
      // act / assert
      expect(await canLogin(disabledEmail, disabledEmail)).toBe(false)
    })

    it('denies a disabled super user', async () => {
      // arrange
      const email = `${uniqueName('field-access-super')}@example.test`
      const created = await payload.create({
        collection: 'users',
        data: {
          email,
          password: email,
          super_user: true,
          tenants: [{ tenant: adminTenant.id }],
        },
        user: superUser,
        overrideAccess: false,
      })
      const disabledSuper: SessionUser = {
        ...asSessionUser(created),
        is_disabled: true,
      }
      const req = await reqFor(payload, disabledSuper)

      // act / assert
      expect(hasAccess(req, 'pages', 'update')).toBe(false)
    })
  })

  it('gives the default profile when super_user is unticked on a user without one', async () => {
    // arrange
    const email = `${uniqueName('field-access-untick')}@example.test`
    const created = await payload.create({
      collection: 'users',
      data: {
        email,
        password: email,
        super_user: true,
        tenants: [{ tenant: adminTenant.id }],
      },
      user: superUser,
      overrideAccess: false,
    })

    // act
    await payload.update({
      collection: 'users',
      id: created.id,
      data: { super_user: false },
      user: superUser,
      overrideAccess: false,
    })
    const unticked = await loadUser(payload, email)

    // assert
    expect(profileSlugOn(unticked, adminTenant.id)).toBe(DEFAULT_ACCESS_SLUG)
  })

  describe('the last super user', () => {
    const rollback = async (req: PayloadRequest): Promise<void> => {
      if (!req.transactionID) return
      await payload.db.rollbackTransaction(req.transactionID)
      req.transactionID = undefined
    }

    // a transaction (rolled back when the test finishes) in which the seeded one is the last
    const beginAsLastSuperUser = async (): Promise<PayloadRequest> => {
      const req = await createLocalReq({}, payload)
      req.transactionID = (await payload.db.beginTransaction()) ?? undefined
      onTestFinished(() => rollback(req))
      await payload.update({
        collection: 'users',
        where: {
          and: [{ super_user: { equals: true } }, { id: { not_equals: superUser.id } }],
        },
        data: { super_user: false },
        req,
      })
      return req
    }

    it('cannot untick themselves', async () => {
      // arrange
      const req = await beginAsLastSuperUser()

      // act / assert
      await expect(
        payload.update({
          collection: 'users',
          id: superUser.id,
          data: { super_user: false },
          user: superUser,
          overrideAccess: false,
          req,
        }),
      ).rejects.toMatchObject({ status: 400 })
    })

    it('cannot disable themselves', async () => {
      // arrange
      const req = await beginAsLastSuperUser()

      // act / assert
      await expect(
        payload.update({
          collection: 'users',
          id: superUser.id,
          data: { is_disabled: true },
          user: superUser,
          overrideAccess: false,
          req,
        }),
      ).rejects.toMatchObject({ status: 400 })
    })

    it('cannot be deleted', async () => {
      // arrange
      const req = await beginAsLastSuperUser()

      // act / assert
      await expect(
        payload.delete({
          collection: 'users',
          id: superUser.id,
          user: superUser,
          overrideAccess: false,
          req,
        }),
      ).rejects.toMatchObject({ status: 400 })
    })

    it('is still a super user after the rollback', async () => {
      // arrange
      const req = await beginAsLastSuperUser()
      await rollback(req)

      // act
      const current = await loadUser(payload, TEST_USERS.superUser)

      // assert
      expect(current.super_user).toBe(true)
    })
  })

  describe('password reset', () => {
    it('resets the password of a non-super user', async () => {
      // arrange
      const email = `${uniqueName('field-access-reset')}@example.test`
      await payload.create({
        collection: 'users',
        data: { email, password: email },
        user: superUser,
        overrideAccess: false,
      })
      const token = await payload.forgotPassword({
        collection: 'users',
        data: { email },
        disableEmail: true,
      })

      // act / assert
      await expect(
        payload.resetPassword({
          collection: 'users',
          data: { token: String(token), password: `${email}-new` },
          // the REST endpoint leaves overrideAccess unset, which the read-back after the reset
          // treats as true; with false it would be refused (no req.user yet)
          overrideAccess: true,
        }),
      ).resolves.toBeDefined()
    })

    it('logs in with the new password', async () => {
      // arrange
      const email = `${uniqueName('field-access-reset')}@example.test`
      const newPassword = `${email}-new`
      await payload.create({
        collection: 'users',
        data: { email, password: email },
        user: superUser,
        overrideAccess: false,
      })
      const token = await payload.forgotPassword({
        collection: 'users',
        data: { email },
        disableEmail: true,
      })
      await payload.resetPassword({
        collection: 'users',
        data: { token: String(token), password: newPassword },
        // the REST endpoint leaves overrideAccess unset, which the read-back after the reset
        // treats as true; with false it would be refused (no req.user yet)
        overrideAccess: true,
      })

      // act / assert
      expect(await canLogin(email, newPassword)).toBe(true)
    })
  })
})
