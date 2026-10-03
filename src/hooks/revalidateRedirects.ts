import type { CollectionAfterChangeHook } from 'payload'
import { revalidateTag } from 'next/cache'
import { extractTenantId } from '@/common/utils/tenantCollections'

export const revalidateRedirects: CollectionAfterChangeHook = ({
  doc,
  req: { payload, context },
}) => {
  // seeds and scripts run outside next.js, where revalidateTag throws
  if (context.disableRevalidate) return doc

  const tenantId = extractTenantId(doc.tenant)
  if (!tenantId) {
    payload.logger.warn({
      msg: 'revalidateRedirects: no tenant id on doc, skipping',
      docId: doc.id,
    })
    return doc
  }

  const tag = `redirects_${tenantId}`
  payload.logger.info({ msg: 'Revalidating redirects', tag, tenantId })

  revalidateTag(tag)

  return doc
}
