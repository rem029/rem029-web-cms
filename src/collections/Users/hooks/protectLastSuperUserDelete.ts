import type { CollectionBeforeDeleteHook } from 'payload'
import { APIError } from 'payload'
import { isActiveSuperUser } from '@/common/utils/access'

/**
 * Prevents deleting the last active super user.
 */
export const protectLastSuperUserDelete: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const target = await req.payload.findByID({
    collection: 'users',
    id,
    depth: 0,
    req,
    overrideAccess: true,
  })

  if (!target || !isActiveSuperUser(target)) {
    return
  }

  const { totalDocs } = await req.payload.count({
    collection: 'users',
    where: {
      and: [
        { id: { not_equals: id } },
        { super_user: { equals: true } },
        { is_disabled: { not_equals: true } },
      ],
    },
    req,
  })

  if (totalDocs === 0) {
    req.payload.logger.warn({
      msg: "Can't remove or disable the last super user",
      userId: req.user?.id,
      targetId: id,
    })
    throw new APIError("Can't remove or disable the last super user", 400)
  }
}
