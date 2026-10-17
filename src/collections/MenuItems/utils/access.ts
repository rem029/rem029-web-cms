import type { Access } from 'payload'

import { accessCheckResolver } from '@/common/utils/access'

const readFromProfile = accessCheckResolver('menu-items', 'read')

/**
 * Read access on menu items (rem0017): guests see only items switched on ("Show on menus"; the
 * frontend adds the tenant filter); signed-in users read what their profile allows, inactive
 * items included, so editors can switch them back on.
 */
export const readMenuItems: Access = (args) => {
  if (!args.req.user) return { isActive: { equals: true } }
  return readFromProfile(args)
}
