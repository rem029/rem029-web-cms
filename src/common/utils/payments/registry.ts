import type { Payload } from 'payload'

import type { Setting } from '@/payload-types'
import { extractTenantId } from '@/common/utils/tenantCollections'

import type { PaymentProvider } from './provider'
import { testProvider } from './providers/test'

/**
 * Every online provider the code knows (rem0018 phase 2 step 2). Adding a gateway: write
 * `providers/<name>.ts`, add it here, its env secrets to `.env.example`, then `generate:types` +
 * `migrate:create` (Settings stores the key in a select, so the new key is a new enum value).
 * Cash and card stay `MANUAL_PROVIDER` on the payment: the manual provider never takes a
 * checkout, so it isn't listed here.
 */
export const PROVIDERS: readonly PaymentProvider[] = [testProvider]

/** The providers this process may use: `isAvailable()` (the `test` one only in dev, see test.ts). */
export const listProviders = (): PaymentProvider[] => {
  return PROVIDERS.filter((provider) => provider.isAvailable())
}

/** The provider for a key, or `null` when it isn't available here (e.g. `test` in production). */
export const getProvider = (key: string | null | undefined): PaymentProvider | null => {
  if (!key) return null
  return listProviders().find((provider) => provider.key === key) ?? null
}

/**
 * The tenant's online provider (rem0018 phase 2 step 2), or `null` when the tenant picked none,
 * picked one that isn't available here (`warn`: e.g. `test` saved, then production) or that
 * isn't configured (`warn`: secrets missing).
 */
export const onlineProviderFor = (
  payload: Payload,
  settings: Setting | null,
): PaymentProvider | null => {
  const tenantId = extractTenantId(settings?.tenant)
  const key = settings?.onlinePayments?.provider
  if (!key || key === 'none') {
    return null
  }

  const provider = getProvider(key)
  if (!provider) {
    payload.logger.warn({
      msg: 'online payment: provider not available',
      tenantId,
      provider: key,
    })
    return null
  }

  if (!provider.isConfigured(settings)) {
    payload.logger.warn({
      msg: 'online payment: provider not configured',
      tenantId,
      provider: key,
    })
    return null
  }

  return provider
}
