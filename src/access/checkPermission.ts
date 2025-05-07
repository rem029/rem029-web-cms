import type { User, Role } from '@/payload-types' // Adjust if your payload-types path is different
import { Access, CollectionSlug, GlobalSlug } from 'payload'

type CollectionAction = 'create' | 'read' | 'update' | 'delete'
type GlobalAction = 'read' | 'update'
type ItemType = 'global' | 'collection'

interface CheckPermissionArgs {
  user?: User | null
  slug: CollectionSlug | GlobalSlug
  action: CollectionAction | GlobalAction
  type: ItemType
}

export const checkPermission = ({ user, type, slug, action }: CheckPermissionArgs): boolean => {
  if (!user) {
    // default allow public read access
    return action === 'read'
  }
  if (!user.role) return false

  const currentRole = user.role as Role

  if (currentRole?.isAdmin) return true

  if (type === 'collection' && currentRole.collections?.permissions) {
    const permissions = currentRole.collections?.permissions.find((p) => p.collection === slug)
    if (action === 'read') {
      return permissions?.canRead || false
    }
    if (action === 'create') {
      return permissions?.canCreate || false
    }
    if (action === 'update') {
      return permissions?.canUpdate || false
    }
    if (action === 'delete') {
      return permissions?.canDelete || false
    }
  }

  if (type === 'global' && currentRole.globals?.permissions) {
    const permissions = currentRole.globals?.permissions.find((p) => p.global === slug)
    if (action === 'read') {
      return permissions?.canRead || false
    }
    if (action === 'update') {
      return permissions?.canUpdate || false
    }
  }

  return false // No permission found
}
