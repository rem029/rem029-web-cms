import type { CollectionAfterChangeHook } from 'payload'

import { revalidateTag } from 'next/cache'

export const revalidateRedirects: CollectionAfterChangeHook = ({
  doc,
  req: { payload, context },
}) => {
  // seeds and scripts run outside next.js, where revalidateTag throws
  if (context.disableRevalidate) return doc

  payload.logger.info(`Revalidating redirects`)

  revalidateTag('redirects')

  return doc
}
