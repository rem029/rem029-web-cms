import configPromise from '@payload-config'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import { DEFAULT_CURRENCY } from '@/collections/Settings/fields/currency'
import { Button } from '@/components/ui/button'
import { formatMinor } from '@/common/utils/money'
import { getProvider } from '@/common/utils/payments/registry'

import { finishTestCheckout } from './actions'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ ref?: string; return?: string }> }

/**
 * The `test` provider's hosted page (rem0018 phase 2 step 2, dev only): the order's amount and two
 * buttons, Pay and Fail, instead of a card form. 404 unless the test provider is available.
 */
export default async function TestCheckoutPage({ searchParams }: Props) {
  if (!getProvider('test')) notFound()

  const { ref, return: returnTo } = await searchParams
  if (!ref) notFound()

  const payload = await getPayload({ config: configPromise })
  const { docs } = await payload.find({
    collection: 'payments',
    where: { and: [{ provider: { equals: 'test' } }, { providerRef: { equals: ref } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const payment = docs[0]
  if (!payment || payment.status !== 'pending') notFound()

  const amount = formatMinor(payment.amount ?? 0, payment.currency ?? DEFAULT_CURRENCY, 'en')

  return (
    <main className="container max-w-md py-16">
      <h1 className="text-2xl font-semibold">Test payment</h1>
      <p className="mt-2 text-muted-foreground">
        Dev only: no card is charged. Order #{payment.orderNumber}
      </p>
      <p className="mt-6 text-3xl font-semibold">{amount}</p>
      <form action={finishTestCheckout} className="mt-8 flex gap-3">
        <input type="hidden" name="ref" value={ref} />
        <input type="hidden" name="return" value={returnTo ?? '/'} />
        <Button type="submit" name="outcome" value="succeeded">
          Pay
        </Button>
        <Button type="submit" name="outcome" value="failed" variant="outline">
          Fail
        </Button>
      </form>
    </main>
  )
}
