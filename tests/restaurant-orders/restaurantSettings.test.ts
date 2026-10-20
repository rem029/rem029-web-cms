// Settings → Restaurant (rem0018 phase 1 step 1b, src/collections/Settings/fields/restaurant.ts):
// timezone, business day start, opening hours, details. Settings is one doc per tenant: tests
// update test-a's doc as the tenant admin and put the old values back afterwards.
import type { Payload } from 'payload'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import type { Setting, Tenant } from '@/payload-types'

import { rejectionText } from '../common/errors'
import { getTestPayload } from '../common/payload'
import { TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { loadUser, type SessionUser } from '../common/users'

const context = { disableRevalidate: true }

describe('restaurant settings', () => {
  let payload: Payload
  let tenantA: Tenant
  let tenantAdmin: SessionUser
  let settingsId: number
  let originalRestaurant: Setting['restaurant'] | undefined

  beforeAll(async () => {
    payload = await getTestPayload()
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    tenantAdmin = await loadUser(payload, TEST_USERS.tenantAdmin)

    const { docs } = await payload.find({
      collection: 'settings',
      where: { tenant: { equals: tenantA.id } },
      depth: 0,
      limit: 1,
    })
    const doc = docs[0]
    if (!doc) throw new Error('tests: no settings for test-a')
    settingsId = doc.id
    originalRestaurant = doc.restaurant
  })

  afterEach(async () => {
    await payload.update({
      collection: 'settings',
      id: settingsId,
      data: {
        restaurant: originalRestaurant,
      },
      overrideAccess: true,
      context,
    })
  })

  it('defaults the timezone to UTC', async () => {
    // arrange: —
    // act: read a Settings doc that never set it
    const doc = await payload.findByID({
      collection: 'settings',
      id: settingsId,
      depth: 0,
      user: tenantAdmin,
      overrideAccess: false,
    })

    // assert: restaurant.timezone is 'UTC' (or empty, read as UTC), dayStartsAt '00:00'
    expect(doc.restaurant?.timezone ?? 'UTC').toBe('UTC')
    expect(doc.restaurant?.dayStartsAt ?? '00:00').toBe('00:00')
  })

  it('refuses an unknown timezone', async () => {
    // arrange: —
    // act: update test-a Settings with timezone 'Mars/Olympus'
    const call = payload.update({
      collection: 'settings',
      id: settingsId,
      data: {
        restaurant: {
          timezone: 'Mars/Olympus',
        },
      },
      user: tenantAdmin,
      overrideAccess: false,
      context,
    })

    // assert: rejects with "Pick a timezone from the list."
    const text = await rejectionText(call)
    expect(text).toContain('Pick a timezone from the list.')
  })

  it('refuses two rows for one weekday', async () => {
    // arrange: —
    // act: update with openingHours [mon 08:00–22:00, mon 09:00–23:00]
    const call = payload.update({
      collection: 'settings',
      id: settingsId,
      data: {
        restaurant: {
          openingHours: [
            { weekday: 'mon', opens: '08:00', closes: '22:00' },
            { weekday: 'mon', opens: '09:00', closes: '23:00' },
          ],
        },
      },
      user: tenantAdmin,
      overrideAccess: false,
      context,
    })

    // assert: rejects; the message names Monday
    const text = await rejectionText(call)
    expect(text).toContain('Monday')
  })

  it('lets a tenant admin set opening hours', async () => {
    // arrange: the tenant admin of test-a
    // act: update test-a Settings with openingHours [mon 08:00–22:00, fri closed]
    const updated = await payload.update({
      collection: 'settings',
      id: settingsId,
      data: {
        restaurant: {
          openingHours: [
            { weekday: 'mon', opens: '08:00', closes: '22:00', closed: false },
            { weekday: 'fri', closed: true },
          ],
        },
      },
      user: tenantAdmin,
      overrideAccess: false,
      context,
    })

    // assert: saved as given
    expect(updated.restaurant?.openingHours).toMatchObject([
      { weekday: 'mon', opens: '08:00', closes: '22:00', closed: false },
      { weekday: 'fri', closed: true },
    ])
  })

  it('keeps the General fields where they were', async () => {
    // arrange: test-a Settings with a siteName
    // act: read it after the tabs change
    const doc = await payload.findByID({
      collection: 'settings',
      id: settingsId,
      depth: 0,
      user: tenantAdmin,
      overrideAccess: false,
    })

    // assert: siteName, contact and homepage read as before (no data moved)
    expect(typeof doc.siteName).toBe('string')
    expect('contact' in doc).toBe(true)
    expect('address' in doc).toBe(true)
    expect('homepage' in doc).toBe(true)
  })
})
