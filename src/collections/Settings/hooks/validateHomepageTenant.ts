import type { RelationshipFieldSingleValidation } from 'payload'

import type { Setting } from '@/payload-types'

const toId = (value: unknown): number | string | undefined => {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value) return (value as { id: number }).id
  return undefined
}

// filterOptions only narrows the admin picker; this also covers API writes
export const validateHomepageTenant: RelationshipFieldSingleValidation = async (
  value,
  { data, req },
) => {
  const pageId = toId(value)
  const tenantId = toId((data as Partial<Setting>)?.tenant)
  if (!pageId || !tenantId) return true

  const page = await req.payload.findByID({
    collection: 'pages',
    id: pageId,
    depth: 0,
    disableErrors: true,
    req,
  })
  if (!page) return 'Selected homepage does not exist.'

  if (toId(page.tenant) !== tenantId) {
    req.payload.logger.warn({
      msg: 'Blocked homepage from another business',
      tenantId,
      pageId,
      userId: req.user?.id,
    })
    return 'The selected homepage must belong to the same business.'
  }
  return true
}
