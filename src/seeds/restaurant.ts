/**
 * Restaurant ordering dev data (rem0018), per seeded business (tenant1, tenant2):
 * - ordering on (published, waiter + kitchen + cashier) for two menus, each with its own tables
 *   (a table belongs to one menu, step 1c), labelled "Table <n>" / "طاولة <n>":
 *   - `corniche-branch`: tables 1–8, 4 seats, table 8 not taking orders
 *   - `ramadan-iftar`: tables 1–4, 2 seats (same slugs as the branch, its own tables)
 *   the other menus stay browse-only
 * - Settings → Restaurant: name, timezone Asia/Qatar, the day starting at 04:00, opening hours
 *   (Sat–Thu 07:00–01:00, Friday 13:00–01:00), legal name and tax number
 * - sample orders on the Corniche branch in every status (Sample guest 1–7; step 3b)
 *
 * Runs after `menu` (needs the menus). Idempotent: tables upserted by menu + slug, the menus and
 * Settings updated in place. Dev only (`src/seeds/index.ts` refuses production).
 */
import type { Payload } from 'payload'

import type { OrderStatus } from '@/collections/Orders/utils/statuses'
import { NEXT_STATUS } from '@/collections/Orders/utils/transitions'
import type { Order, Setting, User } from '@/payload-types'
import { extractTenantId } from '@/common/utils/tenantCollections'

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
  tenantSlug: string,
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

  const staffIds: number[] = []
  const n = tenantSlug.replace(/\D/g, '')
  const staffEmails = [
    `waiter${n}@example.test`,
    `kitchen${n}@example.test`,
    `cashier-staff${n}@example.test`,
  ]
  for (const email of staffEmails) {
    const { docs: users } = await payload.find({
      collection: 'users',
      where: { email: { equals: email } },
      depth: 0,
      limit: 1,
    })
    if (users[0]) {
      staffIds.push(users[0].id)
    } else {
      payload.logger.warn({ email, tenantSlug }, 'restaurant seed: staff user not found')
    }
  }

  await payload.update({
    collection: 'menus',
    id: menu.id,
    data: {
      ordering: {
        enabled: true,
        flow: 'waiter_kitchen_cashier',
        showPrices: true,
        staff: staffIds,
      },
      _status: 'published',
    },
    draft: false,
    context,
  })
  return spec.count
}

// one order per status on tables 1–7 (step 3b); guests 1–3 were pending in 3a and move on
const SAMPLE_ORDERS: { guestName: string; status: OrderStatus; cancelReason?: string }[] = [
  { guestName: 'Sample guest 1', status: 'pending' },
  { guestName: 'Sample guest 2', status: 'confirmed' },
  { guestName: 'Sample guest 3', status: 'preparing' },
  { guestName: 'Sample guest 4', status: 'prepared' },
  { guestName: 'Sample guest 5', status: 'served' },
  { guestName: 'Sample guest 6', status: 'completed' },
  { guestName: 'Sample guest 7', status: 'cancelled', cancelReason: 'Guest left' },
]

/**
 * Moves a sample order forward one status at a time to `target`, as `user` (a super user: every
 * move is theirs), through the real hooks (guard, stamps, events). Cancelled: one move with the
 * reason. Already at or past the target: nothing.
 */
const walkToStatus = async (
  payload: Payload,
  order: Order,
  target: OrderStatus,
  user: User,
  cancelReason?: string,
): Promise<void> => {
  if (order.status === target || order.status === 'completed' || order.status === 'cancelled') {
    return
  }
  if (target === 'cancelled') {
    await payload.update({
      collection: 'orders',
      id: order.id,
      data: {
        status: 'cancelled',
        ...(cancelReason ? { cancelReason } : {}),
      },
      user,
      overrideAccess: false,
    })
    return
  }

  let currentStatus: OrderStatus = order.status
  while (currentStatus !== target) {
    const next: OrderStatus | null = NEXT_STATUS[currentStatus]
    if (!next) {
      break
    }
    const updated: Order = await payload.update({
      collection: 'orders',
      id: order.id,
      data: { status: next },
      user,
      overrideAccess: false,
    })
    currentStatus = updated.status
  }
}

/**
 * Sample orders on the Corniche branch, one in each status (rem0018 steps 3a and 3b), so the
 * orders list and later the boards have something to show. Idempotent: one order per sample
 * guest name on that menu; a missing one is placed through the real hooks (numbers, snapshots)
 * as a guest would, then walked to its status as the seeded super user (`walkToStatus`); an
 * existing one behind its status is walked on (3a's pending orders), else left alone.
 */
const seedSampleOrders = async (payload: Payload, tenantId: number): Promise<number> => {
  const { docs: menus } = await payload.find({
    collection: 'menus',
    where: {
      and: [{ tenant: { equals: tenantId } }, { slug: { equals: 'corniche-branch' } }],
    },
    draft: false,
    depth: 0,
    limit: 1,
  })
  const menu = menus[0]
  if (!menu) {
    payload.logger.warn({ msg: 'restaurant seed: corniche-branch menu not found', tenantId })
    return 0
  }

  const itemIds: number[] = []
  if (Array.isArray(menu.items)) {
    for (const item of menu.items) {
      const id = extractTenantId(item)
      if (id !== null) {
        itemIds.push(id)
      }
    }
  }

  const items = itemIds.slice(0, 3)
  if (items.length < 3) {
    payload.logger.warn({
      msg: 'restaurant seed: corniche-branch menu items missing',
      tenantId,
      menuId: menu.id,
    })
    return 0
  }

  const { docs: superUsers } = await payload.find({
    collection: 'users',
    where: { super_user: { equals: true } },
    depth: 0,
    limit: 1,
  })
  const superUser = superUsers[0]
  if (!superUser) {
    payload.logger.warn({ msg: 'restaurant seed: super user not found' })
  }

  const tableSlugs = [
    'table-1',
    'table-2',
    'table-3',
    'table-4',
    'table-5',
    'table-6',
    'table-7',
  ]
  const { docs: tables } = await payload.find({
    collection: 'tables',
    where: {
      and: [{ menu: { equals: menu.id } }, { slug: { in: tableSlugs } }],
    },
    depth: 0,
    pagination: false,
  })

  const tableMap = new Map<string, number>()
  for (const table of tables) {
    if (typeof table.slug === 'string') {
      tableMap.set(table.slug, table.id)
    }
  }

  let createdCount = 0
  for (let i = 0; i < SAMPLE_ORDERS.length; i++) {
    const sample = SAMPLE_ORDERS[i]
    if (!sample) continue
    const { guestName, status, cancelReason } = sample

    const { docs: existing } = await payload.find({
      collection: 'orders',
      where: {
        and: [{ menu: { equals: menu.id } }, { guestName: { equals: guestName } }],
      },
      depth: 0,
      limit: 1,
    })

    if (existing[0]) {
      if (superUser) {
        await walkToStatus(payload, existing[0], status, superUser, cancelReason)
      }
      continue
    }

    const tableId = tableMap.get(`table-${i + 1}`)
    const itemId = items[i % items.length]
    if (itemId === undefined) continue

    const created = await payload.create({
      collection: 'orders',
      data: {
        tenant: tenantId,
        menu: menu.id,
        ...(tableId !== undefined ? { table: tableId } : {}),
        guestName,
        source: 'guest',
        type: 'dine_in',
        status: 'pending',
        paymentStatus: 'unpaid',
        items: [
          {
            item: itemId,
            quantity: (i % 3) + 1,
          },
        ],
      },
      context,
    })

    if (superUser) {
      await walkToStatus(payload, created, status, superUser, cancelReason)
    }

    createdCount++
  }

  return createdCount
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
      tableCount += await seedMenuTables(payload, tenant.id, spec, tenantSlug)
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

    // after Settings: the order numbers use its timezone and day start
    const orderCount = await seedSampleOrders(payload, tenant.id)

    payload.logger.info(
      { tenantId: tenant.id, tables: tableCount, orders: orderCount },
      'restaurant seed: done for tenant',
    )
  }
}
