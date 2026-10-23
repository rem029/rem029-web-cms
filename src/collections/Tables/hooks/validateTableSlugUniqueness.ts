import type { CollectionBeforeValidateHook, Where } from 'payload'
import { ValidationError } from 'payload'

import { extractTenantId } from '@/common/utils/tenantCollections'

/**
 * Friendly error for the `(menu, slug)` unique index of tables (rem0018 step 1c), instead of a raw
 * db error: each restaurant or event numbers its own tables. The error sits on `label`, the field the
 * editor typed: `slug` is in the closed sidebar, so an error there only says "slug is invalid".
 */
export const validateTableSlugUniqueness: CollectionBeforeValidateHook = async ({
  data,
  req,
  originalDoc,
}) => {
  const slug = data?.slug ?? originalDoc?.slug
  const menuId = extractTenantId(data?.menu ?? originalDoc?.menu)
  if (!slug || menuId === null) return data

  const where: Where[] = [{ menu: { equals: menuId } }, { slug: { equals: slug } }]
  if (originalDoc?.id) {
    where.push({ id: { not_equals: originalDoc.id } })
  }

  // overrideAccess: uniqueness must hold across tables the current user can't read
  const existing = await req.payload.count({
    collection: 'tables',
    where: { and: where },
    overrideAccess: true,
    req,
  })
  if (existing.totalDocs === 0) return data

  req.payload.logger.warn({
    msg: 'tables: duplicate slug on menu refused',
    slug,
    menuId,
    userId: req.user?.id,
    docId: originalDoc?.id,
  })
  throw new ValidationError({
    collection: 'tables',
    errors: [
      { path: 'label', message: `A table with slug "${slug}" already exists on this menu.` },
    ],
    req,
  })
}
