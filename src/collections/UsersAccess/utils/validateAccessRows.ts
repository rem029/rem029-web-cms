import type { ArrayFieldValidation, TextFieldValidation } from 'payload'
import { getAccessSlugs } from './accessSlugs'
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

export const validateAccessRows: ArrayFieldValidation = async (value, { req, data }) => {
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
