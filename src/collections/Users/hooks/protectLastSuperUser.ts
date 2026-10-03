import type { CollectionBeforeChangeHook } from 'payload'
import { APIError } from 'payload'
import { isActiveSuperUser } from '@/common/utils/access'

/**
 * Prevents removing or disabling the last active super user on update.
 */
export const protectLastSuperUser: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation !== 'update' || !originalDoc) {
    return data
  }

  if (!isActiveSuperUser(originalDoc)) {
    return data
  }

  const untickingSuperUser = data.super_user === false
  const tickingDisabled = data.is_disabled === true

  if (!untickingSuperUser && !tickingDisabled) {
    return data
  }

  const { totalDocs } = await req.payload.count({
    collection: 'users',
    where: {
      and: [
        { id: { not_equals: originalDoc.id } },
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
      targetId: originalDoc.id,
    })
    throw new APIError("Can't remove or disable the last super user", 400)
  }

  return data
}
