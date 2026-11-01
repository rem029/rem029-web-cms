import type { Payload } from 'payload'

import { extractTenantId } from '@/common/utils/tenantCollections'

import { getProvider } from './registry'

export type ApplyWebhookResult =
  | { ok: true; outcome: 'succeeded' | 'failed' | 'unchanged' }
  | { ok: false; status: 400 | 404; message: string }

/**
 * Records a provider's webhook on its payment (rem0018 phase 2 step 2). Used by the webhook route
 * and the test checkout page. Idempotent: providers retry, so the same event again changes
 * nothing. The order follows through `syncOrderPayment` (paid, completed when served under the
 * cashier flow), and its `broadcast` tells open screens after commit.
 */
export const applyWebhook = async (
  payload: Payload,
  providerKey: string,
  request: Request,
): Promise<ApplyWebhookResult> => {
  const provider = getProvider(providerKey)
  if (!provider) {
    return { ok: false, status: 404, message: 'Unknown payment provider.' }
  }

  const result = await provider.parseWebhook(request)
  if (!result) {
    payload.logger.warn({
      msg: 'online payment webhook: invalid webhook',
      provider: providerKey,
    })
    return { ok: false, status: 400, message: 'Invalid webhook.' }
  }

  const { docs: payments } = await payload.find({
    collection: 'payments',
    where: {
      and: [{ provider: { equals: providerKey } }, { providerRef: { equals: result.providerRef } }],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const payment = payments[0]
  if (!payment) {
    payload.logger.warn({
      msg: 'online payment webhook: payment not found',
      provider: providerKey,
      providerRef: result.providerRef,
    })
    return { ok: false, status: 404, message: 'Payment not found.' }
  }

  const tenantId = extractTenantId(payment.tenant)
  const orderId = extractTenantId(payment.order)

  if (payment.status === result.status) {
    payload.logger.debug({
      msg: 'online payment webhook: status unchanged',
      tenantId,
      orderId,
      paymentId: payment.id,
      status: payment.status,
    })
    return { ok: true, outcome: 'unchanged' }
  }

  if (result.status === 'succeeded') {
    // a success is always recorded (money moved); a wrong amount is refunded by hand, and
    // validatePayment adds the cases the order didn't need (paid already, closed), under its lock
    const amountDiffers = result.amount !== payment.amount
    const updated = await payload.update({
      collection: 'payments',
      id: payment.id,
      data: { status: 'succeeded', refundDue: amountDiffers },
      overrideAccess: true,
      depth: 0,
    })
    const logContext = {
      tenantId,
      orderId,
      paymentId: payment.id,
      provider: providerKey,
      amount: result.amount,
      expected: payment.amount,
    }
    if (updated.refundDue) {
      payload.logger.warn({ msg: 'online payment webhook: succeeded, refund due', ...logContext })
    } else {
      payload.logger.info({ msg: 'online payment webhook: succeeded', ...logContext })
    }
    return { ok: true, outcome: 'succeeded' }
  }

  if (payment.status === 'pending') {
    await payload.update({
      collection: 'payments',
      id: payment.id,
      data: { status: 'failed' },
      overrideAccess: true,
      depth: 0,
    })
    payload.logger.info({
      msg: 'online payment webhook: failed',
      tenantId,
      orderId,
      paymentId: payment.id,
      provider: providerKey,
    })
    return { ok: true, outcome: 'failed' }
  }

  // a failure never undoes a success, nor reopens a closed checkout
  return { ok: true, outcome: 'unchanged' }
}
