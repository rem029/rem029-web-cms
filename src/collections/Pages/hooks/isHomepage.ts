import type { FieldHook, PayloadRequest } from 'payload'
import { extractTenantId } from '@/common/utils/tenantCollections'

// extractTenantId narrows any relationship value (id or populated doc) to its numeric id
const toId = extractTenantId

type HomepageIds = Map<number, number | null>

// one settings read per tenant per request, so a list of pages costs one query per tenant
const homepageIdsOf = (req: PayloadRequest): HomepageIds => {
  const existing = req.context.homepageIds
  if (existing instanceof Map) return existing
  const ids: HomepageIds = new Map()
  req.context.homepageIds = ids
  return ids
}

const homepageIdOf = async (req: PayloadRequest, tenantId: number): Promise<number | null> => {
  const ids = homepageIdsOf(req)
  const cached = ids.get(tenantId)
  if (cached !== undefined) return cached

  const { docs } = await req.payload.find({
    collection: 'settings',
    where: { tenant: { equals: tenantId } },
    depth: 0,
    limit: 1,
    req,
  })
  const homepageId = toId(docs[0]?.homepage)
  ids.set(tenantId, homepageId)
  return homepageId
}

/**
 * Virtual `isHomepage`: whether this is the page the tenant serves at `/` (admin only): the page
 * picked in Settings → Homepage, or, when none is picked, the page with slug `home` (same order as
 * `findHomePage`).
 */
export const isHomepage: FieldHook = async ({ req, siblingData }) => {
  // the public site doesn't need it: skip the settings read for visitors
  if (!req.user) return undefined

  const pageId = toId(siblingData?.id)
  const tenantId = extractTenantId(siblingData?.tenant)
  if (!pageId || !tenantId) return false

  const homepageId = await homepageIdOf(req, tenantId)
  return homepageId ? homepageId === pageId : siblingData?.slug === 'home'
}
