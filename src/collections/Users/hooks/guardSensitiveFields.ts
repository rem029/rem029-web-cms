import type { CollectionBeforeOperationHook } from 'payload'
import { Forbidden } from 'payload'
import { isActiveSuperUser } from '@/common/utils/access'
import { extractTenantId } from '@/common/utils/tenantCollections'

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

  // 3. tenants: compare sorted (tenant, access) pairs; null/undefined -> []
  if ('tenants' in data) {
    const extractTenantAccessPairs = (tenants: unknown): string[] => {
      if (!Array.isArray(tenants)) return []
      const pairs: { tenantId: number; accessId: number | null; key: string }[] = []
      for (const row of tenants) {
        if (!row || typeof row !== 'object') continue
        const t = 'tenant' in row ? row.tenant : row
        const tenantId = extractTenantId(t)
        if (tenantId === null) continue
        const a = 'access' in row ? row.access : null
        const accessId = extractTenantId(a)
        pairs.push({
          tenantId,
          accessId,
          key: `${tenantId}:${accessId ?? 'null'}`,
        })
      }
      pairs.sort((a, b) => {
        if (a.tenantId !== b.tenantId) {
          return a.tenantId - b.tenantId
        }
        if (a.accessId === b.accessId) return 0
        if (a.accessId === null) return -1
        if (b.accessId === null) return 1
        return a.accessId - b.accessId
      })
      return pairs.map((p) => p.key)
    }

    const dataPairs = extractTenantAccessPairs(data.tenants)
    const targetPairs = extractTenantAccessPairs(target.tenants)

    const differs =
      dataPairs.length !== targetPairs.length ||
      dataPairs.some((key, idx) => key !== targetPairs[idx])

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
