import type { CollectionBeforeChangeHook } from 'payload'
import { DEFAULT_ACCESS_SLUG } from '@/collections/UsersAccess/utils/defaultProfile'

/**
 * Assigns the default access profile to new users unless they are super users or
 * already have an access profile explicitly set.
 */
export const assignDefaultAccess: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation !== 'create') return data

  if (data?.super_user || data?.access) return data

  const { docs } = await req.payload.find({
    collection: 'users-access',
    where: { slug: { equals: DEFAULT_ACCESS_SLUG } },
    depth: 0,
    limit: 1,
    req,
  })

  const defaultProfile = docs[0]
  if (defaultProfile) {
    req.payload.logger.info({
      msg: 'Assigned default access profile to new user',
      email: data?.email,
      accessId: defaultProfile.id,
    })
    return { ...data, access: defaultProfile.id }
  }

  req.payload.logger.warn({
    msg: 'Default access profile not found; creating user without an access profile',
    email: data?.email,
    slug: DEFAULT_ACCESS_SLUG,
  })

  return data
}
