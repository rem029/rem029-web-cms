import type { Payload } from 'payload'
import type { User } from '@/payload-types'
import { extractTenantId } from '@/common/utils/tenantCollections'
import { getDefaultTenantId, getTenantDoc } from '@/common/utils/getTenantDoc'
import { resolveTenantIdFromCookie } from '@/common/utils/getSelectedTenant'

/** The active theme's `--primary`, only when it's a plain hex color (it ends up in a style attribute). */
export const accentFromThemeCSS = (css: string | null | undefined): string | null => {
  const value = css?.match(/--primary:\s*([^;}\n]+)/)?.[1]?.trim()
  return value && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? value : null
}

export type AdminBranding = {
  tenantName: string
  logo: { url: string; alt: string } | null
  accent: string | null
}

// selected tenant (validated cookie), else the user's first tenant, else (login page) `admin`
const brandingTenantId = async (
  user: User | null | undefined,
  selectedCookie: string | undefined,
): Promise<number | null> => {
  if (user) {
    const selected = resolveTenantIdFromCookie(selectedCookie, user)
    if (selected !== null) return selected
    const first = extractTenantId(user.tenants?.[0]?.tenant)
    if (first !== null) return first
  }
  return getDefaultTenantId()
}

/**
 * Logo, name and accent of the tenant the admin shows. Name, logo and theme are public (the
 * tenant's site shows them), and the tenant id is validated against the user, so reads skip access.
 */
export const getAdminBranding = async (
  payload: Payload,
  user: User | null | undefined,
  selectedCookie: string | undefined,
): Promise<AdminBranding | null> => {
  try {
    const tenantId = await brandingTenantId(user, selectedCookie)
    if (tenantId === null) {
      payload.logger.debug({ msg: 'admin branding: no tenant', userId: user?.id })
      return null
    }

    const tenant = await payload.findByID({
      collection: 'tenants',
      id: tenantId,
      depth: 0,
      disableErrors: true,
    })
    if (!tenant) return null

    const settings = await getTenantDoc('settings', tenantId, { depth: 1 })
    const theme = await getTenantDoc('theme', tenantId)

    const tenantName = tenant.name || ''
    const media = settings?.logo
    const logo =
      media && typeof media === 'object' && media.url
        ? { url: media.url, alt: media.alt || tenantName }
        : null
    const accent = accentFromThemeCSS(theme?.themes?.find((t) => t.active)?.css)

    return { tenantName, logo, accent }
  } catch (err) {
    // the admin must still render: fall back to Payload's graphics
    payload.logger.warn({ msg: 'admin branding failed', userId: user?.id, err })
    return null
  }
}
