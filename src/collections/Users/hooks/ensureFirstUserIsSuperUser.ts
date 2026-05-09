import { CollectionBeforeChangeHook } from 'payload'

export const ensureFirstUserIsSuperUser: CollectionBeforeChangeHook = async ({
  data,
  operation,
  req,
}) => {
  if (operation === 'create') {
    const users = await req.payload.find({
      collection: 'users',
      limit: 0,
      depth: 0,
    })

    if (users.totalDocs === 0) {
      return {
        ...data,
        super_user: true,
      }
    }
  }

  return data
}
