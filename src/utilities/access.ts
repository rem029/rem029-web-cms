import { Config, User, Role } from '@/payload-types'
import { Access, CollectionConfig, PayloadRequest, Where } from 'payload'

// Simplified types based on the current project structure
// In the user's sample, they had a 'users-access' collection. 
// In this project, we have a 'roles' collection.
type UserWithRole = User & {
  role?: Role | string | null
}

export type Slugs =
  | keyof Config['collections']
  | keyof Config['globals']

export type AccessArgs = {
  fallbackAccess?: boolean
  reqOverride?: PayloadRequest
  where?: Where
  refineAccess?: (hasAccess: boolean, slug: Slugs, req: PayloadRequest) => Promise<boolean | Where>
}

type AccessArgsInternal = AccessArgs & { reqOverride: PayloadRequest }

export const accessCheck = async (slug: Slugs, type: 'canRead' | 'canCreate' | 'canUpdate' | 'canDelete' | 'admin' | 'super_user', args: AccessArgsInternal) => {
  const { fallbackAccess, reqOverride: req, where, refineAccess } = args
  const { payload: p, user } = req
  
  const typedUser = user as UserWithRole | null
  let defaultAccessReturn = fallbackAccess ?? false

  if (typedUser?.super_user) {
    return true
  }

  // If the user has a role, check permissions within that role
  if (typedUser?.role && typeof typedUser.role !== 'string') {
    const role = typedUser.role as Role
    
    // Check if it's an admin role
    if (role.isAdmin) return true

    // Check specific collection permissions
    const collectionPermission = role.collections?.permissions?.find(p => p.collection === slug)
    if (collectionPermission) {
      if (type === 'canRead' && collectionPermission.canRead) defaultAccessReturn = true
      if (type === 'canCreate' && collectionPermission.canCreate) defaultAccessReturn = true
      if (type === 'canUpdate' && collectionPermission.canUpdate) defaultAccessReturn = true
      if (type === 'canDelete' && collectionPermission.canDelete) defaultAccessReturn = true
    }

    // Check specific global permissions
    const globalPermission = role.globals?.permissions?.find(p => p.global === slug)
    if (globalPermission) {
      if (type === 'canRead' && globalPermission.canRead) defaultAccessReturn = true
      if (type === 'canUpdate' && globalPermission.canUpdate) defaultAccessReturn = true
    }
  }

  if (refineAccess) {
    return await refineAccess(defaultAccessReturn, slug, req)
  }

  if (where && defaultAccessReturn) {
    return where
  }

  return defaultAccessReturn
}

export const accessCheckResolver = (
  slug: Slugs,
  type: 'canRead' | 'canCreate' | 'canUpdate' | 'canDelete' | 'admin',
  args: AccessArgs = {},
): Access => {
  return (async ({ req }) =>
    await accessCheck(slug, type, {
      ...args,
      reqOverride: req,
    })) as Access
}
