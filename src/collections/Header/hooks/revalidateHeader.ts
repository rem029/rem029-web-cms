import type { CollectionAfterChangeHook } from 'payload'
import { revalidateTag } from 'next/cache'

export const revalidateHeader: CollectionAfterChangeHook = ({ doc, req: { payload, context } }) => {
  if (!context.disableRevalidate) {
    const tenantId = typeof doc?.tenant === 'object' ? doc.tenant?.id : doc?.tenant
    const tag = `header_${tenantId}`
    payload.logger.info({ msg: 'Revalidating header', tag, tenantId, docId: doc.id })
    revalidateTag(tag)
  }

  return doc
}
