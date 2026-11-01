import type { Access, Where } from 'payload'

import { allowedTenantIds, isActiveSuperUser, isDisabledUser } from '@/common/utils/access'
import { staffMenuIds } from '@/common/utils/staffRoles'

/**
 * Read / update of orders and payments (rem0018 phase 1 step 3a; payments since phase 2 step 1,
 * moved here from `Orders/utils/access.ts`): both must allow.
 * - the profile: `<slug>` <op> in the doc's business (`accessCheckResolver(slug, op)`,
 *   which also gives tenant admins and super users their grants)
 * - the menu: the doc's `menu` (an order's own, a payment's copy of its order's) lists the user
 *   as staff (`staffMenuIds`, published menus only); tenant admins of that business and super
 *   users: every menu (`null`)
 * Returns a `where` per allowed business: `{ tenant: { equals: t } }` when staffMenuIds is null,
 * else `{ and: [{ tenant: { equals: t } }, { menu: { in: ids } }] }`, joined with `or`; no
 * business left → false.
 */
export const menuStaffAccess =
  (slug: 'orders' | 'payments', op: 'read' | 'update'): Access =>
  async ({ req }) => {
    const { user } = req
    if (!user || isDisabledUser(user)) {
      return false
    }
    if (isActiveSuperUser(user)) {
      return true
    }

    const tenantIds = allowedTenantIds(req, slug, op)
    if (tenantIds.length === 0) {
      req.payload.logger.debug({ msg: 'access: denied', slug, op, userId: user.id })
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
        msg: `${slug}: no menus of user`,
        userId: user.id,
        op,
      })
      return false
    }

    return { or: clauses }
  }
