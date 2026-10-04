import type { CollectionSlug, PayloadRequest } from 'payload'
import type { User } from '@/payload-types'
import { getTenantRows, isActiveSuperUser, isDisabledUser, rowAllows } from '@/common/utils/access'
import { extractTenantId } from '@/common/utils/tenantCollections'
import { getSelectedTenant } from '@/common/utils/getSelectedTenant'
import { SUPPORTED_LOCALES } from '@/utilities/constant'
import { getTenantURL } from '@/utilities/getURL'
import { signPreview } from '@/common/utils/previewToken'

export function canPreviewTenant(
  user: User | null | undefined,
  tenantId: number,
  collection: CollectionSlug,
): boolean {
  if (!user || isDisabledUser(user)) {
    return false
  }
  if (isActiveSuperUser(user)) {
    return true
  }
  const rows = getTenantRows(user)
  return rows.some(
    (row) => row.tenantId === tenantId && row.isActive && rowAllows(row, collection, 'read'),
  )
}

export type PreviewURLArgs = {
  collection: CollectionSlug
  slug?: string | null
  tenant?: unknown
  req: PayloadRequest
}

const PATH_BUILDERS: Record<string, (slug?: string | null) => string> = {
  pages: (slug) => `/${slug ?? ''}`,
  posts: (slug) => `/posts/${slug ?? ''}`,
  theme: () => '/preview/theme',
  header: () => '/',
  footer: () => '/',
}

export async function previewURL({
  collection,
  slug,
  tenant,
  req,
}: PreviewURLArgs): Promise<string | null> {
  const user = req.user
  const tenantId = extractTenantId(tenant) ?? getSelectedTenant(req)

  if (
    !tenantId ||
    !user ||
    typeof user.id !== 'number' ||
    !canPreviewTenant(user, tenantId, collection)
  ) {
    req.payload.logger.debug({
      msg: 'previewURL: preview not allowed',
      userId: user?.id,
      tenantId,
      collection,
    })
    return null
  }

  const buildPath = PATH_BUILDERS[collection]
  if (!buildPath) {
    req.payload.logger.debug({
      msg: 'previewURL: unsupported collection',
      collection,
    })
    return null
  }

  let path = buildPath(slug)
  if (req.locale && SUPPORTED_LOCALES.includes(req.locale)) {
    const separator = path.includes('?') ? '&' : '?'
    path = `${path}${separator}lang=${req.locale}`
  }

  const secret = process.env.PAYLOAD_SECRET
  if (!secret) {
    req.payload.logger.error({ msg: 'previewURL: PAYLOAD_SECRET is missing' })
    throw new Error('PAYLOAD_SECRET is not configured')
  }

  const tenantDoc = await req.payload.findByID({
    collection: 'tenants',
    id: tenantId,
    depth: 0,
    req,
  })

  if (!tenantDoc) {
    req.payload.logger.debug({ msg: 'previewURL: tenant doc not found', tenantId })
    return null
  }

  const now = Math.floor(Date.now() / 1000)
  const token = signPreview(
    {
      userId: user.id,
      tenantId,
      exp: now + 3600,
    },
    secret,
  )

  const params = new URLSearchParams({
    path,
    collection,
    token,
  })

  return `${getTenantURL(tenantDoc)}/next/preview?${params.toString()}`
}
