'use server'

import configPromise from '@payload-config'
import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'

import { applyWebhook } from '@/common/utils/payments/applyWebhook'
import { getProvider } from '@/common/utils/payments/registry'
import { signTestWebhook } from '@/common/utils/payments/providers/test'
import { getServerSideURL } from '@/utilities/getURL'

const sameSitePath = (value: FormDataEntryValue | null): string =>
  typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/'

/**
 * The fake page's Pay / Fail buttons (rem0018 phase 2 step 2, dev only). Sends the signed webhook
 * a real gateway would send, through the same path as the route (`applyWebhook`), then sends the
 * guest back.
 */
export async function finishTestCheckout(formData: FormData): Promise<void> {
  if (!getProvider('test')) notFound()

  const payload = await getPayload({ config: configPromise })
  const ref = formData.get('ref')
  const outcome = formData.get('outcome') === 'succeeded' ? 'succeeded' : 'failed'
  const returnTo = sameSitePath(formData.get('return'))
  if (typeof ref !== 'string' || !ref) notFound()

  const { docs } = await payload.find({
    collection: 'payments',
    where: { and: [{ provider: { equals: 'test' } }, { providerRef: { equals: ref } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const payment = docs[0]
  if (!payment) notFound()

  const { body, signature } = signTestWebhook({
    providerRef: ref,
    status: outcome,
    amount: payment.amount ?? 0,
  })
  const request = new Request(`${getServerSideURL()}/next/payments/webhook/test`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-test-signature': signature },
    body,
  })
  const result = await applyWebhook(payload, 'test', request)
  if (!result.ok) {
    payload.logger.warn({ msg: 'test checkout: webhook refused', paymentId: payment.id, result })
  }

  redirect(returnTo)
}
