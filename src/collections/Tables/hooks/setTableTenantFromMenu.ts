import type { CollectionBeforeValidateHook } from 'payload'

import { getTenantRows, isActiveSuperUser, rowAllows } from '@/common/utils/access'
import { extractTenantId } from '@/common/utils/tenantCollections'

/**
 * A new table goes into its menu's business (rem0018 step 1c): "Add new" on a menu's Ordering tab
 * sends the business picked in the admin's selector, which for a super user can be another one
 * than the menu's. Only when the user may add tables there; otherwise the tenant stays as sent
 * and `validateSameTenant` refuses the other business's menu with its plain-words error.
 */
export const setTableTenantFromMenu: CollectionBeforeValidateHook = async ({
  data,
  operation,
  req,
}) => {
  if (operation !== 'create' || !data) return data

  const menuId = extractTenantId(data.menu)
  if (menuId === null) return data

  // overrideAccess: only the menu's tenant is read; access to the table is checked as usual
  const { docs } = await req.payload.find({
    collection: 'menus',
    where: { id: { equals: menuId } },
    select: { tenant: true },
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
  })
  const menuTenantId = extractTenantId(docs[0]?.tenant)
  const sentTenantId = extractTenantId(data.tenant)
  if (menuTenantId === null || menuTenantId === sentTenantId) return data

  const mayCreate =
    isActiveSuperUser(req.user) ||
    getTenantRows(req.user, req.payload.logger).some(
      (row) => row.tenantId === menuTenantId && rowAllows(row, 'tables', 'create'),
    )
  if (!mayCreate) return data

  req.payload.logger.info({
    msg: 'tables: new table put in its menu business',
    menuId,
    fromTenantId: sentTenantId,
    tenantId: menuTenantId,
    userId: req.user?.id,
  })
  return { ...data, tenant: menuTenantId }
}
