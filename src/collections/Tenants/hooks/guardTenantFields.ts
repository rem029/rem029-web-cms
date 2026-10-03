import type { CollectionBeforeOperationHook } from 'payload'
import { Forbidden } from 'payload'
import { isActiveSuperUser } from '@/common/utils/access'

const isRecord = (val: unknown): val is Record<string, unknown> =>
  typeof val === 'object' && val !== null

/**
 * Guard restricted tenant fields (slug, isActive, domains) against non-super user modification.
 *
 * This guard is a beforeOperation hook because Payload strips fields without
 * update access during the beforeValidate field pass, so a beforeChange hook
 * never sees them.
 */
export const guardTenantFields: CollectionBeforeOperationHook = async ({
  args,
  operation,
  req,
}) => {
  const op: string = operation
  if (op !== 'update' && op !== 'updateByID') {
    return args
  }

  if (!isRecord(args)) {
    return args
  }

  if (args.overrideAccess === true || !req.user || isActiveSuperUser(req.user)) {
    return args
  }

  // Bulk update on tenants is forbidden for non-super users
  if (!('id' in args) || args.id === undefined || args.id === null) {
    req.payload.logger.warn({
      msg: 'Bulk update on tenants is forbidden for non-super users',
      userId: req.user.id,
    })
    throw new Forbidden(req.t)
  }

  const targetId = args.id
  if (typeof targetId !== 'number' && typeof targetId !== 'string') {
    return args
  }

  const target = await req.payload.findByID({
    collection: 'tenants',
    id: targetId,
    depth: 0,
    req,
    overrideAccess: true,
  })

  if (!target) {
    return args
  }

  const data = isRecord(args.data) ? args.data : {}
  const changedFields: string[] = []

  // 1. slug: compare trimmed lowercase
  if ('slug' in data) {
    const normalizeSlug = (val: unknown): string =>
      typeof val === 'string' ? val.trim().toLowerCase() : ''

    if (normalizeSlug(data.slug) !== normalizeSlug(target.slug)) {
      changedFields.push('slug')
    }
  }

  // 2. isActive: compare Boolean
  if ('isActive' in data) {
    const dataVal = Boolean(data.isActive)
    const targetVal = Boolean(target.isActive)
    if (dataVal !== targetVal) {
      changedFields.push('isActive')
    }
  }

  // 3. domains: compare list of trimmed lowercase domain strings
  if ('domains' in data) {
    const extractDomainList = (domains: unknown): string[] => {
      if (!Array.isArray(domains)) return []
      const list: string[] = []
      for (const item of domains) {
        if (isRecord(item) && 'domain' in item && typeof item.domain === 'string') {
          list.push(item.domain.trim().toLowerCase())
        }
      }
      return list
    }

    const dataDomains = extractDomainList(data.domains)
    const targetDomains = extractDomainList(target.domains)

    const differs =
      dataDomains.length !== targetDomains.length ||
      dataDomains.some((domain, idx) => domain !== targetDomains[idx])

    if (differs) {
      changedFields.push('domains')
    }
  }

  if (changedFields.length > 0) {
    req.payload.logger.warn({
      msg: 'Non-super user attempted to modify restricted tenant fields',
      userId: req.user.id,
      tenantId: target.id,
      fields: changedFields,
    })
    throw new Forbidden(req.t)
  }

  return args
}
