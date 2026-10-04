import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'
import { revalidatePath, revalidateTag } from 'next/cache'
import { extractTenantId } from '@/common/utils/tenantCollections'
import type { Post } from '../../../payload-types'

export const revalidatePost: CollectionAfterChangeHook<Post> = ({
  doc,
  previousDoc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    const tenantId = extractTenantId(doc?.tenant) ?? extractTenantId(previousDoc?.tenant)
    if (!tenantId) {
      payload.logger.warn({
        msg: 'revalidatePost: no tenant id on doc, skipping sitemap tag',
        docId: doc?.id,
      })
    }
    const sitemapTag = tenantId ? `posts-sitemap_${tenantId}` : null

    if (doc._status === 'published') {
      const path = `/posts/${doc.slug}`

      payload.logger.info(`Revalidating post at path: ${path}`)

      revalidatePath(path)
      if (sitemapTag) revalidateTag(sitemapTag)
    }

    // If the post was previously published, we need to revalidate the old path
    if (previousDoc?._status === 'published' && doc._status !== 'published') {
      const oldPath = `/posts/${previousDoc.slug}`

      payload.logger.info(`Revalidating old post at path: ${oldPath}`)

      revalidatePath(oldPath)
      if (sitemapTag) revalidateTag(sitemapTag)
    }
  }
  return doc
}

export const revalidateDelete: CollectionAfterDeleteHook<Post> = ({
  doc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    const path = `/posts/${doc?.slug}`
    revalidatePath(path)

    const tenantId = extractTenantId(doc?.tenant)
    if (tenantId) {
      revalidateTag(`posts-sitemap_${tenantId}`)
    } else {
      payload.logger.warn({
        msg: 'revalidateDelete: no tenant id on post, skipping sitemap tag',
        docId: doc?.id,
      })
    }
  }

  return doc
}
