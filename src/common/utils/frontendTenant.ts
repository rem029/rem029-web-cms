import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { getPayload, type Payload, type Where } from 'payload'
import { cache } from 'react'
import { getDefaultTenantId } from '@/common/utils/getTenantDoc'
import { requestHost, resolveTenantHost, type TenantHost } from '@/common/utils/resolveTenantHost'
import { getServerSideURL, getTenantURL } from '@/utilities/getURL'

// inactive tenants are served like unknown hosts (404)
const findActiveTenantId = async (payload: Payload, where: Where): Promise<number | null> => {
  const { docs } = await payload.find({
    collection: 'tenants',
    where: { and: [where, { isActive: { not_equals: false } }] },
    limit: 1,
    depth: 0,
    pagination: false,
  })
  return docs[0]?.id ?? null
}

const lookup = (payload: Payload, resolved: TenantHost): Promise<number | null> => {
  if (resolved.kind === 'default') return getDefaultTenantId()
  if (resolved.kind === 'slug')
    return findActiveTenantId(payload, { slug: { equals: resolved.slug } })
  if (!resolved.domain) return Promise.resolve(null)
  return findActiveTenantId(payload, { 'domains.domain': { equals: resolved.domain } })
}

/**
 * The tenant a host serves: the base domain (or every host while `TENANT_BASE_DOMAIN` is unset)
 * → `admin`, `<slug>.<base>` → that tenant, other hosts → `tenants.domains`. `null` (unknown or
 * inactive) → callers 404. Takes the host as an argument so verify scripts can call it.
 */
export const findFrontendTenantId = async (
  payload: Payload,
  host: string | null | undefined,
  baseDomain: string | undefined,
): Promise<number | null> => {
  const resolved = resolveTenantHost(host, baseDomain)
  const tenantId = await lookup(payload, resolved)
  payload.logger.debug({ msg: 'frontend tenant', host, kind: resolved.kind, tenantId })
  return tenantId
}

export const getFrontendTenantId = cache(async (): Promise<number | null> => {
  const headerList = await headers()
  const host = requestHost((name) => headerList.get(name))
  const payload = await getPayload({ config: configPromise })
  return findFrontendTenantId(payload, host, process.env.TENANT_BASE_DOMAIN)
})

/** The public url of the tenant this request serves (sitemaps, robots, canonical urls). */
export const getFrontendTenantURL = cache(async (): Promise<string> => {
  const tenantId = await getFrontendTenantId()
  if (tenantId === null) return getServerSideURL()

  const payload = await getPayload({ config: configPromise })
  const { docs } = await payload.find({
    collection: 'tenants',
    where: { id: { equals: tenantId } },
    limit: 1,
    depth: 0,
    pagination: false,
  })
  return docs[0] ? getTenantURL(docs[0]) : getServerSideURL()
})

export const frontendTenantWhere = (tenantId: number, where?: Where): Where => {
  const tenantFilter: Where = { tenant: { equals: tenantId } }
  return where ? { and: [tenantFilter, where] } : tenantFilter
}
