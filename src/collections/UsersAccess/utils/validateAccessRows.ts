import type { ArrayFieldValidation, TextFieldValidation } from 'payload'
import { getAccessSlugs } from './accessSlugs'
import { isActiveSuperUser } from '@/common/utils/access'
import { extractTenantId } from '@/common/utils/tenantCollections'
import { getAdminTenantId } from '@/common/utils/adminTenant'

const PROFILE_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const validateProfileSlug: TextFieldValidation = (value) => {
  if (!value || typeof value !== 'string') {
    return 'Slug must be lowercase kebab-case (e.g. "pages-editor")'
  }

  if (!PROFILE_SLUG_REGEX.test(value)) {
    return 'Slug must be lowercase kebab-case (e.g. "pages-editor")'
  }

  return true
}

const isRecord = (val: unknown): val is Record<string, unknown> =>
  typeof val === 'object' && val !== null

interface AuditRowState {
  hidden: boolean
  read: boolean
  create: boolean
  update: boolean
  delete: boolean
  admin: boolean
  access: boolean
}

const DEFAULT_AUDIT_ROW: AuditRowState = {
  hidden: true,
  read: false,
  create: false,
  update: false,
  delete: false,
  admin: false,
  access: false,
}

const auditRowOf = (rows: unknown): AuditRowState => {
  if (!Array.isArray(rows)) return DEFAULT_AUDIT_ROW
  const row = rows.find((r) => isRecord(r) && 'slug' in r && r.slug === 'audit-logs')
  if (!isRecord(row)) return DEFAULT_AUDIT_ROW
  return {
    hidden: row.hidden === true,
    read: row.read === true,
    create: row.create === true,
    update: row.update === true,
    delete: row.delete === true,
    admin: row.admin === true,
    access: row.access === true,
  }
}

export const validateAccessRows: ArrayFieldValidation = async (
  value,
  { req, data, previousValue },
) => {
  // who reads the logs is the super users' call; writes without a user (seeds, scripts) are trusted
  if (req?.user && !isActiveSuperUser(req.user)) {
    const submitted = auditRowOf(value)
    const previous = auditRowOf(previousValue)
    if (
      submitted.hidden !== previous.hidden ||
      submitted.read !== previous.read ||
      submitted.create !== previous.create ||
      submitted.update !== previous.update ||
      submitted.delete !== previous.delete ||
      submitted.admin !== previous.admin ||
      submitted.access !== previous.access
    ) {
      return 'Only super users can change "audit-logs" access'
    }
  }

  if (!value || !Array.isArray(value)) {
    return true
  }

  const collections = req?.payload?.config?.collections || []
  const validSlugs = getAccessSlugs(collections)
  const seenSlugs = new Set<string>()

  for (const row of value) {
    const slug =
      row && typeof row === 'object' && 'slug' in row && typeof row.slug === 'string'
        ? row.slug
        : ''

    if (!slug || !validSlugs.includes(slug)) {
      return `Unknown collection slug "${slug}"`
    }

    if (seenSlugs.has(slug)) {
      return `Duplicate row for "${slug}"`
    }

    seenSlugs.add(slug)
  }

  const tenantVal = isRecord(data) && 'tenant' in data ? data.tenant : undefined
  const tenantId = extractTenantId(tenantVal)
  const adminTenantId = req ? await getAdminTenantId(req) : null
  const isAdminTenant = tenantId !== null && adminTenantId !== null && tenantId === adminTenantId

  if (!isAdminTenant) {
    for (const row of value) {
      if (!row || typeof row !== 'object') continue
      const slug = 'slug' in row && typeof row.slug === 'string' ? row.slug : ''
      if (slug === 'users' || slug === 'users-access') {
        const hasManage =
          ('create' in row && row.create === true) ||
          ('update' in row && row.update === true) ||
          ('delete' in row && row.delete === true)
        if (hasManage) {
          return `Only tenant admins manage people: untick create/update/delete on "${slug}"`
        }
      }
    }
  }

  return true
}
