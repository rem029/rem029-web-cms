// The signed preview token: signPreview / verifyPreview with a fixed secret. Pure, no db.
import { describe, expect, it } from 'vitest'

import { signPreview, verifyPreview } from '@/common/utils/previewToken'

const SECRET = 'test-secret'

describe('preview token', () => {
  const claims = { userId: 1, tenantId: 7, exp: Math.floor(Date.now() / 1000) + 60 }
  const validToken = signPreview(claims, SECRET)

  it('verifies a token it signed', () => {
    // act
    const result = verifyPreview(signPreview(claims, SECRET), SECRET)

    // assert
    expect(result).toEqual({ ok: true, claims })
  })

  it('rejects a tampered payload', () => {
    // arrange
    const otherPayload = Buffer.from(JSON.stringify({ ...claims, userId: 999 })).toString(
      'base64url',
    )
    const tampered = `${otherPayload}.${validToken.split('.')[1]}`

    // act
    const result = verifyPreview(tampered, SECRET)

    // assert
    expect(result).toEqual({ ok: false, reason: 'signature' })
  })

  it('rejects an expired token', () => {
    // arrange
    const expired = signPreview({ ...claims, exp: Math.floor(Date.now() / 1000) - 10 }, SECRET)

    // act
    const result = verifyPreview(expired, SECRET)

    // assert
    expect(result).toEqual({ ok: false, reason: 'expired' })
  })

  it('rejects garbage as malformed', () => {
    // act
    const result = verifyPreview('not-a-valid-token', SECRET)

    // assert
    expect(result).toEqual({ ok: false, reason: 'malformed' })
  })

  it('rejects a token signed with another secret', () => {
    // act
    const result = verifyPreview(validToken, 'wrong-secret')

    // assert
    expect(result).toEqual({ ok: false, reason: 'signature' })
  })
})
