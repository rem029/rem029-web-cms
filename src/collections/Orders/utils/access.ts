import type { Access, Where } from 'payload'

import { allowedTenantIds, isActiveSuperUser, isDisabledUser } from '@/common/utils/access'
import { staffMenuIds } from '@/common/utils/staffRoles'

/**
 * Orders read / update (rem0018 phase 1 step 3a, from step 2's plan): both must allow.
 * - the profile: `orders` <op> in the order's business (`accessCheckResolver('orders', op)`,
 *   which also gives tenant admins and super users their grants)
 * - the menu: the order's menu lists the user as staff (`staffMenuIds`, published menus only);
 *   tenant admins of that business and super users: every menu (`null`)
 * Returns a `where` per allowed business: `{ tenant: { equals: t } }` when staffMenuIds is null,
 * else `{ and: [{ tenant: { equals: t } }, { menu: { in: ids } }] }`, joined with `or`; no
 * business left → false.
 */
export const ordersAccess =
  (op: 'read' | 'update'): Access =>
  async ({ req }) => {
    const { user } = req
    if (!user || isDisabledUser(user)) {
      return false
    }
    if (isActiveSuperUser(user)) {
      return true
    }

    const tenantIds = allowedTenantIds(req, 'orders', op)
    if (tenantIds.length === 0) {
      req.payload.logger.debug({ msg: 'access: denied', slug: 'orders', op, userId: user.id })
      return false
    }

    const clauses: Where[] = []
    for (const tenantId of tenantIds) {
      const menus = await staffMenuIds(req, tenantId)
      if (menus === null) {
        clauses.push({ tenant: { equals: tenantId } })
      } else if (menus.length > 0) {
        clauses.push({
          and: [{ tenant: { equals: tenantId } }, { menu: { in: menus } }],
        })
      }
    }

    if (clauses.length === 0) {
      req.payload.logger.debug({
        msg: 'orders: no menus of user',
        userId: user.id,
        op,
      })
      return false
    }

    return { or: clauses }
  }
