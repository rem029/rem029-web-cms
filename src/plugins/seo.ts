import { seoPlugin } from '@payloadcms/plugin-seo'
import { GenerateTitle, GenerateURL } from '@payloadcms/plugin-seo/types'

import { extractTenantId } from '@/common/utils/tenantCollections'
import { Menu, Page, Post } from '@/payload-types'
import { getServerSideURL, getTenantURL } from '@/utilities/getURL'

const generateTitle: GenerateTitle<Post | Page | Menu> = ({ doc }) => {
  return doc?.title ? `${doc.title} | CMS Website` : 'CMS Website'
}

// the doc's own tenant url, so previews and canonical urls point at the tenant's site
const generateURL: GenerateURL<Post | Page | Menu> = async ({ doc, req, collectionConfig }) => {
  const slugPath = !doc?.slug || doc.slug === 'home' ? '' : doc.slug
  // menus live under /menu/<slug> (src/app/(frontend)/menu)
  const path = collectionConfig?.slug === 'menus' ? `menu/${doc?.slug ?? ''}` : slugPath
  const tenantId = extractTenantId(doc?.tenant)
  const { docs } = tenantId
    ? await req.payload.find({
        collection: 'tenants',
        where: { id: { equals: tenantId } },
        limit: 1,
        depth: 0,
        req,
      })
    : { docs: [] }
  if (!docs[0]) {
    req.payload.logger.warn({ msg: 'seo generateURL: no tenant', tenantId, docId: doc?.id })
    return `${getServerSideURL()}/${path}`
  }
  return `${getTenantURL(docs[0])}/${path}`
}

export const seo = seoPlugin({
  generateTitle,
  generateURL,
})
