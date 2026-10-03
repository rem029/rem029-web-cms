/**
 * Helpers for hideable documents (rem0001 phase 6).
 *
 * A hidden document can be read, updated and deleted only by its creator (`createdBy`), the users
 * in `visibleTo`, tenant admins of its tenant and super users. The `where` side lives in
 * `access.ts` (`hiddenRuleWhere`, `visibleTenantWhere`).
 */
import type { ClientUser, FieldAccess } from 'payload'

import type { User } from '@/payload-types'
import { isActiveSuperUser, isDisabledUser, tenantAdminTenantIds } from '@/common/utils/access'
// a relationship value (id or populated doc) → numeric id; works for any collection
import { extractTenantId as relationId } from '@/common/utils/tenantCollections'

type HideableDoc = Partial<Record<string, unknown>> | undefined

/** Creator or tenant admin of the doc's tenant (super users and new docs are checked by callers). */
const isCreatorOrTenantAdmin = (user: ClientUser | User, doc: HideableDoc): boolean => {
  const createdById = relationId(doc?.createdBy)
  if (createdById !== null && String(createdById) === String(user.id)) return true

  const docTenantId = relationId(doc?.tenant)
  return docTenantId !== null && tenantAdminTenantIds(user).includes(docTenantId)
}

/**
 * Field access for `isHidden` and `visibleTo` (create and update):
 * - super users always; anyone allowed to create the doc on create (they become its creator)
 * - on update: the doc's creator or a tenant admin of the doc's tenant
 */
export const canManageHidden: FieldAccess = ({ req, id, doc }) => {
  const { user } = req
  if (!user || isDisabledUser(user)) return false
  if (isActiveSuperUser(user) || id === undefined) return true
  return isCreatorOrTenantAdmin(user, doc)
}

/**
 * `admin.condition` for "Hide from other members": only people who can change it see it (on a new
 * doc that's anyone creating it). UI only; `canManageHidden` decides what's saved.
 * New docs are told apart by `operation`, not `data.id`: the form state rebuilt after a change
 * (e.g. the slug field filling itself in) has no `id`, which showed the control to everyone.
 */
export const showHiddenControl = (
  data: HideableDoc,
  _siblingData: unknown,
  { operation, user }: { operation?: string; user: ClientUser | User | null | undefined },
): boolean => {
  if (!user || isDisabledUser(user)) return false
  if (isActiveSuperUser(user) || operation === 'create') return true
  return isCreatorOrTenantAdmin(user, data)
}
