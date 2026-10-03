/**
 * Access checks backed by `users-access` profiles (rem0001).
 *
 * The checks take the access record as input, so phase 4 (per-tenant access) only changes
 * `getAccessRecord`.
 */
import type {
  Access,
  ClientUser,
  CollectionSlug,
  FieldAccess,
  PayloadRequest,
  Where,
} from 'payload'

import type { User, UsersAccess } from '@/payload-types'

export type AccessOperation = 'read' | 'create' | 'update' | 'delete' | 'admin' | 'access'

export const isSuperUser: Access = ({ req }) => Boolean(req.user?.super_user)

export const isSuperUserField: FieldAccess = ({ req }) => Boolean(req.user?.super_user)

// `is_disabled` lands on users in rem0001 phase 3; read it defensively until then
const isDisabled = (user: object): boolean => 'is_disabled' in user && user.is_disabled === true

/** Pure: true only when the record has a row for the slug with the checkbox ticked. */
export const hasPermission = (
  record: UsersAccess | null | undefined,
  slug: CollectionSlug,
  op: AccessOperation,
): boolean => {
  const row = record?.access?.find((r) => r.slug === slug)
  return row?.[op] === true
}

/** Pure: no record or no row for the slug means hidden (deny by default). */
export const isHidden = (record: UsersAccess | null | undefined, slug: CollectionSlug): boolean => {
  const row = record?.access?.find((r) => r.slug === slug)
  if (!row) return true
  return row.hidden === true
}

/**
 * The access record for this request. Phases 1–3: `req.user.access`; phase 4: the tenant row.
 * An unpopulated id (auth depth too low) is denied, with a warning so it's easy to spot.
 */
export const getAccessRecord = (req: PayloadRequest): UsersAccess | null => {
  const access = req.user?.access
  if (!access) return null

  if (typeof access !== 'object') {
    req.payload.logger.warn({
      msg: 'access: user access record is not populated, denying',
      accessId: access,
      userId: req.user?.id,
    })
    return null
  }

  return access
}

/** Shared rules for every check: no user → deny, super user → allow, disabled → deny, else the record. */
export const hasAccess = (
  req: PayloadRequest,
  slug: CollectionSlug,
  op: AccessOperation,
): boolean => {
  const { user } = req
  if (!user) return false
  if (user.super_user) return true
  if (isDisabled(user)) return false

  if (hasPermission(getAccessRecord(req), slug, op)) return true

  req.payload.logger.debug({ msg: 'access: denied', slug, op, userId: user.id })
  return false
}

/** Collection access function. `where` is only returned when the permission is granted. */
export const accessCheckResolver =
  (
    slug: CollectionSlug,
    op: Exclude<AccessOperation, 'admin' | 'access'>,
    options?: { where?: (req: PayloadRequest) => Where },
  ): Access =>
  ({ req }) => {
    if (!hasAccess(req, slug, op)) return false
    return options?.where ? options.where(req) : true
  }

/** `Users.access.admin`: the `users` row's `admin` checkbox decides who can open `/admin`. */
export const adminAccess = ({ req }: { req: PayloadRequest }): boolean =>
  hasAccess(req, 'users', 'admin')

/**
 * The `access` ("API access") column. No endpoint uses it yet (rem0001 decision); custom
 * endpoints exposed externally call it later.
 */
export const hasApiAccess = (req: PayloadRequest, slug: CollectionSlug): boolean =>
  hasAccess(req, slug, 'access')

/** `admin.hidden` for a collection: super users see everything; no record or row means hidden. */
export const hiddenResolver =
  (slug: CollectionSlug) =>
  ({ user }: { user: ClientUser | User | null }): boolean => {
    if (!user) return true
    if (user.super_user) return false
    if (isDisabled(user)) return true

    const access = 'access' in user ? user.access : null
    const record = access && typeof access === 'object' ? (access as UsersAccess) : null
    return isHidden(record, slug)
  }

/**
 * Read for collections with drafts (pages, posts): published docs are public; drafts need the
 * profile's `read` on the slug (super users always). Replaces `authenticatedOrPublished`, which
 * showed drafts to every signed-in user.
 */
export const publishedOrPermission =
  (slug: CollectionSlug): Access =>
  ({ req }) => {
    if (hasAccess(req, slug, 'read')) return true
    return { _status: { equals: 'published' } }
  }
