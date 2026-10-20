/**
 * Restaurant ordering dev data (rem0018), per seeded business (tenant1, tenant2):
 * - tables "Table 1" … "Table 8" (Arabic "طاولة 1" …), 4 seats, table 8 not taking orders
 * - ordering on for the `corniche-branch` menu (published, waiter + kitchen + cashier) with
 *   tables 1–6; the other menus stay browse-only
 * - Settings → Restaurant: name, timezone Asia/Qatar, the day starting at 04:00, opening hours
 *   (Sat–Thu 07:00–01:00, Friday 13:00–01:00), legal name and tax number
 *
 * Runs after `menu` (needs the menus). Idempotent: tables upserted by slug + tenant, the menu and
 * Settings updated in place. Dev only (`src/seeds/index.ts` refuses production).
 */
import type { Payload } from 'payload'

import type { Setting } from '@/payload-types'

const context = { disableRevalidate: true }

const BUSINESS_SLUGS = ['tenant1', 'tenant2']

type OpeningHours = NonNullable<NonNullable<Setting['restaurant']>['openingHours']>

const OPENING_HOURS: OpeningHours = [
  { weekday: 'sat', opens: '07:00', closes: '01:00', closed: false },
  { weekday: 'sun', opens: '07:00', closes: '01:00', closed: false },
  { weekday: 'mon', opens: '07:00', closes: '01:00', closed: false },
  { weekday: 'tue', opens: '07:00', closes: '01:00', closed: false },
  { weekday: 'wed', opens: '07:00', closes: '01:00', closed: false },
  { weekday: 'thu', opens: '07:00', closes: '01:00', closed: false },
  { weekday: 'fri', opens: '13:00', closes: '01:00', closed: false },
]

export const seedRestaurant = async (payload: Payload): Promise<void> => {
  for (const tenantSlug of BUSINESS_SLUGS) {
    const { docs: tenants } = await payload.find({
      collection: 'tenants',
      where: { slug: { equals: tenantSlug } },
      depth: 0,
      limit: 1,
    })
    const tenant = tenants[0]
    if (!tenant) {
      payload.logger.warn({ tenantSlug }, 'restaurant seed: tenant not found')
      continue
    }

    const { docs: menus } = await payload.find({
      collection: 'menus',
      where: {
        and: [{ tenant: { equals: tenant.id } }, { slug: { equals: 'corniche-branch' } }],
      },
      draft: true,
      depth: 0,
      limit: 1,
    })
    const cornicheMenu = menus[0]
    if (!cornicheMenu) {
      payload.logger.warn({ tenantSlug }, 'restaurant seed: corniche-branch menu not found')
      continue
    }

    const tableIds: number[] = []
    for (let n = 1; n <= 8; n++) {
      const slug = `table-${n}`
      const labelEn = `Table ${n}`
      const labelAr = `طاولة ${n}`
      const isActive = n !== 8
      const linkedMenus = n <= 6 ? [cornicheMenu.id] : []

      const { docs: existingTables } = await payload.find({
        collection: 'tables',
        where: {
          and: [{ tenant: { equals: tenant.id } }, { slug: { equals: slug } }],
        },
        depth: 0,
        limit: 1,
      })

      let tableId: number
      if (existingTables[0]) {
        tableId = existingTables[0].id
        await payload.update({
          collection: 'tables',
          id: tableId,
          data: {
            label: labelEn,
            seats: 4,
            sortOrder: n,
            isActive,
            menus: linkedMenus,
          },
          locale: 'en',
          context,
        })
      } else {
        const created = await payload.create({
          collection: 'tables',
          data: {
            tenant: tenant.id,
            label: labelEn,
            slug,
            seats: 4,
            sortOrder: n,
            isActive,
            menus: linkedMenus,
          },
          locale: 'en',
          context,
        })
        tableId = created.id
      }

      await payload.update({
        collection: 'tables',
        id: tableId,
        data: {
          label: labelAr,
        },
        locale: 'ar',
        context,
      })

      tableIds.push(tableId)
    }

    await payload.update({
      collection: 'menus',
      id: cornicheMenu.id,
      data: {
        ordering: {
          enabled: true,
          flow: 'waiter_kitchen_cashier',
          showPrices: true,
        },
        _status: 'published',
      },
      draft: false,
      context,
    })

    const { docs: settings } = await payload.find({
      collection: 'settings',
      where: { tenant: { equals: tenant.id } },
      depth: 0,
      limit: 1,
    })
    const setting = settings[0]
    if (setting) {
      await payload.update({
        collection: 'settings',
        id: setting.id,
        data: {
          restaurant: {
            name: 'Corniche Kitchen',
            timezone: 'Asia/Qatar',
            dayStartsAt: '04:00',
            openingHours: OPENING_HOURS,
            legalName: 'Corniche Kitchen LLC',
            taxNumber: 'QA-123456',
          },
        },
        locale: 'en',
        context,
      })

      await payload.update({
        collection: 'settings',
        id: setting.id,
        data: {
          restaurant: {
            name: 'مطبخ الكورنيش',
          },
        },
        locale: 'ar',
        context,
      })
    }

    payload.logger.info(
      { tenantId: tenant.id, tables: tableIds.length, menuId: cornicheMenu.id },
      'restaurant seed: done for tenant',
    )
  }
}
