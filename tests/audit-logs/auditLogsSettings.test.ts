// The `audit-logs-settings` global: how many months logs are kept (1–120, whole months, default 12),
// readable and editable by super users only, and every change is itself logged.
import type { NumberField, Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { getTestPayload } from '../common/payload'
import { TEST_USERS } from '../common/seed'
import { loadUser, type SessionUser } from '../common/users'
import { changesOf, isChange, rowsWhere } from './rows'

type Role = 'tenantAdmin' | 'templateEditor' | 'anonymous'

describe('audit-logs-settings', () => {
  let payload: Payload
  let superUser: SessionUser
  // read before any test writes the global: the value with nothing stored
  let initialMonths: number | null | undefined

  const userFor = async (role: Role): Promise<SessionUser | undefined> => {
    if (role === 'anonymous') return undefined
    return loadUser(payload, TEST_USERS[role])
  }

  beforeAll(async () => {
    payload = await getTestPayload()
    superUser = await loadUser(payload, TEST_USERS.superUser)
    const initialGlobal = await payload.findGlobal({
      slug: 'audit-logs-settings',
      overrideAccess: true,
    })
    initialMonths = initialGlobal.retentionMonths
  })

  afterAll(async () => {
    // put retentionMonths back to 12 (overrideAccess)
    await payload.updateGlobal({
      slug: 'audit-logs-settings',
      data: { retentionMonths: 12 },
      overrideAccess: true,
    })
  })

  describe('field', () => {
    it('is required, 1 to 120 months, 12 by default', () => {
      // arrange: the global's retentionMonths field (payload.config.globals)
      const settingsGlobal = payload.config.globals.find((g) => g.slug === 'audit-logs-settings')
      const field = settingsGlobal?.fields.find(
        (f): f is NumberField => 'name' in f && f.name === 'retentionMonths',
      )

      // assert: type number, required, min 1, max 120, defaultValue 12
      expect(field).toMatchObject({
        type: 'number',
        required: true,
        min: 1,
        max: 120,
        defaultValue: 12,
      })
    })

    it('reads 12 with nothing stored', () => {
      // assert: initialMonths is 12
      expect(initialMonths).toBe(12)
    })
  })

  describe('validation', () => {
    // as the super user, overrideAccess: false
    it.each([0, 121, 1.5])('refuses %s months', async (months) => {
      // act + assert: updateGlobal rejects with status 400
      await expect(
        payload.updateGlobal({
          slug: 'audit-logs-settings',
          data: { retentionMonths: months },
          user: superUser,
          overrideAccess: false,
        }),
      ).rejects.toMatchObject({ status: 400 })
    })

    it.each([1, 120])('accepts %s months', async (months) => {
      // act + assert: updateGlobal resolves
      const updated = await payload.updateGlobal({
        slug: 'audit-logs-settings',
        data: { retentionMonths: months },
        user: superUser,
        overrideAccess: false,
      })
      expect(updated.retentionMonths).toBe(months)
    })
  })

  describe('access', () => {
    it('lets the super user read it', async () => {
      // act + assert: findGlobal as the super user resolves
      const doc = await payload.findGlobal({
        slug: 'audit-logs-settings',
        user: superUser,
        overrideAccess: false,
      })
      expect(doc.retentionMonths).toBeDefined()
    })

    it('lets the super user update it', async () => {
      // act + assert: updateGlobal to 12 as the super user resolves
      const updated = await payload.updateGlobal({
        slug: 'audit-logs-settings',
        data: { retentionMonths: 12 },
        user: superUser,
        overrideAccess: false,
      })
      expect(updated.retentionMonths).toBe(12)
    })

    // tenantAdmin (test-a), templateEditor (pages-editor member), anonymous
    it.each(['tenantAdmin', 'templateEditor', 'anonymous'] as const)(
      'refuses %s reading it',
      async (role) => {
        // act + assert: findGlobal rejects with 403
        const user = await userFor(role)
        await expect(
          payload.findGlobal({
            slug: 'audit-logs-settings',
            overrideAccess: false,
            ...(user ? { user } : {}),
          }),
        ).rejects.toMatchObject({ status: 403 })
      },
    )

    it.each(['tenantAdmin', 'templateEditor', 'anonymous'] as const)(
      'refuses %s updating it',
      async (role) => {
        // act + assert: updateGlobal to 6 rejects with 403
        const user = await userFor(role)
        await expect(
          payload.updateGlobal({
            slug: 'audit-logs-settings',
            data: { retentionMonths: 6 },
            overrideAccess: false,
            ...(user ? { user } : {}),
          }),
        ).rejects.toMatchObject({ status: 403 })
      },
    )

    it.each([
      ['superUser', false],
      ['tenantAdmin', true],
      ['templateEditor', true],
    ] as const)('hides it in the nav from %s: %s', async (role, expected) => {
      // arrange
      const user = await loadUser(payload, TEST_USERS[role])
      const settingsGlobal = payload.config.globals.find((g) => g.slug === 'audit-logs-settings')
      const hiddenFn = settingsGlobal?.admin?.hidden

      // act: admin.hidden({ user })
      const isHidden = typeof hiddenFn === 'function' ? hiddenFn({ user }) : hiddenFn === true

      // assert: equals hidden
      expect(isHidden).toBe(expected)
    })
  })

  it('logs a change from 12 to 6 months as one update', async () => {
    // arrange: retentionMonths 12 (overrideAccess); note the time
    await payload.updateGlobal({
      slug: 'audit-logs-settings',
      data: { retentionMonths: 12 },
      overrideAccess: true,
    })
    const startedAt = new Date().toISOString()

    // act: the super user sets it to 6
    await payload.updateGlobal({
      slug: 'audit-logs-settings',
      data: { retentionMonths: 6 },
      user: superUser,
      overrideAccess: false,
    })

    // assert: one row since then for audit-logs-settings / audit-logs-settings: operation update,
    // tenant null, isChange(retentionMonths, 12, 6)
    const rows = await rowsWhere(payload, {
      and: [
        { createdAt: { greater_than_equal: startedAt } },
        { collectionSlug: { equals: 'audit-logs-settings' } },
        { docId: { equals: 'audit-logs-settings' } },
      ],
    })
    expect(rows).toHaveLength(1)
    expect(rows[0]?.operation).toBe('update')
    expect(rows[0]?.tenant).toBeNull()
    expect(isChange(changesOf(rows[0]).retentionMonths, 12, 6)).toBe(true)
  })
})
