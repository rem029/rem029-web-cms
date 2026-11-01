// The online payment providers (rem0018 phase 2 step 2, src/common/utils/payments/registry.ts):
// the dev-only `test` provider never loads in production, and a business gets a provider only
// when it picked one that is registered and configured. No db reads (the test Payload for its logger).
import type { Payload } from 'payload'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import type { Setting } from '@/payload-types'
import { getProvider, listProviders, onlineProviderFor } from '@/common/utils/payments/registry'

import { getTestPayload } from '../common/payload'

describe('registry', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  afterAll(() => {
    vi.unstubAllEnvs()
  })

  it('never offers the test provider in production', () => {
    // arrange: NODE_ENV 'production', PAYMENTS_TEST_PROVIDER 'true', PAYMENTS_TEST_SECRET 's'
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('PAYMENTS_TEST_PROVIDER', 'true')
    vi.stubEnv('PAYMENTS_TEST_SECRET', 's')

    // act: listProviders(), getProvider('test')
    const providers = listProviders()
    const provider = getProvider('test')

    // assert: no 'test' key; getProvider null
    expect(providers.map((p) => p.key)).not.toContain('test')
    expect(provider).toBeNull()
  })

  it('offers the test provider only when switched on', () => {
    // arrange: NODE_ENV 'test'; PAYMENTS_TEST_PROVIDER 'false', then 'true'
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('PAYMENTS_TEST_PROVIDER', 'false')

    // act: getProvider('test') each time
    const disabled = getProvider('test')

    vi.stubEnv('PAYMENTS_TEST_PROVIDER', 'true')
    const enabled = getProvider('test')

    // assert: null, then the provider with key 'test'
    expect(disabled).toBeNull()
    expect(enabled).not.toBeNull()
    expect(enabled?.key).toBe('test')
  })

  it('has no provider for a business without a configured one', () => {
    // arrange: test provider switched on, PAYMENTS_TEST_SECRET ''
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('PAYMENTS_TEST_PROVIDER', 'true')
    vi.stubEnv('PAYMENTS_TEST_SECRET', '')

    const settingsNone: Setting = {
      id: 1,
      tenant: 1,
      onlinePayments: { provider: 'none' },
      updatedAt: '',
      createdAt: '',
    }
    const settingsTest: Setting = {
      id: 1,
      tenant: 1,
      onlinePayments: { provider: 'test' },
      updatedAt: '',
      createdAt: '',
    }

    // act: onlineProviderFor(payload, settings with provider 'none'), then with 'test'
    const providerNone = onlineProviderFor(payload, settingsNone)
    const providerTest = onlineProviderFor(payload, settingsTest)

    // assert: null both times (none picked; test not configured, warned)
    expect(providerNone).toBeNull()
    expect(providerTest).toBeNull()
  })
})
