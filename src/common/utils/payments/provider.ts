import type { Order, Setting } from '@/payload-types'

/**
 * A hosted-checkout payment gateway (rem0018 phase 2 step 2, plan "payment gateway readiness").
 * Card data never touches this app: the guest pays on the provider's page and the provider tells
 * us the outcome through its webhook. A real gateway later is one file like `providers/test.ts`,
 * one line in `PROVIDERS` (registry.ts) and its env secrets: the checkout, the webhook route,
 * idempotency, the order's status and the refund flag are shared code. Refunds are left out until
 * a gateway needs them (a late or duplicate success is refunded by hand: `refundDue`).
 */
export type PaymentProvider = {
  /** stored on the payment (`provider`), in Settings and in the webhook url; never change it */
  key: string
  /** shown to editors in Settings */
  label: string
  /** whether this process may load it at all (`test`: dev only); a real gateway: `() => true` */
  isAvailable: () => boolean
  /** false when its env secrets are missing: the tenant then has no online payments */
  isConfigured: (settings: Setting) => boolean
  createCheckout: (args: CheckoutArgs) => Promise<CheckoutResult>
  /** verifies the signature; `null` for a request that isn't from the provider */
  parseWebhook: (request: Request) => Promise<WebhookResult | null>
}

export type CheckoutArgs = {
  order: Order
  /** minor units, the order's total */
  amount: number
  currency: string
  /** a same-site path the provider sends the guest back to */
  returnUrl: string
}

export type CheckoutResult = {
  /** where the guest's browser goes to pay */
  redirectUrl: string
  /** the provider's id for this checkout: the payment's `providerRef` */
  providerRef: string
}

export type WebhookResult = {
  providerRef: string
  status: 'succeeded' | 'failed'
  /** minor units, as the provider charged it */
  amount: number
}
