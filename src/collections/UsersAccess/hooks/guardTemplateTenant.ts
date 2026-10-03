import type { CollectionBeforeChangeHook } from 'payload'
import { ValidationError } from 'payload'
import type { UsersAccess } from '@/payload-types'
import { getAdminTenantId } from '@/common/utils/adminTenant'
import { extractTenantId } from '@/common/utils/tenantCollections'

/**
 * Enforces that only profiles belonging to the platform business (admin)
 * can be marked as templates.
 */
export const guardTemplateTenant: CollectionBeforeChangeHook<UsersAccess> = async ({
  data,
  originalDoc,
  req,
}) => {
  const isTemplate = data?.isTemplate ?? originalDoc?.isTemplate
  if (isTemplate !== true) {
    return data
  }

  const tenantId = extractTenantId(data?.tenant ?? originalDoc?.tenant)
  const adminTenantId = await getAdminTenantId(req)

  if (tenantId === null || adminTenantId === null || tenantId !== adminTenantId) {
    req.payload.logger.warn({
      msg: 'users-access: only profiles of the platform business (admin) can be templates',
      userId: req.user?.id,
      tenantId,
      adminTenantId,
      profileId: originalDoc?.id,
    })
    throw new ValidationError({
      errors: [
        {
          message: 'Only profiles of the platform business (admin) can be templates.',
          path: 'isTemplate',
        },
      ],
    })
  }

  return data
}
