import { cookies, draftMode } from 'next/headers'
import { cache } from 'react'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { canPreviewTenant } from '@/common/utils/preview'
import { verifyPreview } from '@/common/utils/previewToken'
import { getFrontendTenantId } from '@/common/utils/frontendTenant'

export const isPreviewing = cache(async (): Promise<boolean> => {
  const payload = await getPayload({ config: configPromise })
  const draft = await draftMode()

  if (!draft.isEnabled) {
    payload.logger.debug({ msg: 'isPreviewing: false', reason: 'draft_mode_disabled' })
    return false
  }

  const cookieStore = await cookies()
  const token = cookieStore.get('tenant-preview')?.value
  if (!token) {
    payload.logger.debug({ msg: 'isPreviewing: false', reason: 'missing_cookie' })
    return false
  }

  const secret = process.env.PAYLOAD_SECRET
  if (!secret) {
    payload.logger.debug({ msg: 'isPreviewing: false', reason: 'missing_secret' })
    return false
  }

  const verification = verifyPreview(token, secret)
  if (!verification.ok) {
    payload.logger.debug({ msg: 'isPreviewing: false', reason: verification.reason })
    return false
  }

  const { claims } = verification
  const hostTenantId = await getFrontendTenantId()

  if (hostTenantId === null || hostTenantId !== claims.tenantId) {
    payload.logger.debug({
      msg: 'isPreviewing: false',
      reason: 'tenant_mismatch',
      tenantId: claims.tenantId,
      hostTenantId,
    })
    return false
  }

  const user = await payload.findByID({
    collection: 'users',
    id: claims.userId,
    depth: 1,
    overrideAccess: true,
    disableErrors: true,
  })

  if (!user || !canPreviewTenant(user, claims.tenantId, 'pages')) {
    payload.logger.debug({
      msg: 'isPreviewing: false',
      reason: 'access_denied',
      userId: claims.userId,
      tenantId: claims.tenantId,
    })
    return false
  }

  return true
})
