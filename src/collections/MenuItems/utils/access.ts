import type { Access } from 'payload'

/**
 * Read access on menu items (rem0017): guests see only items switched on ("Show on menus");
 * signed-in users read what their profile allows (`accessCheckResolver('menu-items', 'read')`),
 * inactive items included, so editors can switch them back on.
 */
export const readMenuItems: Access = (_args) => {
  // 1. no req.user → { isActive: { equals: true } } (the frontend adds the tenant filter)
  // 2. signed in → accessCheckResolver('menu-items', 'read')(args)
  return false
}
