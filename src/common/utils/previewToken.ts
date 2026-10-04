import { createHmac, timingSafeEqual } from 'crypto'

export type PreviewClaims = {
  userId: number
  tenantId: number
  exp: number
}

const isPositiveInteger = (val: unknown): val is number =>
  typeof val === 'number' && Number.isInteger(val) && val > 0

const isPreviewClaims = (val: unknown): val is PreviewClaims =>
  typeof val === 'object' &&
  val !== null &&
  'userId' in val &&
  'tenantId' in val &&
  'exp' in val &&
  isPositiveInteger(val.userId) &&
  isPositiveInteger(val.tenantId) &&
  typeof val.exp === 'number' &&
  Number.isFinite(val.exp)

export function signPreview(claims: PreviewClaims, secret: string): string {
  if (!secret) {
    throw new Error('signPreview requires a non-empty secret')
  }
  const payloadPart = Buffer.from(JSON.stringify(claims), 'utf8').toString('base64url')
  const sigPart = createHmac('sha256', secret).update(payloadPart).digest('base64url')
  return `${payloadPart}.${sigPart}`
}

export type VerifyPreviewResult =
  | { ok: true; claims: PreviewClaims }
  | { ok: false; reason: 'malformed' | 'signature' | 'expired' }

export function verifyPreview(
  token: string,
  secret: string,
  now: number = Date.now(),
): VerifyPreviewResult {
  if (!secret || typeof token !== 'string') {
    return { ok: false, reason: 'malformed' }
  }

  const parts = token.split('.')
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { ok: false, reason: 'malformed' }
  }

  const [payloadPart, sigPart] = parts
  const expectedSig = createHmac('sha256', secret).update(payloadPart).digest('base64url')

  const sigBuf = Buffer.from(sigPart, 'utf8')
  const expectedSigBuf = Buffer.from(expectedSig, 'utf8')

  if (sigBuf.length !== expectedSigBuf.length || !timingSafeEqual(sigBuf, expectedSigBuf)) {
    return { ok: false, reason: 'signature' }
  }

  let parsed: unknown
  try {
    const json = Buffer.from(payloadPart, 'base64url').toString('utf8')
    parsed = JSON.parse(json)
  } catch {
    return { ok: false, reason: 'malformed' }
  }

  if (!isPreviewClaims(parsed)) {
    return { ok: false, reason: 'malformed' }
  }

  if (parsed.exp <= Math.floor(now / 1000)) {
    return { ok: false, reason: 'expired' }
  }

  return { ok: true, claims: parsed }
}
