import { Config, User, UsersAccess } from '@/payload-types'
import { Access, CollectionConfig, PayloadRequest, Where } from 'payload'

export type AccessItem = NonNullable<UsersAccess['access']>[number]
export type AccessType = Exclude<keyof AccessItem, 'id'>
export type AccessAdmin = NonNullable<NonNullable<CollectionConfig['access']>['admin']>
export type Slugs =
  | keyof Config['collectionsSelect']
  | keyof Config['globalsSelect']
  | keyof Config['globals']
export type AccessArgs = {
  fallbackAccess?: boolean
  reqOverride?: PayloadRequest
  where?: Where
  refineAccess?: (hasAccess: boolean, slug: string, req: PayloadRequest) => Promise<boolean | Where>
}
type AccessArgsInternal = AccessArgs & { reqOverride: PayloadRequest }

export const accessCheck = async (slug: Slugs, type: AccessType, args: AccessArgsInternal) => {
  const { fallbackAccess, reqOverride: req, where, refineAccess } = args
  const { payload: p, user, pathname } = req
  const { logger } = p

  let defaultAccessReturn = fallbackAccess ?? false
  const access = user?.access as UsersAccess
  const currentAccess = access?.access?.find((a) => a.slug === slug)

  if (pathname?.includes('/create-first-user')) {
    try {
      const { totalDocs } = await p.count({
        collection: 'users',
      })

      if (totalDocs === 0) {
        logger.info(`[${slug}] (${type}) ${pathname} no users exist, allowing first user creation`)
        return true
      } else {
        logger.error(
          `[${slug}] (${type}) ${pathname} users exist, denying access to create-first-user path`,
        )
        return false
      }
    } catch (error) {
      logger.error(`[${slug}] (${type}) ${pathname} error checking user count: ${error}`)

      return false
    }
  }

  // if (user?.super_user) {
  //   logger.info(`[${slug}] (${type}) ${(user as User)?.email} result: is super user`)
  //   return true
  // }

  // if (currentAccess?.super_user) {
  //   logger.info(
  //     `[${slug}] (${type}) ${(user as User)?.email} result: is super user for the current collection/global`,
  //   )
  //   return true
  // }

  const isSuperUser = isCollectionSuperUser(user, slug, currentAccess)

  if (isSuperUser) {
    logger.info(`[${slug}] (${type}) ${(user as User)?.email} result: is super user`)
    return true
  }

  // if access check is for super user and return is false lets check also the refineAccess function if existing
  if (type === 'super_user' && refineAccess) {
    return await refineAccess(defaultAccessReturn, slug, req)
  }

  if (!access || !currentAccess) {
    if (!defaultAccessReturn) {
      logger.error(`[${slug}] (${type}) ${(user as User)?.email} result: access denied`)
    }
    return defaultAccessReturn
  }

  defaultAccessReturn = currentAccess[type] === true

  if (refineAccess) {
    return await refineAccess(defaultAccessReturn, slug, req)
  }

  if (where) {
    logger.info(`[${slug}] (${type}) ${(user as User)?.email} where: ${where}`)
    return where
  }
  return defaultAccessReturn
}

export const accessCheckResolver = (
  slug: Slugs,
  type: AccessType,
  args: AccessArgs,
): AccessAdmin | Access => {
  const { reqOverride } = args
  if (type === 'admin') {
    return (async ({ req }) =>
      await accessCheck(slug, type, {
        ...args,
        reqOverride: reqOverride ? reqOverride : req,
      })) as AccessAdmin
  } else {
    return (async ({ req }) =>
      await accessCheck(slug, type, {
        ...args,
        reqOverride: reqOverride ? reqOverride : req,
      })) as Access
  }
}

export const accessHiddenBySlug = (user: User, slug: string, fallbackAccess?: boolean): boolean => {
  if (user?.super_user) {
    console.log(`[${slug}] (hidden) ${(user as User)?.email} is super user`)
    return false
  }

  if (!user?.access) {
    return fallbackAccess ?? true
  }

  const userAccess = user?.access as UsersAccess
  const currentAccess = userAccess?.access?.find((a) => a.slug === slug)

  if (!currentAccess) {
    return fallbackAccess ?? true
  }

  return currentAccess.hidden || false
}

export const isCollectionSuperUser = (
  user: User | null,
  slug: string,
  currentAccess?: AccessItem | null,
): boolean => {
  if (!user) return false
  if (user.super_user) return true

  // Use the caller's already-resolved row when given, otherwise look it up.
  const row = currentAccess ?? (user.access as UsersAccess)?.access?.find((a) => a.slug === slug)

  return row?.super_user === true
}

export const hasUserAccess = (user: User | null, slug: string, type: AccessType): boolean => {
  if (!user) return false
  if (user.super_user) return true

  const access = user.access as UsersAccess
  const currentAccess = access?.access?.find((a) => a.slug === slug)

  if (!currentAccess) return false

  return currentAccess[type] === true
}