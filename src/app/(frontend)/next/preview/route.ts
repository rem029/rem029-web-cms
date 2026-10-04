import { cookies, draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import type { NextRequest } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { canPreviewTenant } from '@/common/utils/preview'
import { signPreview, verifyPreview } from '@/common/utils/previewToken'
import { getFrontendTenantId } from '@/common/utils/frontendTenant'

const ALLOWED_COLLECTIONS = ['pages', 'posts', 'header', 'footer', 'theme'] as const
type PreviewCollection = (typeof ALLOWED_COLLECTIONS)[number]

const isPreviewCollection = (col: string | null): col is PreviewCollection =>
  ALLOWED_COLLECTIONS.some((allowed) => allowed === col)

export async function GET(req: NextRequest): Promise<Response> {
  const payload = await getPayload({ config: configPromise })
  const { searchParams } = new URL(req.url)

  const path = searchParams.get('path')
  const collection = searchParams.get('collection')
  const token = searchParams.get('token')

  if (!isPreviewCollection(collection)) {
    payload.logger.warn({
      msg: 'preview refused',
      reason: 'invalid_collection',
      collection,
    })
    return new Response('This preview link is invalid.', { status: 400 })
  }

  const origin = new URL(req.url).origin
  const isAllowedPath = (p: string | null): p is string => {
    if (
      !p ||
      typeof p !== 'string' ||
      !p.startsWith('/') ||
      p.startsWith('//') ||
      p.startsWith('/\\')
    ) {
      return false
    }
    try {
      const parsed = new URL(p, origin)
      return parsed.origin === origin
    } catch {
      return false
    }
  }

  if (!isAllowedPath(path)) {
    payload.logger.warn({
      msg: 'preview refused',
      reason: 'invalid_path',
      collection,
      path,
    })
    return new Response('This preview link is invalid.', { status: 400 })
  }

  const secret = process.env.PAYLOAD_SECRET
  if (!secret) {
    payload.logger.error({ msg: 'PAYLOAD_SECRET is missing' })
    return new Response('Server configuration error', { status: 500 })
  }

  if (!token) {
    payload.logger.warn({
      msg: 'preview refused',
      reason: 'missing_token',
      collection,
    })
    return new Response('This preview link is invalid.', { status: 403 })
  }

  const verification = verifyPreview(token, secret)
  if (!verification.ok) {
    if (verification.reason === 'expired') {
      payload.logger.warn({
        msg: 'preview refused',
        reason: 'expired',
        collection,
      })
      return new Response('This preview link has expired. Reload the page in the admin.', {
        status: 403,
      })
    }
    payload.logger.warn({
      msg: 'preview refused',
      reason: verification.reason,
      collection,
    })
    return new Response('This preview link is invalid.', { status: 403 })
  }

  const { claims } = verification
  const hostTenantId = await getFrontendTenantId()

  if (hostTenantId === null || hostTenantId !== claims.tenantId) {
    payload.logger.warn({
      msg: 'preview refused',
      reason: 'tenant_mismatch',
      userId: claims.userId,
      tenantId: claims.tenantId,
      hostTenantId,
      collection,
    })
    return new Response("You can't preview this business's site.", { status: 403 })
  }

  const user = await payload.findByID({
    collection: 'users',
    id: claims.userId,
    depth: 1,
    overrideAccess: true,
    disableErrors: true,
  })

  if (!user || !canPreviewTenant(user, claims.tenantId, collection)) {
    payload.logger.warn({
      msg: 'preview refused',
      reason: 'access_denied',
      userId: claims.userId,
      tenantId: claims.tenantId,
      hostTenantId,
      collection,
    })
    return new Response("You can't preview this business's site.", { status: 403 })
  }

  const draft = await draftMode()
  draft.enable()

  const cookieStore = await cookies()
  const now = Math.floor(Date.now() / 1000)
  const previewCookie = signPreview(
    {
      userId: claims.userId,
      tenantId: claims.tenantId,
      exp: now + 8 * 3600,
    },
    secret,
  )

  const isHttps = (): boolean => {
    if (process.env.TRUST_PROXY === 'true') {
      const forwarded = req.headers.get('x-forwarded-proto')
      if (forwarded) {
        const proto = forwarded.split(',')[0]?.trim().toLowerCase()
        if (proto === 'https') return true
      }
    }
    return req.nextUrl.protocol === 'https:'
  }

  const https = isHttps()

  cookieStore.set('tenant-preview', previewCookie, {
    httpOnly: true,
    path: '/',
    maxAge: 8 * 3600,
    secure: https,
    sameSite: https ? 'none' : 'lax',
  })

  payload.logger.info({
    msg: 'preview link verified successfully',
    userId: claims.userId,
    tenantId: claims.tenantId,
    hostTenantId,
    collection,
    path,
  })

  redirect(path)
}
