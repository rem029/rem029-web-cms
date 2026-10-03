import type { CollectionBeforeLoginHook } from 'payload'
import { AuthenticationError } from 'payload'
import { isDisabledUser } from '@/common/utils/access'

/**
 * Prevents disabled users from logging in.
 */
export const blockDisabledLogin: CollectionBeforeLoginHook = async ({ req, user }) => {
  if (isDisabledUser(user)) {
    req.payload.logger.warn({
      msg: 'Blocked login attempt for disabled user',
      userId: user.id,
    })
    throw new AuthenticationError(req.t)
  }

  return user
}
