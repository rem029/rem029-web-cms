import type { CollectionBeforeChangeHook } from 'payload'

/**
 * Stamps `createdBy` (on create) and `updatedBy` (every write) with the signed-in user. Writes
 * without a user (seeds, migrations, system jobs) leave both as they are. Added to every
 * collection in `createdUpdatedByCollections` by the `addCreatedUpdatedBy` plugin.
 */
export const setCreatedUpdatedBy: CollectionBeforeChangeHook = ({ req, operation, data }) => {
  const userId = req.user?.id
  if (!userId) return data

  if (operation === 'create') {
    data.createdBy = userId
  }
  data.updatedBy = userId

  return data
}
