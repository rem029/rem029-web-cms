/**
 * Access checks backed by `users-access` profiles (rem0001).
 *
 * In Phase 4 (per-tenant access), permissions come from the user's `users.tenants[]` rows
 * (`users-access` profile per tenant). Super users bypass checks; disabled users are always
 * denied before super-user checks.
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
import { extractTenantId, isTenantCollection } from '@/common/utils/tenantCollections'
import { getSelectedTenant } from '@/common/utils/getSelectedTenant'

export type AccessOperation = 'read' | 'create' | 'update' | 'delete' | 'admin' | 'access'

export function isDisabledUser(user: User | ClientUser | null | undefined): boolean {
  return user?.is_disabled === true
}

export function isActiveSuperUser(user: User | ClientUser | null | undefined): boolean {
  return Boolean(user?.super_user) && !isDisabledUser(user)
}

export const isSuperUser: Access = ({ req }) => isActiveSuperUser(req.user)

export const isSuperUserField: FieldAccess = ({ req }) => isActiveSuperUser(req.user)

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

export interface TenantRow {
  tenantId: number
  record: UsersAccess | null
}

const isRecord = (val: unknown): val is Record<string, unknown> =>
  typeof val === 'object' && val !== null

const isUsersAccess = (val: unknown): val is UsersAccess =>
  isRecord(val) && typeof val.id === 'number' && typeof val.slug === 'string'

/**
 * Returns tenant rows for a user: { tenantId, record }.
 * Unpopulated access IDs trigger a warning and are treated as null.
 */
export const getTenantRows = (
  user: User | ClientUser | null | undefined,
  logger?: { warn: (data: Record<string, unknown>) => void },
): TenantRow[] => {
  if (!user || !('tenants' in user) || !Array.isArray(user.tenants)) {
    return []
  }

  const rows: TenantRow[] = []

  for (const row of user.tenants) {
    if (!isRecord(row)) continue
    const tenantId = extractTenantId(row.tenant)
    if (tenantId === null) continue

    const access = 'access' in row ? row.access : null
    if (!access) {
      rows.push({ tenantId, record: null })
      continue
    }

    if (typeof access !== 'object') {
      logger?.warn({
        msg: 'access: tenant row access record is not populated, denying',
        accessId: access,
        userId: user.id,
        tenantId,
      })
      rows.push({ tenantId, record: null })
      continue
    }

    if (isUsersAccess(access)) {
      rows.push({ tenantId, record: access })
    } else {
      rows.push({ tenantId, record: null })
    }
  }

  return rows
}

/**
 * Returns tenant ids where the user's row profile allows `op` on `slug`.
 * No user or disabled user returns [].
 */
export const allowedTenantIds = (
  req: PayloadRequest,
  slug: CollectionSlug,
  op: AccessOperation,
): number[] => {
  const { user } = req
  if (!user || isDisabledUser(user)) return []

  const rows = getTenantRows(user, req.payload.logger)
  const ids: number[] = []

  for (const { tenantId, record } of rows) {
    if (hasPermission(record, slug, op) && !ids.includes(tenantId)) {
      ids.push(tenantId)
    }
  }

  return ids
}

/**
 * Shared rules for non-tenant checks: no user → deny, disabled → deny, super user → allow,
 * else true if ANY tenant row profile allows `op` on `slug`.
 */
export const hasAccess = (
  req: PayloadRequest,
  slug: CollectionSlug,
  op: AccessOperation,
): boolean => {
  const { user } = req
  if (!user) return false
  if (isDisabledUser(user)) return false
  if (isActiveSuperUser(user)) return true

  const rows = getTenantRows(user, req.payload.logger)
  const allowed = rows.some(({ record }) => hasPermission(record, slug, op))
  if (allowed) return true

  req.payload.logger.debug({ msg: 'access: denied', slug, op, userId: user.id })
  return false
}

const combineWhere = (
  base: boolean | Where,
  extraWhereFn?: (req: PayloadRequest) => Where,
  req?: PayloadRequest,
): boolean | Where => {
  if (base === false) return false
  if (!extraWhereFn || !req) return base
  const extra = extraWhereFn(req)
  if (base === true) return extra
  return { and: [base, extra] }
}

/**
 * Collection access function.
 * - Active super user → true (disabled first → false).
 * - Tenant collections:
 *     read/update/delete → `{ tenant: { in: ids } }`, empty → false + debug log
 *     create → target tenant (`data.tenant` else `getSelectedTenant(req)`) in allowedTenantIds(create)
 * - 'tenants':
 *     read/update/delete → `{ id: { in: ids } }`
 *     create → hasAccess
 * - Other non-tenant collections → hasAccess boolean
 */
export const accessCheckResolver =
  (
    slug: CollectionSlug,
    op: Exclude<AccessOperation, 'admin' | 'access'>,
    options?: { where?: (req: PayloadRequest) => Where },
  ): Access =>
  ({ req, data }) => {
    const { user } = req
    if (!user || isDisabledUser(user)) return false
    if (isActiveSuperUser(user)) return combineWhere(true, options?.where, req)

    if (isTenantCollection(slug)) {
      if (op === 'create') {
        const ids = allowedTenantIds(req, slug, 'create')
        const targetTenant = extractTenantId(data?.tenant) ?? getSelectedTenant(req)
        if (targetTenant !== null && ids.includes(targetTenant)) {
          return combineWhere(true, options?.where, req)
        }
        req.payload.logger.debug({
          msg: 'access: denied',
          slug,
          op: 'create',
          userId: user.id,
          tenantId: targetTenant,
        })
        return false
      }

      const ids = allowedTenantIds(req, slug, op)
      if (ids.length === 0) {
        req.payload.logger.debug({ msg: 'access: denied', slug, op, userId: user.id })
        return false
      }
      return combineWhere({ tenant: { in: ids } }, options?.where, req)
    }

    if (slug === 'tenants') {
      if (op === 'create') {
        if (hasAccess(req, 'tenants', 'create')) {
          return combineWhere(true, options?.where, req)
        }
        return false
      }

      const ids = allowedTenantIds(req, 'tenants', op)
      if (ids.length === 0) {
        req.payload.logger.debug({ msg: 'access: denied', slug, op, userId: user.id })
        return false
      }
      return combineWhere({ id: { in: ids } }, options?.where, req)
    }

    if (hasAccess(req, slug, op)) {
      return combineWhere(true, options?.where, req)
    }
    return false
  }

/** `Users.access.admin`: any row's profile having `users.admin` decides who can open `/admin`. */
export const adminAccess = ({ req }: { req: PayloadRequest }): boolean =>
  hasAccess(req, 'users', 'admin')

/**
 * The `access` ("API access") column. No endpoint uses it yet (rem0001 decision); custom
 * endpoints exposed externally call it later.
 */
export const hasApiAccess = (req: PayloadRequest, slug: CollectionSlug): boolean =>
  hasAccess(req, slug, 'access')

/** `admin.hidden` for a collection: super users see everything; shown if any row's record shows it. */
export const hiddenResolver =
  (slug: CollectionSlug) =>
  ({ user }: { user: ClientUser | User | null }): boolean => {
    if (!user) return true
    if (isDisabledUser(user)) return true
    if (isActiveSuperUser(user)) return false

    const rows = getTenantRows(user)
    if (rows.length === 0) return true

    const isShownInAnyTenant = rows.some(({ record }) => isHidden(record, slug) === false)
    return !isShownInAnyTenant
  }

/**
 * Read for collections with drafts (pages, posts): published docs are public; drafts need the
 * profile's `read` on the slug in that tenant (super users always).
 */
export const publishedOrPermission =
  (slug: CollectionSlug): Access =>
  ({ req }) => {
    const publishedOnly: Where = { _status: { equals: 'published' } }
    const { user } = req
    if (isDisabledUser(user)) {
      return publishedOnly
    }
    if (isActiveSuperUser(user)) {
      return true
    }
    if (!user) {
      return publishedOnly
    }

    const ids = allowedTenantIds(req, slug, 'read')
    if (ids.length === 0) {
      return publishedOnly
    }

    const tenantOrPublished: Where = {
      or: [{ tenant: { in: ids } }, publishedOnly],
    }
    return tenantOrPublished
  }

/**
 * `admin.condition` for fields only super users should see in the admin (`super_user`, `access`,
 * `tenants`). UI only: field access still decides what can be read and changed.
 */
export const showToSuperUsers = (
  _data: unknown,
  _siblingData: unknown,
  { user }: { user: ClientUser | User | null | undefined },
): boolean => isActiveSuperUser(user)
