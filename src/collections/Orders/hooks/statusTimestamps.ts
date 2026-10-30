import type { CollectionBeforeChangeHook } from 'payload'

import type { Order } from '@/payload-types'

import { FORWARD_STATUSES, STATUS_TIMESTAMP_FIELDS } from '../utils/transitions'


/**
 * Stamps when an order reached each status (rem0018 phase 1 step 3b): `confirmedAt` …
 * `cancelledAt` (`STATUS_TIMESTAMP_FIELDS`), for the boards' timers and the report. Server time
 * only: whatever the caller sent for these fields is ignored.
 */
export const statusTimestamps: CollectionBeforeChangeHook<Order> = ({
  data,
  operation,
  originalDoc,
}) => {
  for (const field of Object.values(STATUS_TIMESTAMP_FIELDS)) {
    delete data[field]
  }

  const from = originalDoc?.status
  const to = data.status ?? from

  if (operation === 'update' && (!to || from === to)) {
    return data
  }

  if (to === 'cancelled') {
    data.cancelledAt = new Date().toISOString()
    return data
  }

  const fromIndex = from ? FORWARD_STATUSES.indexOf(from) : 0
  const toIndex = to ? FORWARD_STATUSES.indexOf(to) : -1

  if (fromIndex !== -1 && toIndex !== -1) {
    if (toIndex > fromIndex) {
      const now = new Date().toISOString()
      for (let i = fromIndex + 1; i <= toIndex; i++) {
        const statusPassed = FORWARD_STATUSES[i]
        if (statusPassed && statusPassed !== 'pending') {
          const field = STATUS_TIMESTAMP_FIELDS[statusPassed]
          if (!originalDoc?.[field]) {
            data[field] = now
          }
        }
      }
    } else if (toIndex < fromIndex) {
      for (let i = toIndex + 1; i <= fromIndex; i++) {
        const statusLeft = FORWARD_STATUSES[i]
        if (statusLeft && statusLeft !== 'pending') {
          const field = STATUS_TIMESTAMP_FIELDS[statusLeft]
          data[field] = null
        }
      }
    }
  }

  return data
}
