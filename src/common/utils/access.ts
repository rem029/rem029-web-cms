/**
 * Access checks backed by `users-access` profiles and tenant admin roles (rem0001).
 *
 * In Phase 5 (tenant admins), permissions come from the user's `users.tenants[]` rows:
 * either a `users-access` profile or the `isTenantAdmin` flag. Tenant admins have hardcoded
 * permissions to manage content, members, and access within their assigned tenant(s).
 * Super users bypass checks; disabled users are always denied before super-user checks.
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
import {
  extractTenantId,
  isTenantCollection,
  tenantGlobalCollections,
  tenantScopedCollections,
} from '@/common/utils/tenantCollections'
import { getSelectedTenant } from '@/common/utils/getSelectedTenant'

export type AccessOperation = 'read' | 'create' | 'update' | 'delete' | 'admin' | 'access'

export function isDisabledUser(
  user: User | ClientUser | Partial<User> | null | undefined,
): boolean {
  return user?.is_disabled === true
}

export function isActiveSuperUser(
  user: User | ClientUser | Partial<User> | null | undefined,
): boolean {
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
  isTenantAdmin: boolean
}

const isRecord = (val: unknown): val is Record<string, unknown> =>
  typeof val === 'object' && val !== null

const isUsersAccess = (val: unknown): val is UsersAccess =>
  isRecord(val) && typeof val.id === 'number' && typeof val.slug === 'string'

/**
 * Returns tenant rows for a user: { tenantId, record, isTenantAdmin }.
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

    const isTenantAdmin = 'isTenantAdmin' in row && row.isTenantAdmin === true

    const access = 'access' in row ? row.access : null
    if (!access) {
      rows.push({ tenantId, record: null, isTenantAdmin })
      continue
    }

    if (typeof access !== 'object') {
      logger?.warn({
        msg: 'access: tenant row access record is not populated, denying',
        accessId: access,
        userId: user.id,
        tenantId,
      })
      rows.push({ tenantId, record: null, isTenantAdmin })
      continue
    }

    if (isUsersAccess(access)) {
      rows.push({ tenantId, record: access, isTenantAdmin })
    } else {
      rows.push({ tenantId, record: null, isTenantAdmin })
    }
  }

  return rows
}

/**
 * Returns tenant IDs where the user has the tenant admin checkbox ticked.
 * Returns [] for no user or disabled user (deduped). Super users don't need it (callers check super first).
 */
export const tenantAdminTenantIds = (
  user: User | ClientUser | null | undefined,
): number[] => {
  if (!user || isDisabledUser(user)) return []

  const rows = getTenantRows(user)
  const ids: number[] = []

  for (const row of rows) {
    if (row.isTenantAdmin && !ids.includes(row.tenantId)) {
      ids.push(row.tenantId)
    }
  }

  return ids
}

/**
 * Returns true if the user is a tenant admin of any tenant.
 */
export const isAnyTenantAdmin = (
  user: User | ClientUser | null | undefined,
): boolean => tenantAdminTenantIds(user).length > 0

/**
 * Hardcoded grants for tenant admins within their tenant (not driven by a profile):
 * - tenant-scoped collections -> read/create/update/delete
 * - tenant globals and tenants -> read/update only
 * - users -> admin only
 * - everything else and access op -> false
 */
export const tenantAdminAllows = (slug: CollectionSlug, op: AccessOperation): boolean => {
  if (op === 'access') return false

  if (tenantScopedCollections.includes(slug)) {
    return op === 'read' || op === 'create' || op === 'update' || op === 'delete'
  }

  if (tenantGlobalCollections.includes(slug) || slug === 'tenants') {
    return op === 'read' || op === 'update'
  }

  if (slug === 'users') {
    return op === 'admin'
  }

  return false
}

/**
 * Collections visible in the admin UI to a tenant admin:
 * tenant-scoped, tenant-global, tenants, users, users-access.
 */
export const tenantAdminShows = (slug: CollectionSlug): boolean => {
  if (tenantScopedCollections.includes(slug)) return true
  if (tenantGlobalCollections.includes(slug)) return true
  if (slug === 'tenants' || slug === 'users' || slug === 'users-access') return true
  return false
}

/**
 * Checks whether a tenant row allows an operation on a collection slug.
 * Uses hardcoded grants for tenant admins; otherwise checks the profile record.
 */
export const rowAllows = (
  row: TenantRow,
  slug: CollectionSlug,
  op: AccessOperation,
): boolean =>
  row.isTenantAdmin ? tenantAdminAllows(slug, op) : hasPermission(row.record, slug, op)

/**
 * Checks whether a collection slug is visible in the admin UI for a tenant row.
 * Uses hardcoded visibility for tenant admins; otherwise checks the profile record.
 */
export const rowShows = (row: TenantRow, slug: CollectionSlug): boolean =>
  row.isTenantAdmin ? tenantAdminShows(slug) : !isHidden(row.record, slug)

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

  for (const row of rows) {
    if (rowAllows(row, slug, op) && !ids.includes(row.tenantId)) {
      ids.push(row.tenantId)
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
  const allowed = rows.some((row) => rowAllows(row, slug, op))
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

    const isShownInAnyTenant = rows.some((row) => rowShows(row, slug))
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

/**
 * Field access for tenant membership rows on users.
 * Active super users can manage any row.
 * Disabled users cannot manage rows.
 * Tenant admins can manage rows when editing other users (not themselves) and on user creation.
 */
export const canManageTenantRows: FieldAccess = ({ req, id }) => {
  const { user } = req
  if (!user || isDisabledUser(user)) return false
  if (isActiveSuperUser(user)) return true

  if (isAnyTenantAdmin(user)) {
    if (id === undefined) return true
    return String(id) !== String(user.id)
  }

  return false
}

/**
 * `admin.condition` for fields visible to super users and tenant admins.
 */
export const showToTenantManagers = (
  _data: unknown,
  _siblingData: unknown,
  { user }: { user: ClientUser | User | null | undefined },
): boolean => isActiveSuperUser(user) || isAnyTenantAdmin(user)
