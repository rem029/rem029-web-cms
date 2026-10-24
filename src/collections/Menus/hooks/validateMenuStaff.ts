import type { CollectionBeforeValidateHook } from 'payload'
import { ValidationError } from 'payload'

import { extractTenantId } from '@/common/utils/tenantCollections'

const relationIds = (value: unknown): number[] => {
  if (!Array.isArray(value)) return []
  return value.map(extractTenantId).filter((id): id is number => id !== null)
}

/**
 * Refuses a menu's `ordering.staff` entry that is not a member of the menu's tenant (rem0018
 * phase 1 step 2), with a plain-words error. A `beforeValidate` hook, so drafts (autosave) are
 * checked too: Payload skips the field's `filterOptions` validation there.
 */
export const validateMenuStaff: CollectionBeforeValidateHook = async ({
  data,
  originalDoc,
  req,
  collection,
}) => {
  const tenantId = extractTenantId(data?.tenant ?? originalDoc?.tenant)
  if (tenantId === null) return data

  const staff = data?.ordering && 'staff' in data.ordering ? data.ordering.staff : undefined
  if (!staff) return data

  const ids = relationIds(staff)
  if (ids.length === 0) return data

  const { docs: validUsers } = await req.payload.find({
    collection: 'users',
    where: {
      and: [{ id: { in: ids } }, { 'tenants.tenant': { equals: tenantId } }],
    },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })

  const validSet = new Set(validUsers.map((u) => u.id))
  const refusedIds = ids.filter((id) => !validSet.has(id))
  if (refusedIds.length === 0) return data

  const { docs: refusedUsers } = await req.payload.find({
    collection: 'users',
    where: { id: { in: refusedIds } },
    depth: 0,
    pagination: false,
    select: { name: true, email: true },
    overrideAccess: true,
    req,
  })

  req.payload.logger.warn({
    msg: 'menu: staff outside the business refused',
    menuId: originalDoc?.id,
    tenantId,
    userId: req.user?.id,
    refusedIds,
  })

  const names = refusedUsers.map((u) => u.name || u.email).filter(Boolean)
  const nameLabel = names.length > 0 ? names.join(', ') : refusedIds.join(', ')

  throw new ValidationError({
    collection: collection.slug,
    errors: [
      {
        path: 'ordering.staff',
        message: `${nameLabel} is not a member of this business. Add them to the business first.`,
      },
    ],
    req,
  })
}
