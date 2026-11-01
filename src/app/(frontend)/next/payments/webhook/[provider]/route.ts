import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { applyWebhook } from '@/common/utils/payments/applyWebhook'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ provider: string }> }

/**
 * A payment provider's webhook (rem0018 phase 2 step 2): `POST /next/payments/webhook/<provider>`.
 * No session: the provider signs the request and `applyWebhook` checks it. Answers 200 for every
 * recorded or repeated event, so the provider stops retrying.
 */
export async function POST(req: Request, { params }: Params): Promise<Response> {
  const payload = await getPayload({ config: configPromise })
  const { provider } = await params

  const result = await applyWebhook(payload, provider, req)
  if (!result.ok) {
    return Response.json({ error: result.message }, { status: result.status })
  }
  return Response.json({ received: true })
}
