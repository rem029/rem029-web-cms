import configPromise from '@payload-config'
import { getPayload, type Where } from 'payload'
import { cache } from 'react'
import { getDefaultTenantId } from '@/common/utils/getTenantDoc'

/**
 * The tenant the public site serves.
 * Until rem0011 phase 1 maps host → tenant, every host serves `admin`.
 * Phase 1 replaces this body.
 */
export const getFrontendTenantId = cache(async (): Promise<number | null> => {
  const payload = await getPayload({ config: configPromise })
  const tenantId = await getDefaultTenantId()

  payload.logger.debug({ msg: 'frontend tenant', tenantId, source: 'default' })

  return tenantId
})

export const frontendTenantWhere = (tenantId: number, where?: Where): Where => {
  const tenantFilter: Where = {
    tenant: {
      equals: tenantId,
    },
  }

  return where ? { and: [tenantFilter, where] } : tenantFilter
}
