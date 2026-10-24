import type { ClientUser, PayloadRequest } from 'payload'

import {
  getTenantRows,
  isActiveSuperUser,
  isDisabledUser,
  rowAllows,
  tenantAdminTenantIds,
} from '@/common/utils/access'
import type { User } from '@/payload-types'

/** The staff boards (rem0018 phase 1 step 2), one per `FEATURE_SLUGS` board row. */
export type StaffRole = 'waiter' | 'kitchen' | 'cashier'

/** The board row of each role (`FEATURE_SLUGS`). */
export const STAFF_ROLE_SLUGS = {
  waiter: 'order-waiter',
  kitchen: 'order-kitchen',
  cashier: 'order-cashier',
} as const

const ALL_ROLES: StaffRole[] = ['waiter', 'kitchen', 'cashier']

/**
 * The roles of the user in one tenant: the board rows with `read` ticked on their profile row
 * for that tenant (`rowAllows`). Tenant admins of that tenant and super users: every role.
 * Pure (reads the user's populated tenant rows), so the transition guard can call it per move.
 */
export const staffRolesFor = (
  user: User | ClientUser | null | undefined,
  tenantId: number,
): StaffRole[] => {
  if (!user || isDisabledUser(user)) {
    return []
  }
  if (isActiveSuperUser(user)) {
    return ALL_ROLES
  }
  const row = getTenantRows(user).find((r) => r.tenantId === tenantId)
  if (!row) {
    return []
  }
  return ALL_ROLES.filter((role) => rowAllows(row, STAFF_ROLE_SLUGS[role], 'read'))
}

const isNumberArray = (val: unknown): val is number[] =>
  Array.isArray(val) && val.every((item) => typeof item === 'number')

const isStaffMenuIdsCache = (val: unknown): val is Record<number, number[]> => {
  if (typeof val !== 'object' || val === null || Array.isArray(val)) {
    return false
  }
  for (const [key, value] of Object.entries(val)) {
    if (Number.isNaN(Number(key)) || !isNumberArray(value)) {
      return false
    }
  }
  return true
}

const getStaffMenuIdsCache = (req: PayloadRequest): Record<number, number[]> => {
  const existing = req.context.staffMenuIds
  if (isStaffMenuIdsCache(existing)) {
    return existing
  }
  const cache: Record<number, number[]> = {}
  req.context.staffMenuIds = cache
  return cache
}

/**
 * The menus of one tenant whose orders the user works: the **published** menus of that tenant
 * whose `ordering.staff` lists the user (a draft's staff list applies once it is published).
 * `null` = every menu (tenant admins of that tenant and super users). Cached per request in
 * `req.context` by tenant, since order access asks for it on every read.
 */
export const staffMenuIds = async (
  req: PayloadRequest,
  tenantId: number,
): Promise<number[] | null> => {
  const user = req.user
  if (!user || isDisabledUser(user)) {
    return []
  }
  if (isActiveSuperUser(user) || tenantAdminTenantIds(user).includes(tenantId)) {
    return null
  }

  const cache = getStaffMenuIdsCache(req)
  const cached = cache[tenantId]
  if (cached !== undefined) {
    return cached
  }

  const { docs } = await req.payload.find({
    collection: 'menus',
    where: {
      and: [
        { tenant: { equals: tenantId } },
        { _status: { equals: 'published' } },
        { 'ordering.staff': { contains: user.id } },
      ],
    },
    draft: false,
    overrideAccess: true,
    req,
    depth: 0,
    pagination: false,
    // the id comes back anyway; select keeps the menu's blocks out of the query
    select: { tenant: true },
  })

  const ids = docs.map((doc) => doc.id)
  cache[tenantId] = ids
  req.payload.logger.debug({
    msg: 'staff: menus of user',
    userId: user.id,
    tenantId,
    count: ids.length,
  })

  return ids
}
