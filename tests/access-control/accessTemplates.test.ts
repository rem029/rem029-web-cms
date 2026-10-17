// Access templates: platform profiles with isTemplate on the admin tenant, assignable in any
// business and read-only for tenant admins. templateEditor has pages-editor in test-a; owner is
// tenant admin of test-a and test-b.
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { DEFAULT_ACCESS_SLUG } from '@/collections/UsersAccess/utils/defaultProfile'
import {
  PAGES_EDITOR_TEMPLATE,
  PAGES_VIEWER_TEMPLATE,
} from '@/collections/UsersAccess/utils/templates'
import { accessCheckResolver, adminAccess } from '@/common/utils/access'
import { DEFAULT_TENANT_SLUG } from '@/common/utils/defaultTenant'
import type { Header, Page, Tenant, UsersAccess } from '@/payload-types'

import { findProfile } from '../common/access'
import { contentLayout, richText } from '../common/content'
import { getTestPayload } from '../common/payload'
import { TEST_PROFILES, TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { loadUser, reqFor, type SessionUser } from '../common/users'
import { context } from './pages'

describe('access templates', () => {
  let payload: Payload
  let superUser: SessionUser
  let templateEditor: SessionUser
  let owner: SessionUser
  let tenantA: Tenant
  let tenantB: Tenant
  let adminTenant: Tenant
  let pagesEditor: UsersAccess
  let pagesViewer: UsersAccess
  let platformDefault: UsersAccess
  let editorA: UsersAccess
  let headerA: Header

  const createProfileInA = async (): Promise<UsersAccess> => {
    const slug = uniqueName('template-profile')
    return payload.create({
      collection: 'users-access',
      data: {
        name: slug,
        slug,
        tenant: tenantA.id,
        access: (editorA.access ?? []).map(({ id: _id, ...row }) => row),
      },
      user: superUser,
    })
  }

  beforeAll(async () => {
    payload = await getTestPayload()
    superUser = await loadUser(payload, TEST_USERS.superUser)
    templateEditor = await loadUser(payload, TEST_USERS.templateEditor)
    owner = await loadUser(payload, TEST_USERS.owner)
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    tenantB = await findTenant(payload, TEST_TENANTS.b)
    adminTenant = await findTenant(payload, DEFAULT_TENANT_SLUG)
    pagesEditor = await findProfile(payload, PAGES_EDITOR_TEMPLATE, adminTenant.id)
    pagesViewer = await findProfile(payload, PAGES_VIEWER_TEMPLATE, adminTenant.id)
    platformDefault = await findProfile(payload, DEFAULT_ACCESS_SLUG, adminTenant.id)
    editorA = await findProfile(payload, TEST_PROFILES.editor, tenantA.id)

    const { docs: headers } = await payload.find({
      collection: 'header',
      where: { tenant: { equals: tenantA.id } },
      limit: 1,
      depth: 0,
    })
    if (!headers[0]) {
      throw new Error(`tests: no header doc in tenant ${tenantA.slug}`)
    }
    headerA = headers[0]
  })

  describe('templates', () => {
    it('has pages-editor as a template on the admin tenant', () => {
      // assert
      expect(pagesEditor.isTemplate).toBe(true)
    })

    it('has pages-viewer as a template on the admin tenant', () => {
      // assert
      expect(pagesViewer.isTemplate).toBe(true)
    })

    it('has default as a template on the admin tenant', () => {
      // assert
      expect(platformDefault.isTemplate).toBe(true)
    })

    it('has exactly two migration-made templates', async () => {
      // act
      const result = await payload.count({
        collection: 'users-access',
        where: {
          and: [
            { slug: { in: [PAGES_EDITOR_TEMPLATE, PAGES_VIEWER_TEMPLATE] } },
            { tenant: { equals: adminTenant.id } },
          ],
        },
      })

      // assert
      expect(result.totalDocs).toBe(2)
    })
  })

  describe('pages-editor (templateEditor in test-a)', () => {
    const createPageInA = async (): Promise<Page> => {
      const slug = uniqueName('template')
      return payload.create({
        collection: 'pages',
        data: {
          title: slug,
          slug,
          tenant: tenantA.id,
          hero: { main: { type: 'none' } },
          layout: contentLayout(richText('Template editor test')),
        },
        user: superUser,
        context,
      })
    }

    it('finds test-a pages', async () => {
      // act
      const result = await payload.find({
        collection: 'pages',
        where: { tenant: { equals: tenantA.id } },
        user: templateEditor,
        overrideAccess: false,
      })

      // assert
      expect(result.totalDocs).toBeGreaterThan(0)
    })

    it('creates an a page', async () => {
      // arrange
      const slug = uniqueName('template')

      // act
      const doc = await payload.create({
        collection: 'pages',
        data: {
          title: slug,
          slug,
          tenant: tenantA.id,
          hero: { main: { type: 'none' } },
          layout: contentLayout(richText('Template editor test')),
        },
        user: templateEditor,
        overrideAccess: false,
        context,
      })

      // assert
      expect(doc.id).toBeDefined()
    })

    it('updates an a page', async () => {
      // arrange
      const page = await createPageInA()

      // act / assert
      await expect(
        payload.update({
          collection: 'pages',
          id: page.id,
          data: {
            title: `${page.title}-updated`,
            slug: page.slug,
          },
          user: templateEditor,
          overrideAccess: false,
          context,
        }),
      ).resolves.toBeDefined()
    })

    it('deletes an a page', async () => {
      // arrange
      const page = await createPageInA()

      // act / assert
      await expect(
        payload.delete({
          collection: 'pages',
          id: page.id,
          user: templateEditor,
          overrideAccess: false,
          context,
        }),
      ).resolves.toBeDefined()
    })

    it('may create media in test-a', async () => {
      // arrange
      const req = await reqFor(payload, templateEditor)

      // act
      const allowed = await accessCheckResolver(
        'media',
        'create',
      )({
        req,
        data: { tenant: tenantA.id },
      })

      // assert
      expect(allowed).toBe(true)
    })

    it('refuses creating a post', async () => {
      // arrange
      const slug = uniqueName('template-post')

      // act / assert
      await expect(
        payload.create({
          collection: 'posts',
          data: {
            title: slug,
            slug,
            tenant: tenantA.id,
            content: richText('Post test'),
          },
          user: templateEditor,
          overrideAccess: false,
          context,
        }),
      ).rejects.toMatchObject({ status: 403 })
    })

    it('refuses creating a category', async () => {
      // arrange
      const title = uniqueName('template-category')

      // act / assert
      await expect(
        payload.create({
          collection: 'categories',
          data: {
            title,
            tenant: tenantA.id,
          },
          user: templateEditor,
          overrideAccess: false,
          context,
        }),
      ).rejects.toMatchObject({ status: 403 })
    })

    it('refuses updating the a header', async () => {
      // act / assert
      await expect(
        payload.update({
          collection: 'header',
          id: headerA.id,
          data: { navItems: [] },
          user: templateEditor,
          overrideAccess: false,
          context,
        }),
      ).rejects.toMatchObject({ status: expect.toBeOneOf([403, 404]) })
    })

    it('opens /admin', async () => {
      // arrange
      const req = await reqFor(payload, templateEditor)

      // act / assert
      expect(adminAccess({ req })).toBe(true)
    })
  })

  describe('tenant admin (owner)', () => {
    it('reads the three templates', async () => {
      // act
      const result = await payload.find({
        collection: 'users-access',
        where: {
          slug: { in: [PAGES_EDITOR_TEMPLATE, PAGES_VIEWER_TEMPLATE, DEFAULT_ACCESS_SLUG] },
        },
        user: owner,
        overrideAccess: false,
      })

      // assert
      expect(result.totalDocs).toBe(3)
    })

    it('refuses updating a template', async () => {
      // act / assert
      await expect(
        payload.update({
          collection: 'users-access',
          id: pagesEditor.id,
          data: { name: 'Attempted Renamed Template' },
          user: owner,
          overrideAccess: false,
        }),
      ).rejects.toMatchObject({ status: expect.toBeOneOf([403, 404]) })
    })

    it('refuses deleting a template', async () => {
      // act / assert
      await expect(
        payload.delete({
          collection: 'users-access',
          id: pagesEditor.id,
          user: owner,
          overrideAccess: false,
        }),
      ).rejects.toMatchObject({ status: expect.toBeOneOf([403, 404]) })
    })

    it('cannot make a test-a profile a template', async () => {
      // arrange
      const profile = await createProfileInA()

      // act
      await payload.update({
        collection: 'users-access',
        id: profile.id,
        data: { isTemplate: true },
        user: owner,
        overrideAccess: false,
      })
      const reloaded = await payload.findByID({
        collection: 'users-access',
        id: profile.id,
        depth: 0,
      })

      // assert
      expect(reloaded.isTemplate).toBe(false)
    })

    it('assigns pages-viewer to an a member row', async () => {
      // arrange
      const email = `${uniqueName('template-member')}@example.test`

      // act / assert
      await expect(
        payload.create({
          collection: 'users',
          data: {
            email,
            name: email,
            password: email,
            tenants: [{ tenant: tenantA.id, access: pagesViewer.id }],
          },
          user: owner,
          overrideAccess: false,
        }),
      ).resolves.toBeDefined()
    })

    it('refuses a profile made in test-b on an a row', async () => {
      // arrange
      const email = `${uniqueName('template-member')}@example.test`
      const member = await payload.create({
        collection: 'users',
        data: {
          email,
          name: email,
          password: email,
          tenants: [{ tenant: tenantA.id, access: pagesViewer.id }],
        },
        user: superUser,
        overrideAccess: false,
      })
      const editorB = await findProfile(payload, TEST_PROFILES.editor, tenantB.id)

      // act / assert
      await expect(
        payload.update({
          collection: 'users',
          id: member.id,
          data: {
            tenants: [{ tenant: tenantA.id, access: editorB.id }],
          },
          user: owner,
          overrideAccess: false,
        }),
      ).rejects.toMatchObject({ status: 403 })
    })
  })

  it('refuses a super user making a test-a profile a template', async () => {
    // arrange
    const profile = await createProfileInA()

    // act / assert
    await expect(
      payload.update({
        collection: 'users-access',
        id: profile.id,
        data: { isTemplate: true },
        user: superUser,
        overrideAccess: false,
      }),
    ).rejects.toMatchObject({
      status: 400,
      data: {
        errors: expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining(
              'Only profiles of the platform business (admin) can be templates.',
            ),
          }),
        ]),
      },
    })
  })
})
