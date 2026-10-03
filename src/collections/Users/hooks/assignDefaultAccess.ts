import type { CollectionBeforeChangeHook, PayloadRequest } from 'payload'
import { DEFAULT_ACCESS_SLUG } from '@/collections/UsersAccess/utils/defaultProfile'
import { extractTenantId } from '@/common/utils/tenantCollections'

const getDefaultProfileId = async (req: PayloadRequest): Promise<number | null> => {
  const { docs } = await req.payload.find({
    collection: 'users-access',
    where: { slug: { equals: DEFAULT_ACCESS_SLUG } },
    depth: 0,
    limit: 1,
    req,
  })
  const first = docs[0]
  return typeof first?.id === 'number' ? first.id : null
}

/**
 * Assigns the default access profile to each tenant row without an access profile on new
 * or updated non-super users.
 *
 * Super users bypass access profiles and are returned unchanged.
 *
 * When super_user is unticked on update and data.tenants is not provided, stored rows in
 * originalDoc.tenants missing access are populated with the default profile.
 */
export const assignDefaultAccess: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  const isResultSuperUser =
    data?.super_user !== undefined
      ? Boolean(data.super_user)
      : Boolean(originalDoc?.super_user)

  if (isResultSuperUser) {
    return data
  }

  // If data.tenants is provided as an array and has rows without access, fill them
  if (Array.isArray(data?.tenants)) {
    const hasRowWithoutAccess = data.tenants.some((row) => row && row.access == null)
    if (hasRowWithoutAccess) {
      const defaultProfileId = await getDefaultProfileId(req)
      if (!defaultProfileId) {
        req.payload.logger.warn({
          msg: 'Default access profile not found; skipping default access assignment',
          userId: originalDoc?.id,
          email: data?.email,
          slug: DEFAULT_ACCESS_SLUG,
        })
        return data
      }

      const tenantIds: number[] = []
      const updatedTenants = data.tenants.map((row) => {
        if (!row) return row
        if (row.access == null) {
          const tenantId = extractTenantId(row.tenant)
          if (tenantId !== null) {
            tenantIds.push(tenantId)
          }
          return { ...row, access: defaultProfileId }
        }
        return row
      })

      req.payload.logger.info({
        msg: 'Assigned default access profile to user tenants',
        userId: originalDoc?.id,
        email: data?.email,
        tenantIds,
      })

      return { ...data, tenants: updatedTenants }
    }
  }

  // When unticking super_user on update and data.tenants is not sent, populate stored rows
  if (
    operation === 'update' &&
    originalDoc?.super_user === true &&
    data?.super_user === false &&
    data?.tenants === undefined
  ) {
    const storedTenants = originalDoc.tenants
    if (Array.isArray(storedTenants) && storedTenants.length > 0) {
      const hasRowWithoutAccess = storedTenants.some((row) => row && row.access == null)
      if (hasRowWithoutAccess) {
        const defaultProfileId = await getDefaultProfileId(req)
        if (!defaultProfileId) {
          req.payload.logger.warn({
            msg: 'Default access profile not found; unticking super user without filling default access',
            userId: originalDoc.id,
            email: data?.email ?? originalDoc.email,
            slug: DEFAULT_ACCESS_SLUG,
          })
          return data
        }

        const tenantIds: number[] = []
        const filledRows = storedTenants
          .map((row) => {
            if (!row) return null
            const tenantId = extractTenantId(row.tenant)
            if (tenantId === null) return null
            const existingAccessId = extractTenantId(row.access)
            const accessId = existingAccessId ?? defaultProfileId
            if (row.access == null) {
              tenantIds.push(tenantId)
            }
            return {
              ...(row.id ? { id: row.id } : {}),
              tenant: tenantId,
              access: accessId,
            }
          })
          .filter((row): row is NonNullable<typeof row> => row !== null)

        req.payload.logger.info({
          msg: 'Assigned default access profile to unticked super user stored tenants',
          userId: originalDoc.id,
          email: data?.email ?? originalDoc.email,
          tenantIds,
        })

        return { ...data, tenants: filledRows }
      }
    }
  }

  return data
}
