import type { CollectionBeforeChangeHook } from 'payload'

export const setCreatedUpdatedByCollection: CollectionBeforeChangeHook = ({
  req,
  operation,
  data,
}) => {
  const userId = req.user?.id
  if (!userId) return data

  if (operation === 'create') {
    data.createdBy = userId
  }
  data.updatedBy = userId

  return data
}
