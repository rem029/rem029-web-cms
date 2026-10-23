import type { CollectionBeforeDeleteHook } from 'payload'

/**
 * A table belongs to one menu (rem0018 step 1c), so deleting the menu deletes its tables, in the
 * same transaction (`req`), so a failed delete keeps both. Without it the `tables.menu_id` foreign
 * key (`ON DELETE set null` on a required column) fails the delete with a raw db error.
 * `overrideAccess`: the tables are part of the menu the user may delete; audit logs still record
 * each one with the user.
 */
export const deleteMenuTables: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const { docs } = await req.payload.delete({
    collection: 'tables',
    where: { menu: { equals: id } },
    overrideAccess: true,
    req,
    context: req.context,
  })
  if (docs.length > 0) {
    req.payload.logger.info({
      msg: 'menus: deleted the menu tables with the menu',
      menuId: id,
      tables: docs.length,
      userId: req.user?.id,
    })
  }
}
