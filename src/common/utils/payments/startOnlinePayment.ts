import type { Payload } from 'payload'

import { DEFAULT_CURRENCY } from '@/collections/Settings/fields/currency'
import type { Payment } from '@/payload-types'
import { extractTenantId } from '@/common/utils/tenantCollections'

import type { CheckoutResult } from './provider'
import { onlineProviderFor } from './registry'

export type StartOnlinePaymentArgs = {
  orderId: number
  /** a same-site path (`/menu/...`): anything else is refused (no open redirect) */
  returnUrl: string
}

export type StartOnlinePaymentResult =
  | { ok: true; redirectUrl: string; paymentId: number }
  | { ok: false; status: 400 | 404; message: string }

/**
 * Starts a guest's online payment (rem0018 phase 2 step 2): one `pending` online payment for the
 * order's total, then the provider's checkout. Server code only (no user): the guest's "Pay now"
 * action in phase 3 checks the guest token first, then calls this.
 */
export const startOnlinePayment = async (
  payload: Payload,
  args: StartOnlinePaymentArgs,
): Promise<StartOnlinePaymentResult> => {
  // Refuse off-site returns (no open redirect)
  if (!args.returnUrl.startsWith('/') || args.returnUrl.startsWith('//')) {
    return { ok: false, status: 400, message: 'Invalid return address.' }
  }

  const order = await payload.findByID({
    collection: 'orders',
    id: args.orderId,
    overrideAccess: true,
    depth: 0,
    disableErrors: true,
  })
  if (!order) {
    return { ok: false, status: 404, message: 'Order not found.' }
  }

  const tenantId = extractTenantId(order.tenant)

  if (order.status === 'cancelled') {
    return { ok: false, status: 400, message: 'This order was cancelled.' }
  }
  if (order.paymentStatus === 'paid') {
    return { ok: false, status: 400, message: 'This order is already paid.' }
  }
  if (order.paymentStatus === 'waived') {
    return { ok: false, status: 400, message: 'This order was closed without payment.' }
  }

  const { docs: settingsDocs } = await payload.find({
    collection: 'settings',
    where: { tenant: { equals: tenantId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const settings = settingsDocs[0] ?? null
  const provider = onlineProviderFor(payload, settings)
  if (!provider) {
    payload.logger.warn({
      msg: 'online payment: no provider available for tenant',
      tenantId,
      orderId: order.id,
    })
    return { ok: false, status: 400, message: "Online payment isn't available." }
  }

  // Cancel earlier pending online checkouts of this order
  const { docs: pendingPayments } = await payload.find({
    collection: 'payments',
    where: {
      and: [
        { order: { equals: order.id } },
        { method: { equals: 'online' } },
        { status: { equals: 'pending' } },
      ],
    },
    overrideAccess: true,
    depth: 0,
  })
  for (const pending of pendingPayments) {
    await payload.update({
      collection: 'payments',
      id: pending.id,
      data: { status: 'cancelled' },
      overrideAccess: true,
      depth: 0,
    })
  }

  let payment: Payment
  try {
    payment = await payload.create({
      collection: 'payments',
      data: {
        order: order.id,
        tenant: tenantId ?? undefined,
        method: 'online',
        provider: provider.key,
        status: 'pending',
      },
      overrideAccess: true,
      depth: 0,
    })
  } catch (err) {
    // validatePayment refused it (e.g. paid at the counter a moment ago): its field message is for
    // staff, the guest gets a plain one
    payload.logger.warn({
      msg: 'online payment: create payment rejected',
      tenantId,
      orderId: order.id,
      err,
    })
    return { ok: false, status: 400, message: "This order can't be paid online right now." }
  }

  let checkoutResult: CheckoutResult
  try {
    checkoutResult = await provider.createCheckout({
      order,
      amount: payment.amount ?? order.total ?? 0,
      currency: order.currency ?? DEFAULT_CURRENCY,
      returnUrl: args.returnUrl,
    })
  } catch (err) {
    await payload.update({
      collection: 'payments',
      id: payment.id,
      data: { status: 'failed' },
      overrideAccess: true,
      depth: 0,
    })
    payload.logger.error({
      msg: 'online payment: createCheckout failed',
      tenantId,
      orderId: order.id,
      paymentId: payment.id,
      provider: provider.key,
      err,
    })
    return {
      ok: false,
      status: 400,
      message: 'The payment provider is not reachable. Try again or pay at the counter.',
    }
  }

  await payload.update({
    collection: 'payments',
    id: payment.id,
    data: { providerRef: checkoutResult.providerRef },
    overrideAccess: true,
    depth: 0,
  })

  payload.logger.info({
    msg: 'online payment: checkout started',
    tenantId,
    orderId: order.id,
    paymentId: payment.id,
    provider: provider.key,
  })

  return {
    ok: true,
    redirectUrl: checkoutResult.redirectUrl,
    paymentId: payment.id,
  }
}
