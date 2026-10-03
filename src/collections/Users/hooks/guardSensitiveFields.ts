import type { CollectionBeforeOperationHook } from 'payload'
import { Forbidden } from 'payload'
import { isActiveSuperUser } from '@/common/utils/access'

/**
 * Guard sensitive fields against non-super user modification.
 *
 * This guard is a beforeOperation hook because Payload strips fields without
 * update access during the beforeValidate field pass, so a beforeChange hook
 * never sees them.
 */
export const guardSensitiveFields: CollectionBeforeOperationHook = async ({
  args,
  operation,
  req,
}) => {
  const op = operation as string
  if (op !== 'update' && op !== 'updateByID') {
    return args
  }

  if (args?.overrideAccess || !req.user || isActiveSuperUser(req.user)) {
    return args
  }

  // Bulk update by a non-super user is forbidden
  if (!args?.id) {
    req.payload.logger.warn({
      msg: 'Bulk update on users is forbidden for non-super users',
      userId: req.user.id,
    })
    throw new Forbidden(req.t)
  }

  const targetId = args.id
  const target = await req.payload.findByID({
    collection: 'users',
    id: targetId,
    depth: 0,
    req,
    overrideAccess: true,
  })

  if (!target) {
    return args
  }

  const data = args.data || {}
  const changedFields: string[] = []

  // 1. super_user: null/undefined -> false
  if ('super_user' in data) {
    const dataVal = Boolean(data.super_user)
    const targetVal = Boolean(target.super_user)
    if (dataVal !== targetVal) {
      changedFields.push('super_user')
    }
  }

  // 2. is_disabled: null/undefined -> false
  if ('is_disabled' in data) {
    const dataVal = Boolean(data.is_disabled)
    const targetVal = Boolean(target.is_disabled)
    if (dataVal !== targetVal) {
      changedFields.push('is_disabled')
    }
  }

  // 3. access: object -> id
  if ('access' in data) {
    const extractId = (val: unknown): string | number | null => {
      if (val === null || val === undefined) return null
      if (typeof val === 'object' && 'id' in val) {
        return (val as { id: string | number }).id
      }
      return val as string | number
    }
    const dataAccessId = extractId(data.access)
    const targetAccessId = extractId(target.access)
    if (dataAccessId !== targetAccessId) {
      changedFields.push('access')
    }
  }

  // 4. tenants: array of rows; each row's tenant object->id; compare sorted id lists; null/undefined -> []
  if ('tenants' in data) {
    const extractTenantIds = (tenants: unknown): (string | number)[] => {
      if (!Array.isArray(tenants)) return []
      return tenants
        .map((row) => {
          if (!row) return null
          const t = typeof row === 'object' && 'tenant' in row ? row.tenant : row
          if (typeof t === 'object' && t !== null && 'id' in t) {
            return (t as { id: string | number }).id
          }
          return t as string | number
        })
        .filter((id): id is string | number => id != null)
        .sort((a, b) => String(a).localeCompare(String(b)))
    }

    const dataTenantIds = extractTenantIds(data.tenants)
    const targetTenantIds = extractTenantIds(target.tenants)

    const differs =
      dataTenantIds.length !== targetTenantIds.length ||
      dataTenantIds.some((id, idx) => String(id) !== String(targetTenantIds[idx]))

    if (differs) {
      changedFields.push('tenants')
    }
  }

  // 5. email: trim + lowercase
  if ('email' in data) {
    const normalizeEmail = (val: unknown): string =>
      typeof val === 'string' ? val.trim().toLowerCase() : ''

    if (normalizeEmail(data.email) !== normalizeEmail(target.email)) {
      changedFields.push('email')
    }
  }

  if (changedFields.length > 0) {
    req.payload.logger.warn({
      msg: 'Non-super user attempted to modify sensitive fields',
      userId: req.user.id,
      targetId,
      fields: changedFields,
    })
    throw new Forbidden(req.t)
  }

  return args
}
