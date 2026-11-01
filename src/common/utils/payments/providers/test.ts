import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

import type { CheckoutArgs, CheckoutResult, PaymentProvider, WebhookResult } from '../provider'

/** Where the fake hosted page lives (`src/app/(frontend)/next/payments/test/checkout`). */
export const TEST_CHECKOUT_PATH = '/next/payments/test/checkout'

/**
 * The signed body the fake page posts to `/next/payments/webhook/test`, as a real gateway would:
 * JSON `{ providerRef, status, amount }` with an `x-test-signature` header, the hex HMAC-SHA256
 * of the body with `PAYMENTS_TEST_SECRET`. Used by the page's action and by the tests.
 */
export const signTestWebhook = (result: WebhookResult): { body: string; signature: string } => {
  const secret = process.env.PAYMENTS_TEST_SECRET ?? ''
  const body = JSON.stringify({
    providerRef: result.providerRef,
    status: result.status,
    amount: result.amount,
  })
  const signature = createHmac('sha256', secret).update(body).digest('hex')
  return { body, signature }
}

/**
 * The dev-only fake gateway (rem0018 phase 2 step 2): a plain page with Pay / Fail instead of a
 * card form, so the online flow runs end to end without a real gateway. Available only in dev
 * (`isAvailable`). Also the template for a real gateway (references/adding-a-payment-provider.md in the docs).
 */
export const testProvider: PaymentProvider = {
  key: 'test',
  label: 'Test provider (dev only)',
  // Never available in production; otherwise available when PAYMENTS_TEST_PROVIDER is true.
  isAvailable: () => {
    if (process.env.NODE_ENV === 'production') return false
    return process.env.PAYMENTS_TEST_PROVIDER === 'true'
  },
  // Configured when PAYMENTS_TEST_SECRET is present.
  isConfigured: () => Boolean(process.env.PAYMENTS_TEST_SECRET),
  // Creates a test checkout session with a random providerRef and relative redirect url.
  createCheckout: async (args: CheckoutArgs): Promise<CheckoutResult> => {
    const providerRef = `test_${randomUUID()}`
    const redirectUrl = `${TEST_CHECKOUT_PATH}?ref=${encodeURIComponent(providerRef)}&return=${encodeURIComponent(args.returnUrl)}`
    return { redirectUrl, providerRef }
  },
  // Validates HMAC signature with PAYMENTS_TEST_SECRET and extracts the webhook payload.
  parseWebhook: async (request: Request): Promise<WebhookResult | null> => {
    const secret = process.env.PAYMENTS_TEST_SECRET
    if (!secret) return null

    const signature = request.headers.get('x-test-signature')
    if (!signature) return null

    const body = await request.text()
    const expected = createHmac('sha256', secret).update(body).digest('hex')

    const sigBuf = Buffer.from(signature)
    const expBuf = Buffer.from(expected)
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return null
    }

    return isWebhookResult(parseJson(body))
  },
}

// a signed body that isn't JSON reads as "not a webhook" (`applyWebhook` warns on null)
const parseJson = (body: string): unknown => {
  try {
    return JSON.parse(body)
  } catch {
    return null
  }
}

const isWebhookResult = (data: unknown): WebhookResult | null => {
  if (!data || typeof data !== 'object') return null
  if (!('providerRef' in data) || !('status' in data) || !('amount' in data)) return null
  const { providerRef, status, amount } = data
  if (typeof providerRef !== 'string' || !providerRef) return null
  if (status !== 'succeeded' && status !== 'failed') return null
  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount <= 0) return null
  return { providerRef, status, amount }
}
