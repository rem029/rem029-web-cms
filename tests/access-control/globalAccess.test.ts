// Globals a profile can grant (the field showcase global): who reads and updates it, and which
// globals a profile offers rows for.
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { getAccessSlugs } from '@/collections/UsersAccess/utils/accessSlugs'

import { getTestPayload } from '../common/payload'
import { TEST_USERS } from '../common/seed'
import { uniqueName } from '../common/unique'
import { loadUser } from '../common/users'

const SLUG = 'field-showcase-global'

let payload: Payload

beforeAll(async () => {
  payload = await getTestPayload()
})

describe('globalAccessResolver', () => {
  it('lets super users read and update', async () => {
    // arrange: the seeded super user
    const user = await loadUser(payload, TEST_USERS.superUser)
    const text = uniqueName('super')

    // act: findGlobal 'field-showcase-global', then updateGlobal (overrideAccess false, user)
    const before = await payload.findGlobal({
      slug: SLUG,
      overrideAccess: false,
      user,
    })
    const updated = await payload.updateGlobal({
      slug: SLUG,
      data: { title: 'Showcase', items: [{ label: 'row' }], text },
      overrideAccess: false,
      user,
    })

    // assert: both resolve
    expect(before).toBeDefined()
    expect(updated.text).toBe(text)
  })

  it('lets a profile with read read but not update', async () => {
    // arrange: TEST_USERS.viewer (viewer profile: read on the global)
    const user = await loadUser(payload, TEST_USERS.viewer)

    // act: findGlobal, then updateGlobal
    const found = await payload.findGlobal({
      slug: SLUG,
      overrideAccess: false,
      user,
    })
    const update = () =>
      payload.updateGlobal({
        slug: SLUG,
        data: { title: 'Showcase', items: [{ label: 'row' }], text: uniqueName('viewer') },
        overrideAccess: false,
        user,
      })

    // assert: findGlobal resolves; updateGlobal rejects with status 403
    expect(found).toBeDefined()
    await expect(update()).rejects.toMatchObject({ status: 403 })
  })

  it('lets a profile with update update', async () => {
    // arrange: TEST_USERS.member (editor profile: read + update on the global)
    const user = await loadUser(payload, TEST_USERS.member)
    const superUser = await loadUser(payload, TEST_USERS.superUser)
    const text = uniqueName('editor')

    // act: updateGlobal with a unique `text`
    const updated = await payload.updateGlobal({
      slug: SLUG,
      data: { title: 'Showcase', items: [{ label: 'row' }], text },
      overrideAccess: false,
      user,
    })

    // assert: resolves; findGlobal as the super user returns that text
    expect(updated.text).toBe(text)
    const found = await payload.findGlobal({
      slug: SLUG,
      overrideAccess: false,
      user: superUser,
    })
    expect(found.text).toBe(text)
  })

  it('denies a member whose profile has no row', async () => {
    // arrange: TEST_USERS.defaultProfile (platform `default`: no row for the global)
    const user = await loadUser(payload, TEST_USERS.defaultProfile)

    // act: findGlobal
    const find = () =>
      payload.findGlobal({
        slug: SLUG,
        overrideAccess: false,
        user,
      })

    // assert: rejects with status 403
    await expect(find()).rejects.toMatchObject({ status: 403 })
  })

  it('denies tenant admins without a profile row', async () => {
    // arrange: TEST_USERS.tenantAdmin (no hardcoded grant on globals)
    const user = await loadUser(payload, TEST_USERS.tenantAdmin)

    // act: findGlobal, then updateGlobal
    const find = () =>
      payload.findGlobal({
        slug: SLUG,
        overrideAccess: false,
        user,
      })
    const update = () =>
      payload.updateGlobal({
        slug: SLUG,
        data: { title: 'Showcase', items: [{ label: 'row' }], text: uniqueName('tenant-admin') },
        overrideAccess: false,
        user,
      })

    // assert: both reject with status 403
    await expect(find()).rejects.toMatchObject({ status: 403 })
    await expect(update()).rejects.toMatchObject({ status: 403 })
  })

  it('denies disabled users', async () => {
    // arrange: TEST_USERS.disabled (editor profile, is_disabled)
    const user = await loadUser(payload, TEST_USERS.disabled)

    // act: findGlobal
    const find = () =>
      payload.findGlobal({
        slug: SLUG,
        overrideAccess: false,
        user,
      })

    // assert: rejects with status 403
    await expect(find()).rejects.toMatchObject({ status: 403 })
  })

  it('denies anonymous readers', async () => {
    // arrange: no user

    // act: findGlobal (overrideAccess false, no user)
    const find = () =>
      payload.findGlobal({
        slug: SLUG,
        overrideAccess: false,
      })

    // assert: rejects with status 403
    await expect(find()).rejects.toMatchObject({ status: 403 })
  })

  it('denies drafts and versions without read', async () => {
    // arrange: TEST_USERS.defaultProfile
    const user = await loadUser(payload, TEST_USERS.defaultProfile)

    // act: findGlobal with draft true, then findGlobalVersions
    const findDraft = () =>
      payload.findGlobal({
        slug: SLUG,
        draft: true,
        overrideAccess: false,
        user,
      })
    const findVersions = () =>
      payload.findGlobalVersions({
        slug: SLUG,
        overrideAccess: false,
        user,
      })

    // assert: both reject with status 403
    await expect(findDraft()).rejects.toMatchObject({ status: 403 })
    await expect(findVersions()).rejects.toMatchObject({ status: 403 })
  })

  it('denies update from an inactive tenant row', async () => {
    // arrange: TEST_USERS.inactiveMember (editor profile in test-inactive only)
    const user = await loadUser(payload, TEST_USERS.inactiveMember)

    // act: findGlobal, then updateGlobal
    const found = await payload.findGlobal({
      slug: SLUG,
      overrideAccess: false,
      user,
    })
    const update = () =>
      payload.updateGlobal({
        slug: SLUG,
        data: { title: 'Showcase', items: [{ label: 'row' }], text: uniqueName('inactive') },
        overrideAccess: false,
        user,
      })

    // assert: findGlobal resolves; updateGlobal rejects with status 403
    expect(found).toBeDefined()
    await expect(update()).rejects.toMatchObject({ status: 403 })
  })
})

describe('access slug options', () => {
  it('offers the showcase global', () => {
    // arrange: the test payload's config
    const { collections, globals } = payload.config

    // act: getAccessSlugs(config.collections, config.globals)
    const slugs = getAccessSlugs(collections, globals)

    // assert: contains 'field-showcase-global'
    expect(slugs).toContain(SLUG)
  })

  it('does not offer audit-logs-settings', () => {
    // arrange: the test payload's config
    const { collections, globals } = payload.config

    // act: getAccessSlugs(config.collections, config.globals)
    const slugs = getAccessSlugs(collections, globals)

    // assert: does not contain 'audit-logs-settings'
    expect(slugs).not.toContain('audit-logs-settings')
  })
})
