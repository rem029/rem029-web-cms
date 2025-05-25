import { Role, RoleCollectionPermissions, RoleGlobalPermissions } from '@/payload-types'
import { CollectionSlug, GlobalSlug, PayloadRequest } from 'payload'

type CollectionPermissionKeys = Exclude<
  keyof NonNullable<RoleCollectionPermissions>[number],
  'slug' | 'id'
>
type GlobalPermissionKeys = Exclude<keyof NonNullable<RoleGlobalPermissions>[number], 'slug' | 'id'>

type PermissionKey<T extends 'collections' | 'globals'> = T extends 'collections'
  ? CollectionPermissionKeys
  : GlobalPermissionKeys

export async function checkAccess<T extends 'collections' | 'globals'>(
  req: PayloadRequest,
  type: T,
  slug: T extends 'collections' ? CollectionSlug : GlobalSlug,
  permission: PermissionKey<T>,
): Promise<boolean> {
  req.payload.logger.info(`Checking access path: ${req.pathname}`)

  const existingRoles = await req.payload.find({
    collection: 'roles',
    req,
  })

  if (existingRoles.totalDocs === 0) {
    req.payload.logger.warn(
      'Skipping check access no roles found. Create new to enable check access',
    )
    return true
  }

  const { user, payload } = req
  if (user?.collection === 'customers') {
    req.payload.logger.warn('Skipping check access for customer user.')
    return false
  }
  if (!user || !user.role) {
    req.payload.logger.warn('Skipping check access, No user found.')
    return false
  }
  if (!user.role) {
    req.payload.logger.warn('Skipping check access, No role found.')
    return true
  }

  req.payload.logger.info(
    `Checking access for user: ${user.email} type: ${type} slug: ${slug} permission: ${permission}`,
  )

  // If user.role is a number, fetch the Role object
  let role: Role | null = null
  if (typeof user.role === 'object' && user.role !== null) {
    role = user.role as Role
  } else if (typeof user.role === 'number' || typeof user.role === 'string') {
    try {
      role = await payload.findByID({
        collection: 'roles',
        id: user.role,
        req,
      })
    } catch {
      return false
    }
  }

  req.payload.logger.warn('Skipping check access, No assigned role not found.')
  if (!role) return false

  req.payload.logger.warn('Skipping check access, user is Super Admin')
  if (role.isAdmin) return true

  // Find the correct permissions array (from tabs)
  const permsTab = role[type]
  if (!permsTab || !Array.isArray(permsTab.permissions)) return false

  // Find the permission object for the target
  const perm = permsTab.permissions.find((p) => p.slug === slug)
  if (!perm) return false

  // Check the specific permission

  const response = !!perm[permission as keyof typeof perm]
  req.payload.logger.warn(`checkAccess response: ${response}`)

  return response
}
