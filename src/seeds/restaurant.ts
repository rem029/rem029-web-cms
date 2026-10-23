/**
 * Restaurant ordering dev data (rem0018), per seeded business (tenant1, tenant2):
 * - ordering on (published, waiter + kitchen + cashier) for two menus, each with its own tables
 *   (a table belongs to one menu, step 1c), labelled "Table <n>" / "طاولة <n>":
 *   - `corniche-branch`: tables 1–8, 4 seats, table 8 not taking orders
 *   - `ramadan-iftar`: tables 1–4, 2 seats (same slugs as the branch, its own tables)
 *   the other menus stay browse-only
 * - Settings → Restaurant: name, timezone Asia/Qatar, the day starting at 04:00, opening hours
 *   (Sat–Thu 07:00–01:00, Friday 13:00–01:00), legal name and tax number
 *
 * Runs after `menu` (needs the menus). Idempotent: tables upserted by menu + slug, the menus and
 * Settings updated in place. Dev only (`src/seeds/index.ts` refuses production).
 */
import type { Payload } from 'payload'

import type { Setting } from '@/payload-types'

const context = { disableRevalidate: true }

const BUSINESS_SLUGS = ['tenant1', 'tenant2']

type MenuTablesSpec = { menuSlug: string; count: number; seats: number; inactive: number[] }

const MENU_TABLES: MenuTablesSpec[] = [
  { menuSlug: 'corniche-branch', count: 8, seats: 4, inactive: [8] },
  { menuSlug: 'ramadan-iftar', count: 4, seats: 2, inactive: [] },
]

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

/** Turns ordering on for one menu and upserts its tables; returns how many tables it has. */
const seedMenuTables = async (
  payload: Payload,
  tenantId: number,
  spec: MenuTablesSpec,
): Promise<number> => {
  const { docs: menus } = await payload.find({
    collection: 'menus',
    where: { and: [{ tenant: { equals: tenantId } }, { slug: { equals: spec.menuSlug } }] },
    draft: true,
    depth: 0,
    limit: 1,
  })
  const menu = menus[0]
  if (!menu) {
    payload.logger.warn({ tenantId, menuSlug: spec.menuSlug }, 'restaurant seed: menu not found')
    return 0
  }

  for (let n = 1; n <= spec.count; n++) {
    const slug = `table-${n}`
    const data = {
      label: `Table ${n}`,
      seats: spec.seats,
      sortOrder: n,
      isActive: !spec.inactive.includes(n),
    }

    const { docs: existing } = await payload.find({
      collection: 'tables',
      where: { and: [{ menu: { equals: menu.id } }, { slug: { equals: slug } }] },
      depth: 0,
      limit: 1,
    })
    const table = existing[0]
      ? await payload.update({
          collection: 'tables',
          id: existing[0].id,
          data,
          locale: 'en',
          context,
        })
      : await payload.create({
          collection: 'tables',
          data: { ...data, tenant: tenantId, menu: menu.id, slug },
          locale: 'en',
          context,
        })

    await payload.update({
      collection: 'tables',
      id: table.id,
      data: { label: `طاولة ${n}` },
      locale: 'ar',
      context,
    })
  }

  await payload.update({
    collection: 'menus',
    id: menu.id,
    data: {
      ordering: { enabled: true, flow: 'waiter_kitchen_cashier', showPrices: true },
      _status: 'published',
    },
    draft: false,
    context,
  })
  return spec.count
}

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

    let tableCount = 0
    for (const spec of MENU_TABLES) {
      tableCount += await seedMenuTables(payload, tenant.id, spec)
    }

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
      { tenantId: tenant.id, tables: tableCount },
      'restaurant seed: done for tenant',
    )
  }
}
