import type { CollectionBeforeChangeHook, PayloadRequest } from 'payload'
import { DEFAULT_ACCESS_SLUG } from '@/collections/UsersAccess/utils/defaultProfile'

const getDefaultProfileId = async (req: PayloadRequest): Promise<number | string | null> => {
  const { docs } = await req.payload.find({
    collection: 'users-access',
    where: { slug: { equals: DEFAULT_ACCESS_SLUG } },
    depth: 0,
    limit: 1,
    req,
  })
  return docs[0]?.id ?? null
}

/**
 * Assigns the default access profile to new users unless they are super users or
 * already have an access profile explicitly set.
 *
 * Also assigns the default profile when unticking super_user on an existing user
 * if no access profile is set.
 */
export const assignDefaultAccess: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation === 'create') {
    if (data?.super_user || data?.access) return data

    const defaultProfileId = await getDefaultProfileId(req)
    if (defaultProfileId) {
      req.payload.logger.info({
        msg: 'Assigned default access profile to new user',
        email: data?.email,
        accessId: defaultProfileId,
      })
      return { ...data, access: defaultProfileId }
    }

    req.payload.logger.warn({
      msg: 'Default access profile not found; creating user without an access profile',
      email: data?.email,
      slug: DEFAULT_ACCESS_SLUG,
    })

    return data
  }

  if (operation === 'update') {
    const wasSuperUser = originalDoc?.super_user === true
    const untickingSuperUser = data?.super_user === false
    const hasAccess = Boolean(data?.access || originalDoc?.access)

    if (wasSuperUser && untickingSuperUser && !hasAccess) {
      const defaultProfileId = await getDefaultProfileId(req)
      if (defaultProfileId) {
        req.payload.logger.info({
          msg: 'Assigned default access profile to unticked super user',
          userId: originalDoc?.id,
          accessId: defaultProfileId,
        })
        return { ...data, access: defaultProfileId }
      }

      req.payload.logger.warn({
        msg: 'Default access profile not found; unticking super user without an access profile',
        userId: originalDoc?.id,
        slug: DEFAULT_ACCESS_SLUG,
      })
    }
  }

  return data
}
