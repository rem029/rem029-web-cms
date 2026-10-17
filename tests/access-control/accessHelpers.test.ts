// The access helpers in @/common/utils/access, on in-memory users and profiles.
import type { Payload, Where } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import {
  accessCheckResolver,
  adminAccess,
  hasApiAccess,
  hasPermission,
  hiddenResolver,
  isHidden,
} from '@/common/utils/access'

import { makeRecord } from '../common/access'
import { getTestPayload } from '../common/payload'
import { makeUser, reqFor } from '../common/users'

describe('hasPermission / isHidden', () => {
  it('denies without a profile', () => {
    // act / assert
    expect(hasPermission(null, 'pages', 'read')).toBe(false)
  })

  it('hides without a profile', () => {
    // act / assert
    expect(isHidden(null, 'pages')).toBe(true)
  })

  it('denies a slug the profile has no row for', () => {
    // arrange
    const record = makeRecord([{ slug: 'posts', read: true, hidden: false }])

    // act / assert
    expect(hasPermission(record, 'pages', 'read')).toBe(false)
  })

  it('hides a slug the profile has no row for', () => {
    // arrange
    const record = makeRecord([{ slug: 'posts', read: true, hidden: false }])

    // act / assert
    expect(isHidden(record, 'pages')).toBe(true)
  })

  it('denies an unticked op', () => {
    // arrange
    const record = makeRecord([{ slug: 'pages', read: false, hidden: false }])

    // act / assert
    expect(hasPermission(record, 'pages', 'read')).toBe(false)
  })

  it('allows a ticked op', () => {
    // arrange
    const record = makeRecord([{ slug: 'pages', read: true, hidden: false }])

    // act / assert
    expect(hasPermission(record, 'pages', 'read')).toBe(true)
  })

  it('shows a row with hidden unticked', () => {
    // arrange
    const record = makeRecord([{ slug: 'pages', hidden: false }])

    // act / assert
    expect(isHidden(record, 'pages')).toBe(false)
  })
})

describe('request access helpers', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  describe('anonymous', () => {
    it('denies pages read', async () => {
      // arrange
      const req = await reqFor(payload, null)

      // act
      const allowed = accessCheckResolver('pages', 'read')({ req })

      // assert
      expect(allowed).toBe(false)
    })

    it('denies /admin', async () => {
      // arrange
      const req = await reqFor(payload, null)

      // act
      const allowed = adminAccess({ req })

      // assert
      expect(allowed).toBe(false)
    })

    it('denies API access to pages', async () => {
      // arrange
      const req = await reqFor(payload, null)

      // act
      const allowed = hasApiAccess(req, 'pages')

      // assert
      expect(allowed).toBe(false)
    })

    it('hides pages in the nav', () => {
      // act
      const hidden = hiddenResolver('pages')({ user: null })

      // assert
      expect(hidden).toBe(true)
    })
  })

  describe('super user', () => {
    it('allows pages read', async () => {
      // arrange
      const user = makeUser({ id: 101, super_user: true })
      const req = await reqFor(payload, user)

      // act
      const allowed = accessCheckResolver('pages', 'read')({ req })

      // assert
      expect(allowed).toBe(true)
    })

    it('allows /admin', async () => {
      // arrange
      const user = makeUser({ id: 101, super_user: true })
      const req = await reqFor(payload, user)

      // act
      const allowed = adminAccess({ req })

      // assert
      expect(allowed).toBe(true)
    })

    it('allows API access to pages', async () => {
      // arrange
      const user = makeUser({ id: 101, super_user: true })
      const req = await reqFor(payload, user)

      // act
      const allowed = hasApiAccess(req, 'pages')

      // assert
      expect(allowed).toBe(true)
    })

    it('shows pages in the nav', () => {
      // arrange
      const user = makeUser({ id: 101, super_user: true })

      // act
      const hidden = hiddenResolver('pages')({ user })

      // assert
      expect(hidden).toBe(false)
    })
  })

  describe('with a profile on a tenant row', () => {
    it('limits reads to the tenants that allow them', async () => {
      // arrange
      const user = makeUser({
        id: 102,
        super_user: false,
        tenants: [
          {
            tenant: 1,
            access: makeRecord([
              { slug: 'pages', read: true, hidden: false, access: true },
              { slug: 'users', admin: true },
            ]),
          },
        ],
      })
      const req = await reqFor(payload, user)

      // act
      const result = accessCheckResolver('pages', 'read')({ req })

      // assert
      expect(result).toEqual({ tenant: { in: [1] } })
    })

    it('adds the where option to the tenant filter', async () => {
      // arrange
      const where: Where = { id: { equals: 1 } }
      const user = makeUser({
        id: 102,
        super_user: false,
        tenants: [
          {
            tenant: 1,
            access: makeRecord([
              { slug: 'pages', read: true, hidden: false, access: true },
              { slug: 'users', admin: true },
            ]),
          },
        ],
      })
      const req = await reqFor(payload, user)

      // act
      const result = accessCheckResolver('pages', 'read', { where: () => where })({ req })

      // assert
      expect(result).toEqual({ and: [{ tenant: { in: [1] } }, where] })
    })

    it('denies without the where option when the op is unticked', async () => {
      // arrange
      const where: Where = { id: { equals: 1 } }
      const user = makeUser({
        id: 103,
        super_user: false,
        tenants: [
          {
            tenant: 1,
            access: makeRecord([{ slug: 'pages', read: false, hidden: false }]),
          },
        ],
      })
      const req = await reqFor(payload, user)

      // act
      const result = accessCheckResolver('pages', 'read', { where: () => where })({ req })

      // assert
      expect(result).toBe(false)
    })
  })

  describe('with an unpopulated profile id', () => {
    it('denies pages read', async () => {
      // arrange
      const user = makeUser({
        id: 104,
        super_user: false,
        tenants: [{ tenant: 1, access: 12345 }],
      })
      const req = await reqFor(payload, user)

      // act
      const allowed = accessCheckResolver('pages', 'read')({ req })

      // assert
      expect(allowed).toBe(false)
    })

    it('denies /admin', async () => {
      // arrange
      const user = makeUser({
        id: 104,
        super_user: false,
        tenants: [{ tenant: 1, access: 12345 }],
      })
      const req = await reqFor(payload, user)

      // act
      const allowed = adminAccess({ req })

      // assert
      expect(allowed).toBe(false)
    })

    it('denies API access to pages', async () => {
      // arrange
      const user = makeUser({
        id: 104,
        super_user: false,
        tenants: [{ tenant: 1, access: 12345 }],
      })
      const req = await reqFor(payload, user)

      // act
      const allowed = hasApiAccess(req, 'pages')

      // assert
      expect(allowed).toBe(false)
    })

    it('hides pages in the nav', () => {
      // arrange
      const user = makeUser({
        id: 104,
        super_user: false,
        tenants: [{ tenant: 1, access: 12345 }],
      })

      // act
      const hidden = hiddenResolver('pages')({ user })

      // assert
      expect(hidden).toBe(true)
    })
  })

  describe('disabled user with a granting profile', () => {
    it('denies pages read', async () => {
      // arrange
      const user = makeUser({
        id: 105,
        super_user: false,
        is_disabled: true,
        tenants: [
          {
            tenant: 1,
            access: makeRecord([
              { slug: 'pages', read: true, hidden: false, access: true },
              { slug: 'users', admin: true },
            ]),
          },
        ],
      })
      const req = await reqFor(payload, user)

      // act
      const allowed = accessCheckResolver('pages', 'read')({ req })

      // assert
      expect(allowed).toBe(false)
    })

    it('denies /admin', async () => {
      // arrange
      const user = makeUser({
        id: 105,
        super_user: false,
        is_disabled: true,
        tenants: [
          {
            tenant: 1,
            access: makeRecord([
              { slug: 'pages', read: true, hidden: false, access: true },
              { slug: 'users', admin: true },
            ]),
          },
        ],
      })
      const req = await reqFor(payload, user)

      // act
      const allowed = adminAccess({ req })

      // assert
      expect(allowed).toBe(false)
    })

    it('denies API access to pages', async () => {
      // arrange
      const user = makeUser({
        id: 105,
        super_user: false,
        is_disabled: true,
        tenants: [
          {
            tenant: 1,
            access: makeRecord([
              { slug: 'pages', read: true, hidden: false, access: true },
              { slug: 'users', admin: true },
            ]),
          },
        ],
      })
      const req = await reqFor(payload, user)

      // act
      const allowed = hasApiAccess(req, 'pages')

      // assert
      expect(allowed).toBe(false)
    })

    it('hides pages in the nav', () => {
      // arrange
      const user = makeUser({
        id: 105,
        super_user: false,
        is_disabled: true,
        tenants: [
          {
            tenant: 1,
            access: makeRecord([
              { slug: 'pages', read: true, hidden: false, access: true },
              { slug: 'users', admin: true },
            ]),
          },
        ],
      })

      // act
      const hidden = hiddenResolver('pages')({ user })

      // assert
      expect(hidden).toBe(true)
    })
  })
})
