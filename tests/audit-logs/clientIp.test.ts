// `clientIp`: the first `x-forwarded-for` entry, only behind a trusted proxy (`TRUST_PROXY=true`).
import { createLocalReq, type Payload } from 'payload'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { clientIp } from '@/common/utils/auditLog'

import { getTestPayload } from '../common/payload'

describe('clientIp', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns the first forwarded ip behind a trusted proxy', async () => {
    // arrange: TRUST_PROXY=true; createLocalReq with x-forwarded-for '203.0.113.7, 10.0.0.1'
    vi.stubEnv('TRUST_PROXY', 'true')
    const req = await createLocalReq(
      { req: { headers: new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }) } },
      payload,
    )

    // assert: clientIp(req) is 203.0.113.7
    expect(clientIp(req)).toBe('203.0.113.7')
  })

  it('returns null without TRUST_PROXY', async () => {
    // arrange: TRUST_PROXY unset; the same header
    vi.stubEnv('TRUST_PROXY', '')
    const req = await createLocalReq(
      { req: { headers: new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }) } },
      payload,
    )

    // assert: null
    expect(clientIp(req)).toBeNull()
  })

  it('returns null without the header', async () => {
    // arrange: TRUST_PROXY=true; no header
    vi.stubEnv('TRUST_PROXY', 'true')
    const req = await createLocalReq({ req: { headers: new Headers() } }, payload)

    // assert: null
    expect(clientIp(req)).toBeNull()
  })
})
