// Hidden documents: a test-a page with "Hide from other members" ticked is only read, updated and
// deleted in the admin by its creator, the users in "Visible to", tenant admins and super users;
// the public site still gets it once published. Roles: the creator is templateEditor, the listed
// member is member, another editor is multiTenant (editor in test-a, not listed), the tenant
// admin is tenantAdmin, otherViewer is in test-b only.
import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it, onTestFinished } from 'vitest'

import { DEFAULT_TENANT_SLUG } from '@/common/utils/defaultTenant'
import { extractTenantId } from '@/common/utils/tenantCollections'
import type { Header, Page, Tenant, User } from '@/payload-types'

import { contentLayout, richText } from '../common/content'
import { getTestPayload } from '../common/payload'
import { TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { loadUser, type SessionUser } from '../common/users'
import { context } from './pages'

type RoleKey =
  | 'superUser'
  | 'templateEditor'
  | 'member'
  | 'multiTenant'
  | 'tenantAdmin'
  | 'otherViewer'

const ids = (value: unknown): number[] =>
  Array.isArray(value)
    ? value.map((v) => extractTenantId(v)).filter((v): v is number => v !== null)
    : []

describe('hidden documents', () => {
  let payload: Payload
  let superUser: SessionUser
  let templateEditor: SessionUser
  let member: SessionUser
  let multiTenant: SessionUser
  let tenantAdmin: SessionUser
  let otherViewer: SessionUser
  let tenantA: Tenant
  let users: Record<RoleKey, SessionUser>

  const createPage = (
    actor: SessionUser,
    data: Partial<Pick<Page, 'isHidden' | 'visibleTo' | '_status'>>,
  ): Promise<Page> => {
    const slug = uniqueName('hidden')
    return payload.create({
      collection: 'pages',
      data: {
        title: slug,
        slug,
        tenant: tenantA.id,
        hero: { main: { type: 'none' } },
        layout: contentLayout(richText(slug)),
        ...data,
      },
      draft: data._status !== 'published',
      user: actor,
      overrideAccess: false,
      context,
    })
  }

  const createHidden = (): Promise<Page> =>
    createPage(templateEditor, { isHidden: true, visibleTo: [member.id] })

  const findsIt = async (actor: SessionUser | null, id: number): Promise<boolean> => {
    const { docs } = await payload.find({
      collection: 'pages',
      where: { id: { equals: id } },
      depth: 0,
      ...(actor ? { user: actor } : {}),
      overrideAccess: false,
    })
    return docs.length === 1
  }

  const updateAs = (actor: SessionUser, id: number, data: Partial<Page>, draft = true) =>
    payload.update({
      collection: 'pages',
      id,
      data,
      draft,
      user: actor,
      overrideAccess: false,
      context,
    })

  const versionsAs = async (actor: SessionUser, id: number) =>
    (
      await payload.findVersions({
        collection: 'pages',
        where: { parent: { equals: id } },
        depth: 0,
        user: actor,
        overrideAccess: false,
      })
    ).docs

  const stored = (id: number) =>
    payload.findByID({ collection: 'pages', id, depth: 0, draft: true })

  beforeAll(async () => {
    payload = await getTestPayload()
    superUser = await loadUser(payload, TEST_USERS.superUser)
    templateEditor = await loadUser(payload, TEST_USERS.templateEditor)
    member = await loadUser(payload, TEST_USERS.member)
    multiTenant = await loadUser(payload, TEST_USERS.multiTenant)
    tenantAdmin = await loadUser(payload, TEST_USERS.tenantAdmin)
    otherViewer = await loadUser(payload, TEST_USERS.otherViewer)
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    users = {
      superUser,
      templateEditor,
      member,
      multiTenant,
      tenantAdmin,
      otherViewer,
    }
  })

  describe('a hidden draft', () => {
    it('records templateEditor as the creator', async () => {
      // arrange / act
      const page = await createHidden()

      // assert
      expect(extractTenantId(page.createdBy)).toBe(templateEditor.id)
    })

    it.each([
      ['the creator', 'templateEditor'],
      ['a listed member', 'member'],
      ['the tenant admin', 'tenantAdmin'],
      ['the super user', 'superUser'],
    ] as const)('lets %s find it', async (_who, role) => {
      // arrange
      const page = await createHidden()

      // act
      const found = await findsIt(users[role], page.id)

      // assert
      expect(found).toBe(true)
    })

    it.each([
      ['another editor', 'multiTenant'],
      ['a test-b user', 'otherViewer'],
    ] as const)('hides it from %s', async (_who, role) => {
      // arrange
      const page = await createHidden()

      // act
      const found = await findsIt(users[role], page.id)

      // assert
      expect(found).toBe(false)
    })

    it('hides it from anonymous readers', async () => {
      // arrange
      const page = await createHidden()

      // act
      const found = await findsIt(null, page.id)

      // assert
      expect(found).toBe(false)
    })

    it('lets the listed member open it', async () => {
      // arrange
      const page = await createHidden()

      // act
      const doc = await payload.findByID({
        collection: 'pages',
        id: page.id,
        depth: 0,
        user: member,
        overrideAccess: false,
      })

      // assert
      expect(doc.id).toBe(page.id)
    })

    it('gives another editor a 404 when opening it', async () => {
      // arrange
      const page = await createHidden()

      // act / assert
      await expect(
        payload.findByID({
          collection: 'pages',
          id: page.id,
          depth: 0,
          user: multiTenant,
          overrideAccess: false,
        }),
      ).rejects.toMatchObject({ status: 404 })
    })
  })

  describe('editing', () => {
    it('lets the listed member edit the content', async () => {
      // arrange
      const page = await createHidden()

      // act
      const updated = await updateAs(member, page.id, { title: 'edited by member' })

      // assert
      expect(updated.id).toBe(page.id)
    })

    it('refuses another editor', async () => {
      // arrange
      const page = await createHidden()

      // act / assert
      await expect(updateAs(multiTenant, page.id, { title: 'x' })).rejects.toMatchObject({
        status: expect.toBeOneOf([403, 404]),
      })
    })

    it('lets the tenant admin edit it', async () => {
      // arrange
      const page = await createHidden()

      // act
      const updated = await updateAs(tenantAdmin, page.id, { title: 'edited by admin' })

      // assert
      expect(updated.id).toBe(page.id)
    })

    it('refuses another editor deleting it', async () => {
      // arrange
      const page = await createHidden()

      // act / assert
      await expect(
        payload.delete({
          collection: 'pages',
          id: page.id,
          user: multiTenant,
          overrideAccess: false,
          context,
        }),
      ).rejects.toMatchObject({ status: expect.toBeOneOf([403, 404]) })
    })

    it("skips it in another editor's bulk delete", async () => {
      // arrange
      const page = await createHidden()

      // act
      const result = await payload.delete({
        collection: 'pages',
        where: { slug: { equals: page.slug } },
        user: multiTenant,
        overrideAccess: false,
        context,
      })

      // assert
      expect(result.docs).toEqual([])
    })

    it('keeps the page after that bulk delete', async () => {
      // arrange
      const page = await createHidden()
      await payload.delete({
        collection: 'pages',
        where: { slug: { equals: page.slug } },
        user: multiTenant,
        overrideAccess: false,
        context,
      })

      // act
      const after = await stored(page.id)

      // assert
      expect(after.id).toBe(page.id)
    })
  })

  describe('versions', () => {
    it('shows another editor none', async () => {
      // arrange
      const page = await createHidden()

      // act
      const versions = await versionsAs(multiTenant, page.id)

      // assert
      expect(versions).toEqual([])
    })

    it('shows the listed member its versions', async () => {
      // arrange
      const page = await createHidden()

      // act
      const versions = await versionsAs(member, page.id)

      // assert
      expect(versions.length).toBeGreaterThan(0)
    })

    it('shows the tenant admin its versions', async () => {
      // arrange
      const page = await createHidden()

      // act
      const versions = await versionsAs(tenantAdmin, page.id)

      // assert
      expect(versions.length).toBeGreaterThan(0)
    })
  })

  describe('who sees it', () => {
    it('strips isHidden and visibleTo from the listed member', async () => {
      // arrange
      const page = await createHidden()

      // act
      await updateAs(member, page.id, {
        isHidden: false,
        visibleTo: [member.id, multiTenant.id],
      })
      const after = await stored(page.id)

      // assert
      expect(after.isHidden).toBe(true)
      expect(ids(after.visibleTo)).toEqual([member.id])
    })

    it('still hides it from another editor after that', async () => {
      // arrange
      const page = await createHidden()
      await updateAs(member, page.id, {
        isHidden: false,
        visibleTo: [member.id, multiTenant.id],
      })

      // act
      const found = await findsIt(multiTenant, page.id)

      // assert
      expect(found).toBe(false)
    })

    it('lets the creator add another editor', async () => {
      // arrange
      const page = await createHidden()

      // act
      const updated = await updateAs(templateEditor, page.id, {
        visibleTo: [member.id, multiTenant.id],
      })

      // assert
      expect(updated.id).toBe(page.id)
    })

    it('shows it to the added editor', async () => {
      // arrange
      const page = await createHidden()
      await updateAs(templateEditor, page.id, { visibleTo: [member.id, multiTenant.id] })

      // act
      const found = await findsIt(multiTenant, page.id)

      // assert
      expect(found).toBe(true)
    })

    it('hides it again once removed from the list', async () => {
      // arrange
      const page = await createHidden()
      await updateAs(templateEditor, page.id, { visibleTo: [member.id, multiTenant.id] })
      await updateAs(templateEditor, page.id, { visibleTo: [member.id] })

      // act
      const found = await findsIt(multiTenant, page.id)

      // assert
      expect(found).toBe(false)
    })
  })

  describe('the visible-to picker', () => {
    it('rejects a test-b user', async () => {
      // arrange
      const page = await createHidden()

      // act / assert
      await expect(
        updateAs(templateEditor, page.id, { visibleTo: [member.id, otherViewer.id] }),
      ).rejects.toMatchObject({
        status: 400,
        data: {
          errors: expect.arrayContaining([
            expect.objectContaining({
              message: expect.stringContaining("isn't a member of this business"),
            }),
          ]),
        },
      })
    })

    it('rejects a super user', async () => {
      // arrange
      const page = await createHidden()

      // act / assert
      await expect(
        updateAs(templateEditor, page.id, { visibleTo: [superUser.id] }),
      ).rejects.toMatchObject({
        status: 400,
        data: {
          errors: expect.arrayContaining([
            expect.objectContaining({
              message: expect.stringContaining("isn't a member of this business"),
            }),
          ]),
        },
      })
    })
  })

  describe('turning hidden off and on', () => {
    it('shows it to another editor when off', async () => {
      // arrange
      const page = await createHidden()
      await updateAs(templateEditor, page.id, { isHidden: false })

      // act
      const found = await findsIt(multiTenant, page.id)

      // assert
      expect(found).toBe(true)
    })

    it('keeps the list when off', async () => {
      // arrange
      const page = await createHidden()
      await updateAs(templateEditor, page.id, { isHidden: false })

      // act
      const after = await stored(page.id)

      // assert
      expect(ids(after.visibleTo)).toEqual([member.id])
    })

    it('hides it from another editor when on again', async () => {
      // arrange
      const page = await createHidden()
      await updateAs(templateEditor, page.id, { isHidden: false })
      await updateAs(templateEditor, page.id, { isHidden: true })

      // act
      const found = await findsIt(multiTenant, page.id)

      // assert
      expect(found).toBe(false)
    })

    it('still shows it to the listed member', async () => {
      // arrange
      const page = await createHidden()
      await updateAs(templateEditor, page.id, { isHidden: false })
      await updateAs(templateEditor, page.id, { isHidden: true })

      // act
      const found = await findsIt(member, page.id)

      // assert
      expect(found).toBe(true)
    })
  })

  describe('who hides a page', () => {
    it("refuses another editor hiding the creator's page", async () => {
      // arrange
      const page = await createPage(templateEditor, {})

      // act
      await updateAs(multiTenant, page.id, { isHidden: true })
      const after = await stored(page.id)

      // assert
      expect(after.isHidden).not.toBe(true)
    })

    it('lets the tenant admin hide it', async () => {
      // arrange
      const page = await createPage(templateEditor, {})

      // act
      const updated = await updateAs(tenantAdmin, page.id, { isHidden: true })
      const after = await stored(page.id)
      const found = await findsIt(multiTenant, page.id)

      // assert
      expect(updated.id).toBe(page.id)
      expect(after.isHidden).toBe(true)
      expect(found).toBe(false)
    })
  })

  describe('the public site', () => {
    it('gives anonymous readers a hidden published page', async () => {
      // arrange
      const page = await createPage(templateEditor, {
        isHidden: true,
        visibleTo: [member.id],
        _status: 'published',
      })

      // act
      const found = await findsIt(null, page.id)

      // assert
      expect(found).toBe(true)
    })

    it('still hides it from another editor in the admin', async () => {
      // arrange
      const page = await createPage(templateEditor, {
        isHidden: true,
        visibleTo: [member.id],
        _status: 'published',
      })

      // act
      const found = await findsIt(multiTenant, page.id)

      // assert
      expect(found).toBe(false)
    })
  })

  describe('hidden in a draft of a published page', () => {
    let page: Page

    beforeEach(async () => {
      page = await createPage(templateEditor, { _status: 'published' })
      await updateAs(templateEditor, page.id, { isHidden: true, title: 'secret draft' }, true)
    })

    it('hides it from another editor at once', async () => {
      // act
      const found = await findsIt(multiTenant, page.id)

      // assert
      expect(found).toBe(false)
    })

    it('shows another editor no versions', async () => {
      // act
      const versions = await versionsAs(multiTenant, page.id)

      // assert
      expect(versions).toEqual([])
    })

    it('refuses another editor deleting it', async () => {
      // act / assert
      await expect(
        payload.delete({
          collection: 'pages',
          id: page.id,
          user: multiTenant,
          overrideAccess: false,
          context,
        }),
      ).rejects.toMatchObject({ status: expect.toBeOneOf([403, 404]) })
    })

    it('still gives anonymous readers the published title and content', async () => {
      // act
      const { docs } = await payload.find({
        collection: 'pages',
        where: { id: { equals: page.id } },
        depth: 0,
        overrideAccess: false,
      })

      // assert
      expect(docs[0]?.title).toBe(page.slug)
      expect(docs[0]?.layout).toHaveLength(1)
    })

    it('gives the creator the hidden draft', async () => {
      // act
      const draft = await payload.findByID({
        collection: 'pages',
        id: page.id,
        draft: true,
        depth: 0,
        user: templateEditor,
        overrideAccess: false,
      })

      // assert
      expect(draft.title).toBe('secret draft')
    })

    it('shows it to another editor again once un-hidden in a draft', async () => {
      // arrange
      await updateAs(templateEditor, page.id, { isHidden: false }, true)

      // act
      const found = await findsIt(multiTenant, page.id)

      // assert
      expect(found).toBe(true)
    })
  })

  describe('colleagues', () => {
    let colleagues: User[]
    let memberAsSeen: User | undefined

    beforeAll(async () => {
      const result = await payload.find({
        collection: 'users',
        depth: 0,
        user: templateEditor,
        overrideAccess: false,
        pagination: false,
      })
      colleagues = result.docs
      memberAsSeen = colleagues.find((u) => u.id === member.id)
    })

    it("reads the listed member's name", () => {
      // assert
      expect(memberAsSeen?.name).toBe(member.name)
    })

    it("gets the member's email (shared business)", () => {
      // assert
      expect(memberAsSeen?.email).toBe(TEST_USERS.member)
    })

    it('gets no tenant rows', () => {
      // assert
      expect(memberAsSeen?.tenants ?? []).toEqual([])
    })

    it('does not get super users', () => {
      // assert
      expect(colleagues.map((u) => u.id)).not.toContain(superUser.id)
    })

    it('does not get test-b-only users', () => {
      // assert
      expect(colleagues.map((u) => u.id)).not.toContain(otherViewer.id)
    })

    it('still reads their own email', async () => {
      // act
      const self = await payload.findByID({
        collection: 'users',
        id: templateEditor.id,
        depth: 0,
        user: templateEditor,
        overrideAccess: false,
      })

      // assert
      expect(self.email).toBe(TEST_USERS.templateEditor)
    })
  })

  describe('createdBy', () => {
    // the author is a super user outside test-a (row on the admin tenant only): the seeded super
    //   user has a test-a row, which lets test-a's tenant admin read them
    let platformSuper: SessionUser
    let bySuper: Page

    const readAs = (actor: SessionUser) =>
      payload.findByID({
        collection: 'pages',
        id: bySuper.id,
        depth: 0,
        user: actor,
        overrideAccess: false,
      })

    beforeAll(async () => {
      const adminTenant = await findTenant(payload, DEFAULT_TENANT_SLUG)
      const email = `${uniqueName('hidden-super')}@example.test`
      await payload.create({
        collection: 'users',
        data: { email, password: email, super_user: true, tenants: [{ tenant: adminTenant.id }] },
        user: superUser,
        overrideAccess: false,
      })
      platformSuper = await loadUser(payload, email)
      bySuper = await createPage(platformSuper, {})
    })

    it("is empty for another editor on a super user's page", async () => {
      // act
      const doc = await readAs(multiTenant)

      // assert
      expect(doc.createdBy ?? null).toBeNull()
    })

    it("is empty for the tenant admin on a super user's page", async () => {
      // act
      const doc = await readAs(tenantAdmin)

      // assert
      expect(doc.createdBy ?? null).toBeNull()
    })

    it('is set for the super user on their own page', async () => {
      // act
      const doc = await readAs(platformSuper)

      // assert
      expect(extractTenantId(doc.createdBy)).toBe(platformSuper.id)
    })

    it("is set for the listed member on a colleague's page", async () => {
      // arrange
      const page = await createHidden()

      // act
      const doc = await payload.findByID({
        collection: 'pages',
        id: page.id,
        depth: 0,
        user: member,
        overrideAccess: false,
      })

      // assert
      expect(extractTenantId(doc.createdBy)).toBe(templateEditor.id)
    })

    it('leaves the stored value untouched', async () => {
      // act
      const doc = await stored(bySuper.id)

      // assert
      expect(extractTenantId(doc.createdBy)).toBe(platformSuper.id)
    })
  })

  describe('the test-a header', () => {
    let headerA: Header

    const restoreHeader = async () => {
      await payload.update({
        collection: 'header',
        id: headerA.id,
        data: { isHidden: false, visibleTo: [] },
        overrideAccess: true,
        context,
      })
    }

    const hideAsAdmin = () =>
      payload.update({
        collection: 'header',
        id: headerA.id,
        data: { isHidden: true, visibleTo: [] },
        user: tenantAdmin,
        overrideAccess: false,
        context,
      })

    const findsHeader = async (actor: SessionUser | null): Promise<boolean> => {
      const { docs } = await payload.find({
        collection: 'header',
        where: { id: { equals: headerA.id } },
        depth: 0,
        ...(actor ? { user: actor } : {}),
        overrideAccess: false,
      })
      return docs.length === 1
    }

    beforeAll(async () => {
      const { docs } = await payload.find({
        collection: 'header',
        where: { tenant: { equals: tenantA.id } },
        limit: 1,
        depth: 0,
      })
      if (!docs[0]) {
        throw new Error(`tests: no header doc in tenant ${tenantA.slug}`)
      }
      headerA = docs[0]
    })

    it('refuses a member hiding it', async () => {
      // arrange
      onTestFinished(restoreHeader)

      // act
      await payload.update({
        collection: 'header',
        id: headerA.id,
        data: { isHidden: true },
        user: member,
        overrideAccess: false,
        context,
      })
      const after = await payload.findByID({
        collection: 'header',
        id: headerA.id,
        depth: 0,
      })

      // assert
      expect(after.isHidden).not.toBe(true)
    })

    it('lets the tenant admin hide it', async () => {
      // arrange
      onTestFinished(restoreHeader)

      // act
      const updated = await hideAsAdmin()

      // assert
      expect(updated.id).toBe(headerA.id)
    })

    it('hides it from a member', async () => {
      // arrange
      onTestFinished(restoreHeader)
      await hideAsAdmin()

      // act
      const found = await findsHeader(member)

      // assert
      expect(found).toBe(false)
    })

    it('refuses a member updating it', async () => {
      // arrange
      onTestFinished(restoreHeader)
      await hideAsAdmin()

      // act / assert
      await expect(
        payload.update({
          collection: 'header',
          id: headerA.id,
          data: { navItems: [] },
          user: member,
          overrideAccess: false,
          context,
        }),
      ).rejects.toMatchObject({ status: expect.toBeOneOf([403, 404]) })
    })

    it('still shows it to the tenant admin', async () => {
      // arrange
      onTestFinished(restoreHeader)
      await hideAsAdmin()

      // act
      const found = await findsHeader(tenantAdmin)

      // assert
      expect(found).toBe(true)
    })

    it('still gives it to anonymous readers (public site)', async () => {
      // arrange
      onTestFinished(restoreHeader)
      await hideAsAdmin()

      // act
      const found = await findsHeader(null)

      // assert
      expect(found).toBe(true)
    })
  })
})
