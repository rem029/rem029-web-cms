import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'
import { revalidatePath, revalidateTag } from 'next/cache'
import { extractTenantId } from '@/common/utils/tenantCollections'
import type { Page } from '../../../payload-types'

export const revalidatePage: CollectionAfterChangeHook<Page> = ({
  doc,
  previousDoc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    const tenantId = extractTenantId(doc?.tenant) ?? extractTenantId(previousDoc?.tenant)
    if (!tenantId) {
      payload.logger.warn({
        msg: 'revalidatePage: no tenant id on doc, skipping sitemap tag',
        docId: doc?.id,
      })
    }
    const sitemapTag = tenantId ? `pages-sitemap_${tenantId}` : null

    if (doc._status === 'published') {
      const path = doc.slug === 'home' ? '/' : `/${doc.slug}`

      payload.logger.info(`Revalidating page at path: ${path}`)

      revalidatePath(path)
      if (sitemapTag) revalidateTag(sitemapTag)
    }

    // If the page was previously published, we need to revalidate the old path
    if (previousDoc?._status === 'published' && doc._status !== 'published') {
      const oldPath = previousDoc.slug === 'home' ? '/' : `/${previousDoc.slug}`

      payload.logger.info(`Revalidating old page at path: ${oldPath}`)

      revalidatePath(oldPath)
      if (sitemapTag) revalidateTag(sitemapTag)
    }
  }
  return doc
}

export const revalidateDelete: CollectionAfterDeleteHook<Page> = ({
  doc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    const path = doc?.slug === 'home' ? '/' : `/${doc?.slug}`
    revalidatePath(path)

    const tenantId = extractTenantId(doc?.tenant)
    if (tenantId) {
      revalidateTag(`pages-sitemap_${tenantId}`)
    } else {
      payload.logger.warn({
        msg: 'revalidateDelete: no tenant id on doc, skipping sitemap tag',
        docId: doc?.id,
      })
    }
  }

  return doc
}
