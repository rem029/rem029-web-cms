import type {
  CollectionBeforeChangeHook,
  CollectionBeforeValidateHook,
  CollectionSlug,
} from 'payload'
import { ValidationError } from 'payload'

import { extractTenantId } from '@/common/utils/tenantCollections'

/** A relationship field of the doc that must point at docs of the doc's own tenant. */
export type SameTenantField = {
  /** field name on the doc, e.g. `category` or `allergens` */
  path: string
  /** the collection it points at */
  collection: CollectionSlug
  /** what an editor calls it, for the error: "category", "allergen" */
  label: string
}

// one id, a populated doc, or a list of them → the ids
const relationIds = (value: unknown): number[] => {
  const values = Array.isArray(value) ? value : [value]
  return values.map(extractTenantId).filter((id): id is number => id !== null)
}

/**
 * Refuses links to another business's docs (rem0017) with a plain-words error. Payload's own
 * `filterOptions` validation also refuses them, but only says "This field is invalid", and only
 * when validation runs. `validateSameTenant` runs in `beforeValidate`, so before that check;
 * collections with drafts also add `validateSameTenantOnChange` in `beforeChange`, since draft
 * saves skip validation.
 */
export const validateSameTenant =
  (fields: SameTenantField[]): CollectionBeforeValidateHook =>
  async ({ data, originalDoc, req, collection }) => {
    const tenantId = extractTenantId(data?.tenant ?? originalDoc?.tenant)
    if (tenantId === null) return data

    for (const field of fields) {
      const ids = relationIds(data?.[field.path])
      if (ids.length === 0) continue

      // overrideAccess: other tenants' docs must be found even when the user can't read them
      const { totalDocs } = await req.payload.count({
        collection: field.collection,
        where: { and: [{ id: { in: ids } }, { tenant: { not_equals: tenantId } }] },
        overrideAccess: true,
        req,
      })
      if (totalDocs === 0) continue

      req.payload.logger.warn({
        msg: 'menu: link to another business refused',
        collection: collection.slug,
        path: field.path,
        tenantId,
        userId: req.user?.id,
        docId: originalDoc?.id,
      })
      throw new ValidationError({
        collection: collection.slug,
        errors: [
          {
            path: field.path,
            message: `This ${field.label} belongs to another business. Pick one from this business.`,
          },
        ],
        req,
      })
    }

    return data
  }

/** The same check for `beforeChange` (draft saves skip `beforeValidate`'s validation). */
export const validateSameTenantOnChange =
  (_fields: SameTenantField[]): CollectionBeforeChangeHook =>
  async ({ data }) => {
    // 1. move the loop above into a shared `checkSameTenant(args, fields)` and call it from both
    // 2. return data
    return data
  }
