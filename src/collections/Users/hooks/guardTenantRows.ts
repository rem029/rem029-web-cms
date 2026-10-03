import type { CollectionBeforeOperationHook } from 'payload'
import { Forbidden } from 'payload'
import type { User, UsersAccess } from '@/payload-types'
import { isActiveSuperUser, tenantAdminTenantIds } from '@/common/utils/access'
import { extractTenantId } from '@/common/utils/tenantCollections'
import { DEFAULT_ACCESS_SLUG } from '@/collections/UsersAccess/utils/defaultProfile'
import { getAdminTenantId } from '@/common/utils/adminTenant'
import { countOtherTenantAdmins } from '@/collections/Users/utils/tenantAdmins'

const isRecord = (val: unknown): val is Record<string, unknown> =>
  typeof val === 'object' && val !== null

interface ParsedSubmittedRow {
  tenantId: number
  accessId: number | null
  isTenantAdmin: boolean
  id?: string
  raw: Record<string, unknown>
}

interface StoredManagedRow {
  id?: string | null
  tenantId: number
  accessId: number | null
  isTenantAdmin: boolean
}

/**
 * Enforces tenant row management rules for non-super users (tenant admins):
 * - Must administer at least one tenant
 * - Cannot modify super users
 * - Cannot touch/edit rows of tenants they do not administer
 * - On create: requires at least one tenant row, and forbids setting super_user or is_disabled
 * - Only assign profiles of the row's tenant or the platform default profile
 * - Preserves unmanaged stored rows (from other tenants) on update
 * - Refuses removing or demoting the last tenant admin of any tenant
 */
export const guardTenantRows: CollectionBeforeOperationHook = async ({ args, operation, req }) => {
  const op: string = operation
  if (op !== 'create' && op !== 'update' && op !== 'updateByID') {
    return args
  }

  if (args?.overrideAccess || !req.user || isActiveSuperUser(req.user)) {
    return args
  }

  const isUpdate = op === 'update' || op === 'updateByID'
  if (isUpdate) {
    if (!args?.id) {
      // Bulk update is handled/refused by guardSensitiveFields
      return args
    }
    const targetId = args.id
    if (String(targetId) === String(req.user.id)) {
      return args
    }
    if (!args.data || !('tenants' in args.data)) {
      return args
    }
  }

  const a = tenantAdminTenantIds(req.user)
  if (a.length === 0) {
    req.payload.logger.warn({
      msg: 'Non-tenant admin attempted to modify tenant rows',
      userId: req.user.id,
      operation: op,
    })
    throw new Forbidden(req.t)
  }

  const data = isRecord(args.data) ? args.data : {}

  if (!isUpdate) {
    if (Boolean(data.super_user) || Boolean(data.is_disabled)) {
      req.payload.logger.warn({
        msg: 'Non-super user attempted to set super_user or is_disabled on create',
        userId: req.user.id,
      })
      throw new Forbidden(req.t)
    }
  }

  let targetUser: User | null = null
  if (isUpdate) {
    targetUser = await req.payload.findByID({
      collection: 'users',
      id: args.id,
      depth: 0,
      req,
      overrideAccess: true,
    })
    if (!targetUser) {
      return args
    }
    if (targetUser.super_user) {
      req.payload.logger.warn({
        msg: 'Tenant admin attempted to modify a super user',
        userId: req.user.id,
        targetId: args.id,
      })
      throw new Forbidden(req.t)
    }
  }

  const rawSubmitted = Array.isArray(data.tenants) ? data.tenants : []
  const submittedRows: ParsedSubmittedRow[] = []
  const seenTenants = new Set<number>()

  for (const row of rawSubmitted) {
    if (!isRecord(row)) continue
    const tenantId = extractTenantId(row.tenant)
    if (tenantId === null) continue

    if (seenTenants.has(tenantId)) {
      req.payload.logger.warn({
        msg: 'Duplicate tenant row submitted',
        userId: req.user.id,
        tenantId,
        targetId: args?.id,
      })
      throw new Forbidden(req.t)
    }
    seenTenants.add(tenantId)

    if (!a.includes(tenantId)) {
      req.payload.logger.warn({
        msg: 'Tenant admin edited a row for a tenant they do not administer',
        userId: req.user.id,
        tenantId,
        targetId: args?.id,
      })
      throw new Forbidden(req.t)
    }

    const accessId = 'access' in row ? extractTenantId(row.access) : null
    const isTenantAdmin = 'isTenantAdmin' in row && row.isTenantAdmin === true
    const id = 'id' in row && typeof row.id === 'string' ? row.id : undefined

    submittedRows.push({
      tenantId,
      accessId,
      isTenantAdmin,
      id,
      raw: row,
    })
  }

  if (!isUpdate && submittedRows.length === 0) {
    req.payload.logger.warn({
      msg: 'User creation by tenant admin requires at least one tenant membership row',
      userId: req.user.id,
    })
    throw new Forbidden(req.t)
  }

  const keptStoredRows: NonNullable<User['tenants']>[number][] = []
  const managedStoredRows: Map<number, StoredManagedRow> = new Map()

  if (isUpdate && targetUser?.tenants && Array.isArray(targetUser.tenants)) {
    for (const row of targetUser.tenants) {
      if (!isRecord(row)) continue
      const tenantId = extractTenantId(row.tenant)
      if (tenantId === null) continue

      const accessId = 'access' in row ? extractTenantId(row.access) : null
      const isTenantAdmin = 'isTenantAdmin' in row && row.isTenantAdmin === true
      const id = 'id' in row && typeof row.id === 'string' ? row.id : null

      if (!a.includes(tenantId)) {
        keptStoredRows.push({
          ...(id ? { id } : {}),
          tenant: tenantId,
          access: accessId,
          isTenantAdmin,
        })
      } else {
        managedStoredRows.set(tenantId, {
          id,
          tenantId,
          accessId,
          isTenantAdmin,
        })
      }
    }
  }

  const adminTenantId = await getAdminTenantId(req)

  for (const submitted of submittedRows) {
    const existing = managedStoredRows.get(submitted.tenantId)
    const isNew = !existing
    const accessChanged = existing && existing.accessId !== submitted.accessId

    if ((isNew || accessChanged) && submitted.accessId !== null) {
      let profile: UsersAccess | null = null
      try {
        profile = await req.payload.findByID({
          collection: 'users-access',
          id: submitted.accessId,
          depth: 0,
          req,
          overrideAccess: true,
        })
      } catch {
        profile = null
      }

      if (!profile) {
        req.payload.logger.warn({
          msg: 'Assigned access profile not found',
          userId: req.user.id,
          targetId: args?.id,
          tenantId: submitted.tenantId,
          profileId: submitted.accessId,
        })
        throw new Forbidden(req.t)
      }

      const profileTenantId = extractTenantId(profile.tenant)
      const isPlatformDefault =
        profile.slug === DEFAULT_ACCESS_SLUG &&
        adminTenantId !== null &&
        profileTenantId === adminTenantId

      const isSameTenant = profileTenantId === submitted.tenantId

      if (!isSameTenant && !isPlatformDefault) {
        req.payload.logger.warn({
          msg: 'Cannot assign access profile from another tenant',
          userId: req.user.id,
          targetId: args?.id,
          tenantId: submitted.tenantId,
          profileId: submitted.accessId,
        })
        throw new Forbidden(req.t)
      }
    }
  }

  if (isUpdate && targetUser) {
    for (const [tenantId, stored] of managedStoredRows.entries()) {
      if (!stored.isTenantAdmin) continue

      const submitted = submittedRows.find((r) => r.tenantId === tenantId)
      const demotedOrRemoved = !submitted || !submitted.isTenantAdmin

      if (demotedOrRemoved) {
        const otherCount = await countOtherTenantAdmins(req, tenantId, targetUser.id)
        if (otherCount === 0) {
          req.payload.logger.warn({
            msg: 'Refused removing the last tenant admin',
            tenantId,
            userId: req.user.id,
            targetId: targetUser.id,
          })
          throw new Forbidden(req.t)
        }
      }
    }
  }

  const normalizedSubmitted = submittedRows.map((r) => ({
    ...r.raw,
    tenant: r.tenantId,
  }))

  const rebuiltTenants = isUpdate
    ? [...keptStoredRows, ...normalizedSubmitted]
    : normalizedSubmitted

  let rowsChanged = !isUpdate || submittedRows.length !== managedStoredRows.size
  if (!rowsChanged) {
    for (const submitted of submittedRows) {
      const existing = managedStoredRows.get(submitted.tenantId)
      if (
        !existing ||
        existing.accessId !== submitted.accessId ||
        existing.isTenantAdmin !== submitted.isTenantAdmin
      ) {
        rowsChanged = true
        break
      }
    }
  }

  if (rowsChanged) {
    req.payload.logger.info({
      msg: 'Tenant admin changed membership rows',
      userId: req.user.id,
      targetId: args?.id,
      tenantIds: submittedRows.map((r) => r.tenantId),
    })
  }

  return {
    ...args,
    data: {
      ...data,
      tenants: rebuiltTenants,
    },
  }
}
