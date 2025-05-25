import { Role } from '@/payload-types'
import { CollectionBeforeChangeHook } from 'payload'

export const validateAdmin: CollectionBeforeChangeHook<Role> = async ({ data }) => {
  // Ensure admin role has isAdmin set to true
  if (data.name?.toLowerCase() === 'admin' && !data.isAdmin) {
    data.isAdmin = true
  }
  return data
}

export const validateRoleShouldHaveOneAdmin: CollectionBeforeChangeHook<Role> = async ({
  data,
  req,
}) => {
  if (!data.isAdmin) {
    const roles = await req.payload.find({
      collection: 'roles',
      where: { isAdmin: { equals: true } },
    })

    if (roles.docs.length === 0) {
      throw new Error('At least one role must be an admin role')
    }
  }

  return data
}
