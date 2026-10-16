// Collection access comes from the profile on the user's tenant row, for the default profile,
// an editor (member) and a viewer, all in test-a.
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { DEFAULT_ACCESS_SLUG } from '@/collections/UsersAccess/utils/defaultProfile'
import { adminAccess, hiddenResolver } from '@/common/utils/access'
import type { Header, Page, Tenant } from '@/payload-types'

import { profileSlugOn } from '../common/access'
import { getTestPayload } from '../common/payload'
import { TEST_PROFILES, TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { asSessionUser, loadUser, reqFor, type SessionUser } from '../common/users'
import { context, createDraftPage, draftPageData } from './pages'

// the three members the table checks run for, by TEST_USERS key (tests/common/seed)
const MEMBERS = ['defaultProfile', 'member', 'viewer'] as const
type MemberRole = (typeof MEMBERS)[number]

describe('profile access', () => {
  let payload: Payload
  let superUser: SessionUser
  let defaultProfile: SessionUser
  let member: SessionUser
  let viewer: SessionUser
  let users: Record<MemberRole, SessionUser>
  let tenantA: Tenant

  beforeAll(async () => {
    payload = await getTestPayload()
    superUser = await loadUser(payload, TEST_USERS.superUser)
    defaultProfile = await loadUser(payload, TEST_USERS.defaultProfile)
    member = await loadUser(payload, TEST_USERS.member)
    viewer = await loadUser(payload, TEST_USERS.viewer)
    users = { defaultProfile, member, viewer }
    tenantA = await findTenant(payload, TEST_TENANTS.a)
  })

  describe('seed', () => {
    it('gives defaultProfile the default profile', () => {
      // assert
      expect(profileSlugOn(defaultProfile, tenantA.id)).toBe(DEFAULT_ACCESS_SLUG)
    })

    it('gives member the editor profile', () => {
      // assert
      expect(profileSlugOn(member, tenantA.id)).toBe(TEST_PROFILES.editor)
    })

    it('gives viewer the viewer profile', () => {
      // assert
      expect(profileSlugOn(viewer, tenantA.id)).toBe(TEST_PROFILES.viewer)
    })
  })

  describe('/admin', () => {
    it.each(MEMBERS)('lets %s open /admin', async (role) => {
      // arrange
      const req = await reqFor(payload, users[role])

      // act / assert
      expect(adminAccess({ req })).toBe(true)
    })

    it('lets the super user open /admin', async () => {
      // arrange
      const req = await reqFor(payload, superUser)

      // act / assert
      expect(adminAccess({ req })).toBe(true)
    })

    it('refuses a user whose rows have no profile', async () => {
      // arrange
      const noProfile: SessionUser = {
        ...viewer,
        tenants: (viewer.tenants ?? []).map((row) => ({ ...row, access: null })),
      }
      const req = await reqFor(payload, noProfile)

      // act / assert
      expect(adminAccess({ req })).toBe(false)
    })
  })

  describe('nav', () => {
    it.each(['pages', 'header'] as const)('shows the editor %s', (slug) => {
      // act / assert
      expect(hiddenResolver(slug)({ user: member })).toBe(false)
    })

    it.each(['users-access', 'tenants', 'users'] as const)('hides %s from the editor', (slug) => {
      // act / assert
      expect(hiddenResolver(slug)({ user: member })).toBe(true)
    })

    it('shows the viewer pages', () => {
      // act / assert
      expect(hiddenResolver('pages')({ user: viewer })).toBe(false)
    })

    it.each(['pages', 'media', 'users', 'users-access', 'tenants'] as const)(
      'hides %s from the default profile',
      (slug) => {
        // act / assert
        expect(hiddenResolver(slug)({ user: defaultProfile })).toBe(true)
      },
    )

    it('shows the super user users-access', () => {
      // act / assert
      expect(hiddenResolver('users-access')({ user: superUser })).toBe(false)
    })

    it.each(['forms', 'form-submissions', 'redirects', 'search'] as const)(
      'hides plugin collection %s from the editor',
      (slug) => {
        // act / assert
        expect(hiddenResolver(slug)({ user: member })).toBe(true)
      },
    )
  })

  describe('plugin collections', () => {
    it.each(MEMBERS)('refuses %s reading form-submissions', async (role) => {
      // act / assert
      await expect(
        payload.find({
          collection: 'form-submissions',
          user: users[role],
          overrideAccess: false,
        }),
      ).rejects.toMatchObject({ status: 403 })
    })

    it.each(MEMBERS)('refuses %s creating forms', async (role) => {
      // act / assert
      await expect(
        payload.create({
          collection: 'forms',
          data: { title: uniqueName('form'), fields: [] },
          user: users[role],
          overrideAccess: false,
        }),
      ).rejects.toMatchObject({ status: 403 })
    })

    it('lets anonymous read forms', async () => {
      // act / assert
      await expect(
        payload.find({
          collection: 'forms',
          overrideAccess: false,
        }),
      ).resolves.toBeDefined()
    })

    it('lets anonymous read redirects', async () => {
      // act / assert
      await expect(
        payload.find({
          collection: 'redirects',
          overrideAccess: false,
        }),
      ).resolves.toBeDefined()
    })
  })

  describe('pages', () => {
    let draft: Page

    beforeAll(async () => {
      draft = await createDraftPage(payload, tenantA.id, 'profile-access')
    })

    it('refuses the viewer creating a page', async () => {
      // act / assert
      await expect(
        payload.create({
          collection: 'pages',
          draft: true,
          data: draftPageData(tenantA.id, uniqueName('profile-access')),
          user: viewer,
          overrideAccess: false,
          context,
        }),
      ).rejects.toMatchObject({ status: 403 })
    })

    it('refuses the default profile creating a page', async () => {
      // act / assert
      await expect(
        payload.create({
          collection: 'pages',
          draft: true,
          data: draftPageData(tenantA.id, uniqueName('profile-access')),
          user: defaultProfile,
          overrideAccess: false,
          context,
        }),
      ).rejects.toMatchObject({ status: 403 })
    })

    it('lets the editor create a page', async () => {
      // act
      const page = await payload.create({
        collection: 'pages',
        draft: true,
        data: draftPageData(tenantA.id, uniqueName('profile-access')),
        user: member,
        overrideAccess: false,
        context,
      })

      // assert
      expect(page.id).toBeDefined()
    })

    it('shows the editor the draft', async () => {
      // act
      const { docs } = await payload.find({
        collection: 'pages',
        where: { id: { equals: draft.id } },
        draft: true,
        depth: 0,
        user: member,
        overrideAccess: false,
      })

      // assert
      expect(docs).toHaveLength(1)
    })

    it('shows the viewer the draft', async () => {
      // act
      const { docs } = await payload.find({
        collection: 'pages',
        where: { id: { equals: draft.id } },
        draft: true,
        depth: 0,
        user: viewer,
        overrideAccess: false,
      })

      // assert
      expect(docs).toHaveLength(1)
    })

    it('hides the draft from the default profile', async () => {
      // act
      const { docs } = await payload.find({
        collection: 'pages',
        where: { id: { equals: draft.id } },
        draft: true,
        depth: 0,
        user: defaultProfile,
        overrideAccess: false,
      })

      // assert
      expect(docs).toHaveLength(0)
    })

    it('hides the draft from anonymous', async () => {
      // act
      const { docs } = await payload.find({
        collection: 'pages',
        where: { id: { equals: draft.id } },
        draft: true,
        depth: 0,
        overrideAccess: false,
      })

      // assert
      expect(docs).toHaveLength(0)
    })

    it('refuses the viewer updating a page', async () => {
      // arrange
      const page = await createDraftPage(payload, tenantA.id, 'profile-access')

      // act / assert
      await expect(
        payload.update({
          collection: 'pages',
          draft: true,
          id: page.id,
          data: { title: 'viewer edit' },
          user: viewer,
          overrideAccess: false,
          context,
        }),
      ).rejects.toMatchObject({ status: 403 })
    })

    it('lets the editor update a page', async () => {
      // arrange
      const page = await createDraftPage(payload, tenantA.id, 'profile-access')

      // act / assert
      await expect(
        payload.update({
          collection: 'pages',
          draft: true,
          id: page.id,
          data: { title: 'editor edit' },
          user: member,
          overrideAccess: false,
          context,
        }),
      ).resolves.toBeDefined()
    })

    it('refuses the viewer deleting a page', async () => {
      // arrange
      const page = await createDraftPage(payload, tenantA.id, 'profile-access')

      // act / assert
      await expect(
        payload.delete({
          collection: 'pages',
          id: page.id,
          user: viewer,
          overrideAccess: false,
          context,
        }),
      ).rejects.toMatchObject({ status: 403 })
    })

    it('lets the editor delete a page', async () => {
      // arrange
      const page = await createDraftPage(payload, tenantA.id, 'profile-access')

      // act / assert
      await expect(
        payload.delete({
          collection: 'pages',
          id: page.id,
          user: member,
          overrideAccess: false,
          context,
        }),
      ).resolves.toBeDefined()
    })
  })

  describe('header', () => {
    let header: Header

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
      header = docs[0]
    })

    it('lets the editor update it', async () => {
      // act / assert
      await expect(
        payload.update({
          collection: 'header',
          id: header.id,
          data: {},
          user: member,
          overrideAccess: false,
          context,
        }),
      ).resolves.toBeDefined()
    })

    it('refuses the viewer updating it', async () => {
      // act / assert
      await expect(
        payload.update({
          collection: 'header',
          id: header.id,
          data: {},
          user: viewer,
          overrideAccess: false,
          context,
        }),
      ).rejects.toMatchObject({ status: 403 })
    })

    it('refuses the default profile updating it', async () => {
      // act / assert
      await expect(
        payload.update({
          collection: 'header',
          id: header.id,
          data: {},
          user: defaultProfile,
          overrideAccess: false,
          context,
        }),
      ).rejects.toMatchObject({ status: 403 })
    })
  })

  describe('collections without a row in the profile', () => {
    it.each(MEMBERS)('refuses %s reading analytics', async (role) => {
      // act / assert
      await expect(
        payload.find({
          collection: 'analytics',
          user: users[role],
          overrideAccess: false,
        }),
      ).rejects.toMatchObject({ status: 403 })
    })

    it.each(MEMBERS)('refuses %s reading users-access', async (role) => {
      // act / assert
      await expect(
        payload.find({
          collection: 'users-access',
          user: users[role],
          overrideAccess: false,
        }),
      ).rejects.toMatchObject({ status: 403 })
    })
  })

  describe('users', () => {
    it.each(['defaultProfile', 'viewer'] as const)(
      'shows %s themselves and colleagues, no super users',
      async (role) => {
        // arrange
        const user = users[role]

        // act
        const { docs } = await payload.find({
          collection: 'users',
          user,
          overrideAccess: false,
          depth: 0,
        })

        // assert
        expect(docs.some((doc) => doc.id === user.id)).toBe(true)
        expect(docs.some((doc) => doc.super_user === true)).toBe(false)
      },
    )

    it('refuses the editor creating users', async () => {
      // arrange
      const email = `${uniqueName('profile-user')}@example.test`

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

    it('gives a new user the default profile', async () => {
      // arrange
      const email = `${uniqueName('profile-user')}@example.test`

      // act
      const created = await payload.create({
        collection: 'users',
        data: {
          email,
          password: email,
          tenants: [{ tenant: tenantA.id }],
        },
        user: superUser,
        overrideAccess: false,
        depth: 2,
      })

      // assert
      expect(profileSlugOn(asSessionUser(created), tenantA.id)).toBe(DEFAULT_ACCESS_SLUG)
    })
  })
})
