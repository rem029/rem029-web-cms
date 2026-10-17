/** Draft pages for the access-control tests: each test creates its own with a unique slug. */
import type { Payload, RequiredDataFromCollectionSlug } from 'payload'

import type { Page } from '@/payload-types'

import { uniqueName } from '../common/unique'

export const context = { disableRevalidate: true }

/** A draft page's data in a tenant: empty hero and layout, so nothing else is needed. */
export const draftPageData = (
  tenantId: number,
  slug: string,
): RequiredDataFromCollectionSlug<'pages'> => ({
  title: `Access test ${slug}`,
  slug,
  tenant: tenantId,
  hero: { main: { type: 'none' } },
  layout: [],
})

/** A draft page in a tenant, created without a user (overrideAccess), slug `<prefix>-<unique>`. */
export const createDraftPage = async (
  payload: Payload,
  tenantId: number,
  prefix: string,
): Promise<Page> => {
  const slug = uniqueName(prefix)
  return payload.create({
    collection: 'pages',
    draft: true,
    data: draftPageData(tenantId, slug),
    context,
  })
}
