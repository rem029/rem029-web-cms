// The users-access collection: default rows, validation, who reads it, the seeded profiles.
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { getAccessSlugs } from '@/collections/UsersAccess/utils/accessSlugs'
import { hasPermission, isHidden } from '@/common/utils/access'
import { DEFAULT_TENANT_SLUG } from '@/common/utils/defaultTenant'
import type { Tenant } from '@/payload-types'

import { findProfile, type AccessRow } from '../common/access'
import { rejectionText } from '../common/errors'
import { getTestPayload } from '../common/payload'
import { TEST_PROFILES, TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { loadUser, makeUser, type SessionUser } from '../common/users'

describe('users-access', () => {
  let payload: Payload
  let superUser: SessionUser
  let adminTenant: Tenant
  let tenantA: Tenant

  beforeAll(async () => {
    payload = await getTestPayload()
    superUser = await loadUser(payload, TEST_USERS.superUser)
    adminTenant = await findTenant(payload, DEFAULT_TENANT_SLUG)
    tenantA = await findTenant(payload, TEST_TENANTS.a)
  })

  it('offers plugin collections and no payload internals', () => {
    // act
    const slugs = getAccessSlugs(payload.config.collections)

    // assert
    expect(slugs).toContain('forms')
    expect(slugs).toContain('redirects')
    expect(slugs.some((slug) => slug.startsWith('payload-'))).toBe(false)
  })

  it('fills every slug with denied rows when access is empty', async () => {
    // arrange
    const slug = uniqueName('default-rows')

    // act
    const profile = await payload.create({
      collection: 'users-access',
      data: {
        name: slug,
        slug,
        tenant: adminTenant.id,
      },
      overrideAccess: false,
      user: superUser,
    })

    // assert
    const expectedSlugs = getAccessSlugs(payload.config.collections)
    const rows = profile.access ?? []
    expect(rows).toHaveLength(expectedSlugs.length)
    expect(
      rows.every(
        (row) =>
          row.hidden === true &&
          row.read === false &&
          row.create === false &&
          row.update === false &&
          row.delete === false &&
          row.admin === false &&
          row.access === false,
      ),
    ).toBe(true)
  })

  it('rejects duplicate rows for a slug', async () => {
    // arrange
    const slug = uniqueName('duplicate-rows')

    // act
    const text = await rejectionText(
      payload.create({
        collection: 'users-access',
        data: {
          name: slug,
          slug,
          tenant: adminTenant.id,
          access: [
            { slug: 'pages', read: true },
            { slug: 'pages', read: false },
          ],
        },
        overrideAccess: false,
        user: superUser,
      }),
    )

    // assert
    expect(text).toContain('Duplicate row for "pages"')
  })

  it('rejects a row for an unknown slug', async () => {
    // arrange
    const slug = uniqueName('unknown-slug')

    // act
    const text = await rejectionText(
      payload.create({
        collection: 'users-access',
        data: {
          name: slug,
          slug,
          tenant: adminTenant.id,
          access: [
            // deliberately invalid slug to test runtime validation
            { slug: 'nope' as unknown as AccessRow['slug'], read: true },
          ],
        },
        overrideAccess: false,
        user: superUser,
      }),
    )

    // assert
    expect(text.toLowerCase()).toContain('nope')
  })

  it('rejects a slug that is not kebab-case', async () => {
    // arrange
    const name = uniqueName('bad-slug')

    // act
    const text = await rejectionText(
      payload.create({
        collection: 'users-access',
        data: {
          name,
          slug: 'Bad Slug',
          tenant: adminTenant.id,
        },
        overrideAccess: false,
        user: superUser,
      }),
    )

    // assert
    expect(text.toLowerCase()).toContain('kebab-case')
  })

  it('is not readable by a user without a profile', async () => {
    // arrange
    const user = makeUser({ id: superUser.id, super_user: false })

    // act / assert
    await expect(
      payload.find({
        collection: 'users-access',
        overrideAccess: false,
        user,
      }),
    ).rejects.toMatchObject({ status: 403 })
  })

  describe('seeded profiles', () => {
    it('has the editor profile in test-a', async () => {
      // act
      const { docs } = await payload.find({
        collection: 'users-access',
        where: {
          and: [{ slug: { equals: TEST_PROFILES.editor } }, { tenant: { equals: tenantA.id } }],
        },
        depth: 0,
      })

      // assert
      expect(docs).toHaveLength(1)
    })

    it('lets the editor update pages and open /admin only', async () => {
      // arrange
      const editor = await findProfile(payload, TEST_PROFILES.editor, tenantA.id)

      // assert
      expect(hasPermission(editor, 'pages', 'update')).toBe(true)
      expect(hasPermission(editor, 'users', 'admin')).toBe(true)
      expect(hasPermission(editor, 'users', 'read')).toBe(false)
      expect(hasPermission(editor, 'tenants', 'read')).toBe(false)
      expect(isHidden(editor, 'tenants')).toBe(true)
    })

    it('has the viewer profile in test-a', async () => {
      // act
      const { docs } = await payload.find({
        collection: 'users-access',
        where: {
          and: [{ slug: { equals: TEST_PROFILES.viewer } }, { tenant: { equals: tenantA.id } }],
        },
        depth: 0,
      })

      // assert
      expect(docs).toHaveLength(1)
    })
  })
})
