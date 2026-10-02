import type { CollectionBeforeChangeHook } from 'payload'

import { DEFAULT_TENANT_SLUG } from '@/common/utils/defaultTenant'

/**
 * The very first user becomes a super user and a member of the default tenant, so a fresh
 * install always has someone who can manage everything. Runs after field access is applied,
 * so it can set `tenants` even though only super users may edit it.
 */
export const setupFirstUser: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation !== 'create') return data

  const { totalDocs } = await req.payload.count({ collection: 'users', req })
  if (totalDocs > 0) return data

  const { docs } = await req.payload.find({
    collection: 'tenants',
    where: { slug: { equals: DEFAULT_TENANT_SLUG } },
    limit: 1,
    depth: 0,
    req,
  })
  const defaultTenant = docs[0]

  if (!defaultTenant) {
    req.payload.logger.warn({
      msg: 'First user: default tenant not found, creating super user without a tenant membership',
      tenantSlug: DEFAULT_TENANT_SLUG,
    })
    return { ...data, super_user: true }
  }

  req.payload.logger.info({
    msg: 'First user: granting super user and default tenant membership',
    tenantId: defaultTenant.id,
  })
  return { ...data, super_user: true, tenants: [{ tenant: defaultTenant.id }] }
}
