import {
  APIError,
  ValidationError,
  type CollectionBeforeChangeHook,
  type PayloadRequest,
} from 'payload'

import { DEFAULT_ORDER_FLOW } from '@/collections/Menus/fields/ordering'
import { isActiveSuperUser, tenantAdminTenantIds } from '@/common/utils/access'
import {
  businessDate,
  isOpenAt,
  nextOpening,
  WEEKDAY_LABELS,
  type OpeningHours,
} from '@/common/utils/restaurantHours'
import { staffRolesFor } from '@/common/utils/staffRoles'
import { extractTenantId } from '@/common/utils/tenantCollections'
import type { Order } from '@/payload-types'

import { checkMove, type MoveActor } from '../utils/transitions'

type RestaurantRules = {
  timezone: string
  dayStartsAt: string
  openingHours: OpeningHours[]
  ordersOnlyWhenOpen: boolean
}

// the business's Restaurant settings (no settings: UTC, 00:00, always open)
const restaurantRules = async (req: PayloadRequest, tenantId: number): Promise<RestaurantRules> => {
  const { docs } = await req.payload.find({
    collection: 'settings',
    where: { tenant: { equals: tenantId } },
    overrideAccess: true,
    req,
    depth: 0,
    limit: 1,
  })
  const restaurant = docs[0]?.restaurant
  return {
    timezone: restaurant?.timezone || 'UTC',
    dayStartsAt: restaurant?.dayStartsAt || '00:00',
    openingHours: restaurant?.openingHours ?? [],
    ordersOnlyWhenOpen: restaurant?.ordersOnlyWhenOpen === true,
  }
}

// a new order's tenant: its own, else its menu's (the plugin fills `tenant` later from the cookie)
const newOrderTenantId = async (
  req: PayloadRequest,
  data: Partial<Order>,
): Promise<number | null> => {
  const tenantId = extractTenantId(data.tenant)
  const menuId = extractTenantId(data.menu)
  if (tenantId !== null || menuId === null) return tenantId

  const menu = await req.payload.findByID({
    collection: 'menus',
    id: menuId,
    depth: 0,
    overrideAccess: true,
    req,
    disableErrors: true,
  })
  return menu ? extractTenantId(menu.tenant) : null
}

const actorFor = (req: PayloadRequest, tenantId: number | null): MoveActor => {
  // every account is a `users` doc; a Local API call may pass one without `collection` set
  const user = req.user ?? null
  if (!user) return { kind: 'guest' }
  if (tenantId === null) return { kind: 'staff', roles: [], isManager: isActiveSuperUser(user) }
  return {
    kind: 'staff',
    roles: staffRolesFor(user, tenantId),
    isManager: isActiveSuperUser(user) || tenantAdminTenantIds(user).includes(tenantId),
  }
}

// create: the start status, and guest orders only while open when the business asks for it
const guardNewOrder = async (req: PayloadRequest, data: Partial<Order>): Promise<void> => {
  const startStatuses = data.source === 'pos' ? ['pending', 'confirmed'] : ['pending']
  if (data.status && !startStatuses.includes(data.status)) {
    throw new ValidationError({
      collection: 'orders',
      errors: [{ path: 'status', message: 'New orders start as Pending.' }],
      req,
    })
  }

  const isGuest = (!data.source || data.source === 'guest') && !req.user
  const tenantId = isGuest ? await newOrderTenantId(req, data) : null
  if (tenantId === null) return

  const rules = await restaurantRules(req, tenantId)
  const now = new Date()
  if (!rules.ordersOnlyWhenOpen || isOpenAt(rules.openingHours, rules.timezone, now)) return

  const next = nextOpening(rules.openingHours, rules.timezone, now)
  req.payload.logger.warn({
    msg: 'order: guest order refused while closed',
    tenantId,
    menuId: extractTenantId(data.menu),
  })
  throw new APIError(
    next
      ? `We're closed now. Orders open again ${WEEKDAY_LABELS[next.weekday]} at ${next.opens}.`
      : "We're closed now.",
    403,
    undefined,
    true,
  )
}

/**
 * Refuses status moves the user may not make (rem0018 phase 1 step 3b), from the rules in
 * `utils/transitions.ts`. Runs first in `beforeChange`, so a refused order never gets a snapshot
 * or a number. Guests are calls without a user (the guest server actions, phase 3).
 */
export const transitionGuard: CollectionBeforeChangeHook<Order> = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation === 'create') {
    await guardNewOrder(req, data)
    return data
  }

  const from = originalDoc?.status
  const to = data.status
  // no move: other edits are access's business
  if (!originalDoc || !from || !to || to === from) return data

  const tenantId = extractTenantId(originalDoc.tenant)
  // moving a completed order back is same-day only; the settings are read only then
  const rules = from === 'completed' && tenantId !== null ? await restaurantRules(req, tenantId) : null
  const sameBusinessDay =
    !rules || originalDoc.orderDate === businessDate(new Date(), rules.timezone, rules.dayStartsAt)

  const refusal = checkMove({
    from,
    to,
    flow: originalDoc.flow ?? DEFAULT_ORDER_FLOW,
    actor: actorFor(req, tenantId),
    cancelReason: data.cancelReason !== undefined ? data.cancelReason : originalDoc.cancelReason,
    sameBusinessDay,
  })

  const log = { orderId: originalDoc.id, tenantId, userId: req.user?.id, from, to }
  if (!refusal) {
    req.payload.logger.debug({ msg: 'order: status move', ...log })
    return data
  }

  req.payload.logger.warn({ msg: 'order: status move refused', ...log, reason: refusal.message })
  if (refusal.status === 403) {
    throw new APIError(refusal.message, 403, undefined, true)
  }
  throw new ValidationError({
    collection: 'orders',
    errors: [{ path: refusal.path, message: refusal.message }],
    req,
  })
}
