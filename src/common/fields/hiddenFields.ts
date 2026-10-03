import type { Field, FieldHook, PayloadRequest, Where } from 'payload'
import { ValidationError } from 'payload'
import type { User } from '@/payload-types'
import { canManageHidden, showHiddenControl } from '@/common/utils/hidden'
import { NOT_SUPER_USER } from '@/common/utils/access'
// a relationship value (id or populated doc) → numeric id; works for any collection
import { extractTenantId as relationId } from '@/common/utils/tenantCollections'

const uniqueIds = (value: unknown): number[] => {
  if (!Array.isArray(value)) return []
  const ids: number[] = []
  for (const item of value) {
    const id = relationId(item)
    if (id !== null && !ids.includes(id)) ids.push(id)
  }
  return ids
}

/**
 * Users added to "Visible to" must have a row for the doc's tenant and not be super users.
 * Only added users are checked, so someone who left the business doesn't block saving. A hook,
 * not `validate`: Payload skips validation on draft saves (autosave).
 */
/** Tenant admins of a tenant, checked per row (an array `where` can match two different rows). */
const tenantAdminIdsOf = async (req: PayloadRequest, tenantId: number): Promise<number[]> => {
  const { docs } = await req.payload.find({
    collection: 'users',
    where: { 'tenants.tenant': { equals: tenantId } },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  return docs
    .filter((user) =>
      (user.tenants ?? []).some(
        (row) => row.isTenantAdmin === true && relationId(row.tenant) === tenantId,
      ),
    )
    .map((user) => user.id)
}

const checkVisibleTo: FieldHook = async ({ value, previousValue, data, originalDoc, req }) => {
  const previousIds = uniqueIds(previousValue)
  const addedIds = uniqueIds(value).filter((id) => !previousIds.includes(id))
  if (addedIds.length === 0) return value

  const tenantId = relationId(data?.tenant ?? originalDoc?.tenant)

  for (const targetId of addedIds) {
    let user: User | null = null
    try {
      user = await req.payload.findByID({
        collection: 'users',
        id: targetId,
        depth: 0,
        overrideAccess: true,
        req,
      })
    } catch {
      user = null
    }

    const isMember =
      tenantId !== null &&
      user !== null &&
      user.super_user !== true &&
      (user.tenants ?? []).some((row) => relationId(row.tenant) === tenantId)
    if (isMember) continue

    req.payload.logger.warn({
      msg: 'hidden: visibleTo rejected',
      userId: req.user?.id,
      targetId,
      tenantId,
    })
    throw new ValidationError({
      errors: [
        {
          message: `${user?.name || 'User ' + targetId} isn't a member of this business`,
          path: 'visibleTo',
        },
      ],
    })
  }

  return value
}

export const hiddenFields = (options?: { description?: string }): Field[] => [
  {
    name: 'isHidden',
    type: 'checkbox',
    label: 'Hide from other members',
    defaultValue: false,
    access: {
      create: canManageHidden,
      update: canManageHidden,
    },
    admin: {
      position: 'sidebar',
      condition: showHiddenControl,
      ...(options?.description ? { description: options.description } : {}),
    },
  },
  {
    name: 'visibleTo',
    type: 'relationship',
    relationTo: 'users',
    hasMany: true,
    label: 'Visible to',
    access: {
      create: canManageHidden,
      update: canManageHidden,
    },
    admin: {
      position: 'sidebar',
      condition: (data) => Boolean(data?.isHidden),
      // a side drawer with the users list (search, columns) instead of a dropdown
      appearance: 'drawer',
      // pick existing members only; adding or editing people happens in Users
      allowCreate: false,
      allowEdit: false,
      description:
        'Who else can see this: click the box to pick people. You, tenant admins and super users always can.',
    },
    // members of the doc's tenant who don't already see it: not you, the creator, its tenant
    // admins or super users
    filterOptions: async ({ data, req }) => {
      const tenantId = relationId(data?.tenant)
      if (tenantId === null) return false

      const excluded = [
        req.user?.id,
        relationId(data?.createdBy),
        ...(await tenantAdminIdsOf(req, tenantId)),
      ]
        .map((id) => relationId(id))
        .filter((id): id is number => id !== null)
      const memberBranch: Where = {
        and: [
          { 'tenants.tenant': { equals: tenantId } },
          NOT_SUPER_USER,
          ...(excluded.length > 0 ? [{ id: { not_in: excluded } }] : []),
        ],
      }

      // the UI filter also admits the current value: Payload validates filterOptions server-side,
      // and a listed user who left the business must not block saving (checkVisibleTo checks
      // added users)
      const currentIds = uniqueIds(data?.visibleTo)
      return currentIds.length > 0
        ? { or: [memberBranch, { id: { in: currentIds } }] }
        : memberBranch
    },
    hooks: { beforeChange: [checkVisibleTo] },
  },
]

export const hiddenBannerField: Field = {
  name: 'hiddenBanner',
  type: 'ui',
  admin: {
    components: {
      Field: '@/common/components/HiddenBanner#HiddenBanner',
    },
  },
}
