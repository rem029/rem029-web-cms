// Who reads, sees and writes audit logs: super users read everything; everyone else (tenant admins
// included) only through their row's profile ticking audit-logs read, for that business; nobody
// creates or updates a row through the api; only super users delete. Only super users change a
// profile's audit-logs row.
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { extractTenantId as relationId } from '@/common/utils/tenantCollections'
import type { AuditLog, Tenant } from '@/payload-types'

import { context } from '../access-control/pages'
import { getTestPayload } from '../common/payload'
import { TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { loadUser, type SessionUser } from '../common/users'
import { pageData } from './rows'

const AUDIT_ROW_ALL = {
  slug: 'audit-logs' as const,
  hidden: false,
  read: true,
  create: true,
  update: true,
  delete: true,
  admin: true,
  access: true,
}

const ROW_DATA = {
  operation: 'create' as const,
  collectionSlug: 'pages',
  docId: 'audit-access-forged',
}

describe('audit-logs access', () => {
  let payload: Payload
  let superUser: SessionUser
  let tenantA: Tenant
  let tenantB: Tenant
  let tenantAdmin: SessionUser
  let logReaderAdmin: SessionUser

  const readAs = async (user: SessionUser | null): Promise<AuditLog[]> => {
    const { docs } = await payload.find({
      collection: 'audit-logs',
      pagination: false,
      depth: 0,
      overrideAccess: false,
      ...(user ? { user } : {}),
    })
    return docs
  }

  const makeLogReaderProfile = (prefix: string) => {
    const slug = uniqueName(prefix)
    return payload.create({
      collection: 'users-access',
      data: {
        name: `${slug} log reader`,
        slug,
        tenant: tenantA.id,
        access: [AUDIT_ROW_ALL],
      },
      user: superUser,
      overrideAccess: false,
      context,
    })
  }

  beforeAll(async () => {
    payload = await getTestPayload()
    superUser = await loadUser(payload, TEST_USERS.superUser)
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    tenantB = await findTenant(payload, TEST_TENANTS.b)
    tenantAdmin = await loadUser(payload, TEST_USERS.tenantAdmin)
    logReaderAdmin = await loadUser(payload, TEST_USERS.logReaderAdmin)
  })

  describe('read', () => {
    // one beforeAll: a page created in test-a by logReaderAdmin and one in test-b by owner, so each
    // business has rows; readers find with overrideAccess: false, pagination: false
    beforeAll(async () => {
      const owner = await loadUser(payload, TEST_USERS.owner)
      await payload.create({
        collection: 'pages',
        data: pageData(uniqueName('audit-read-a'), tenantA.id),
        user: logReaderAdmin,
        overrideAccess: false,
        context,
      })
      await payload.create({
        collection: 'pages',
        data: pageData(uniqueName('audit-read-b'), tenantB.id),
        user: owner,
        overrideAccess: false,
        context,
      })
    })

    it("ignores a tenant admin's profile outside audit-logs", async () => {
      // logReaderAdmin's profile ticks only audit-logs; as a tenant admin they still create pages
      // act: logReaderAdmin creates a page in test-a
      const page = await payload.create({
        collection: 'pages',
        data: pageData(uniqueName('audit-read-admin-page'), tenantA.id),
        user: logReaderAdmin,
        overrideAccess: false,
        context,
      })

      // assert: it succeeds
      expect(page.id).toBeDefined()
    })

    it('refuses anonymous readers', async () => {
      // act + assert: find with no user rejects with status 403
      await expect(readAs(null)).rejects.toMatchObject({ status: 403 })
    })

    it('refuses a member without audit-logs read', async () => {
      // act + assert: templateEditor (pages-editor) rejects with 403
      const templateEditor = await loadUser(payload, TEST_USERS.templateEditor)
      await expect(readAs(templateEditor)).rejects.toMatchObject({ status: 403 })
    })

    it('refuses a tenant admin by default', async () => {
      // act + assert: tenantAdmin (no profile) rejects with 403
      await expect(readAs(tenantAdmin)).rejects.toMatchObject({ status: 403 })
    })

    it("shows a log reader member only their business's rows", async () => {
      // act: logReader (log reader in test-b) reads
      const logReader = await loadUser(payload, TEST_USERS.logReader)
      const rows = await readAs(logReader)

      // assert: some rows, every row's tenant is test-b
      expect(rows.length).toBeGreaterThan(0)
      expect(rows.every((row) => relationId(row.tenant) === tenantB.id)).toBe(true)
    })

    it("shows a log reader tenant admin only their business's rows", async () => {
      // act: logReaderAdmin (tenant admin of test-a with the log reader profile) reads
      const rows = await readAs(logReaderAdmin)

      // assert: some rows, every row's tenant is test-a
      expect(rows.length).toBeGreaterThan(0)
      expect(rows.every((row) => relationId(row.tenant) === tenantA.id)).toBe(true)
    })

    it('shows the super user every business and rows with no tenant', async () => {
      // act: the super user reads
      const rows = await readAs(superUser)
      const seen = rows.map((row) => relationId(row.tenant))

      // assert: the row tenants include test-a, test-b and null
      expect(seen).toContain(tenantA.id)
      expect(seen).toContain(tenantB.id)
      expect(seen).toContain(null)
    })
  })

  describe('nav', () => {
    // admin.hidden of audit-logs called with { user }
    it.each([
      ['superUser', false],
      ['tenantAdmin', true],
      ['logReaderAdmin', false],
      ['logReader', false],
      ['templateEditor', true],
    ] as const)('hides Audit Logs from %s: %s', async (role, expected) => {
      // arrange: loadUser(TEST_USERS[role])
      const user = await loadUser(payload, TEST_USERS[role])
      const { hidden } = payload.collections['audit-logs'].config.admin

      // act: admin.hidden({ user })
      const isHidden = typeof hidden === 'function' ? hidden({ user }) : hidden === true

      // assert: equals hidden
      expect(isHidden).toBe(expected)
    })
  })

  describe('who grants audit-logs read', () => {
    // as tenantAdmin (test-a), overrideAccess: false; profiles the test creates (uniqueName)

    it("refuses a tenant admin's profile that reads audit-logs", async () => {
      // act: tenantAdmin creates a test-a profile with an audit-logs read + admin row
      const slug = uniqueName('audit-self-grant')
      const call = payload.create({
        collection: 'users-access',
        data: {
          name: `${slug} self grant`,
          slug,
          tenant: tenantA.id,
          access: [{ ...AUDIT_ROW_ALL, create: false, update: false, delete: false }],
        },
        user: tenantAdmin,
        overrideAccess: false,
      })

      // assert: rejects with status 400
      await expect(call).rejects.toMatchObject({ status: 400 })
    })

    it('refuses a tenant admin unticking audit-logs read', async () => {
      // arrange: a log reader profile in test-a made by the super user
      const profile = await makeLogReaderProfile('audit-untick')

      // act: tenantAdmin sets its audit-logs row's read to false
      const call = payload.update({
        collection: 'users-access',
        id: profile.id,
        data: { access: [{ ...AUDIT_ROW_ALL, read: false }] },
        user: tenantAdmin,
        overrideAccess: false,
      })

      // assert: rejects with status 400
      await expect(call).rejects.toMatchObject({ status: 400 })
    })

    it('lets a tenant admin edit the rest of such a profile', async () => {
      // arrange: a log reader profile in test-a made by the super user
      const profile = await makeLogReaderProfile('audit-edit-rest')

      // act: tenantAdmin renames it and adds a pages read row, audit-logs row unchanged
      const updated = await payload.update({
        collection: 'users-access',
        id: profile.id,
        data: {
          name: `${profile.name} renamed`,
          access: [AUDIT_ROW_ALL, { slug: 'pages', hidden: false, read: true }],
        },
        user: tenantAdmin,
        overrideAccess: false,
      })

      // assert: it succeeds
      expect(updated.id).toBe(profile.id)
    })

    it('lets a tenant admin create a profile without audit-logs access', async () => {
      // act: tenantAdmin creates a test-a profile with only a pages read row
      const slug = uniqueName('audit-plain')
      const created = await payload.create({
        collection: 'users-access',
        data: {
          name: `${slug} plain`,
          slug,
          tenant: tenantA.id,
          access: [{ slug: 'pages', hidden: false, read: true }],
        },
        user: tenantAdmin,
        overrideAccess: false,
      })

      // assert: it succeeds
      expect(created.id).toBeDefined()
    })
  })

  describe('write', () => {
    // one beforeAll: a row in test-a written directly (overrideAccess), so these don't depend on
    // the hooks
    let target: AuditLog

    beforeAll(async () => {
      target = await payload.create({
        collection: 'audit-logs',
        data: { ...ROW_DATA, tenant: tenantA.id },
      })
    })

    const writers = [
      'templateEditor',
      'logReader',
      'tenantAdmin',
      'logReaderAdmin',
      'superUser',
    ] as const

    it.each(writers)('refuses %s creating a row', async (role) => {
      // act + assert: create audit-logs as that user (overrideAccess: false) rejects with 403
      const user = await loadUser(payload, TEST_USERS[role])
      await expect(
        payload.create({
          collection: 'audit-logs',
          data: ROW_DATA,
          user,
          overrideAccess: false,
        }),
      ).rejects.toMatchObject({ status: 403 })
    })

    it.each(writers)('refuses %s updating a row', async (role) => {
      // act + assert: update the row's docId as that user rejects with 403
      const user = await loadUser(payload, TEST_USERS[role])
      await expect(
        payload.update({
          collection: 'audit-logs',
          id: target.id,
          data: { docId: 'audit-access-forged' },
          user,
          overrideAccess: false,
        }),
      ).rejects.toMatchObject({ status: 403 })
    })

    it.each(['logReader', 'tenantAdmin', 'logReaderAdmin'] as const)(
      'refuses %s deleting a row',
      async (role) => {
        // act + assert: delete the row as that user rejects with 403
        const user = await loadUser(payload, TEST_USERS[role])
        await expect(
          payload.delete({
            collection: 'audit-logs',
            id: target.id,
            user,
            overrideAccess: false,
          }),
        ).rejects.toMatchObject({ status: 403 })
      },
    )

    it('lets the super user delete a row', async () => {
      // arrange: a row of its own (overrideAccess), so the refusals above keep theirs
      const ownRow = await payload.create({
        collection: 'audit-logs',
        data: { ...ROW_DATA, tenant: tenantA.id },
      })

      // act: the super user deletes it (overrideAccess: false)
      const deleted = await payload.delete({
        collection: 'audit-logs',
        id: ownRow.id,
        user: superUser,
        overrideAccess: false,
      })

      // assert: it succeeds
      expect(deleted.id).toBe(ownRow.id)
    })
  })
})
