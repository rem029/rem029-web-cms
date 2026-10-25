import { sql } from '@payloadcms/db-postgres'
import { ValidationError, type CollectionBeforeChangeHook } from 'payload'

import type { Order } from '@/payload-types'
import { businessDate } from '@/common/utils/restaurantHours'
import { extractTenantId } from '@/common/utils/tenantCollections'

type Query = ReturnType<typeof sql>

const isExecutor = (val: unknown): val is { execute: (query: Query) => Promise<unknown> } =>
  typeof val === 'object' && val !== null && 'execute' in val && typeof val.execute === 'function'

const isLastRow = (val: unknown): val is { last: number | string } =>
  typeof val === 'object' &&
  val !== null &&
  'last' in val &&
  (typeof val.last === 'number' || typeof val.last === 'string')

const extractLast = (result: unknown): number | null => {
  if (Array.isArray(result) && result[0] && isLastRow(result[0])) {
    const num = Number(result[0].last)
    return Number.isFinite(num) ? num : null
  }
  if (
    typeof result === 'object' &&
    result !== null &&
    'rows' in result &&
    Array.isArray(result.rows) &&
    result.rows[0] &&
    isLastRow(result.rows[0])
  ) {
    const num = Number(result.rows[0].last)
    return Number.isFinite(num) ? num : null
  }
  return null
}

/**
 * Gives a new order its number and business day (rem0018 phase 1 step 3a). Numbers restart every
 * business day of the order's business: `businessDate(now, timezone, dayStartsAt)` from Settings →
 * Restaurant (`src/common/utils/restaurantHours.ts`; no settings: UTC, 00:00). One statement on
 * the request's own transaction, so two orders at once never get the same number and a refused
 * save gives its number back:
 *   INSERT INTO order_counters (tenant, date, last) VALUES (…, 1)
 *   ON CONFLICT (tenant, date) DO UPDATE SET last = order_counters.last + 1 RETURNING last
 * Creates only; an update never changes the number.
 */
export const assignOrderNumber: CollectionBeforeChangeHook<Order> = async ({
  data,
  operation,
  req,
}) => {
  if (!data || operation !== 'create') {
    return data
  }

  const tenantId = extractTenantId(data.tenant)
  if (tenantId === null) {
    req.payload.logger.error({ msg: 'order: missing tenant on create' })
    throw new ValidationError({
      collection: 'orders',
      errors: [{ path: 'tenant', message: 'Tenant is required.' }],
      req,
    })
  }

  const { docs: settings } = await req.payload.find({
    collection: 'settings',
    where: { tenant: { equals: tenantId } },
    overrideAccess: true,
    req,
    depth: 0,
    limit: 1,
  })

  const setting = settings[0]
  const timezone = setting?.restaurant?.timezone || 'UTC'
  const dayStartsAt = setting?.restaurant?.dayStartsAt || '00:00'
  const orderDate = businessDate(new Date(), timezone, dayStartsAt)

  const { db } = req.payload
  const transactionID = req.transactionID ? await req.transactionID : undefined
  const session = transactionID !== undefined ? db.sessions?.[transactionID]?.db : undefined
  const executor = isExecutor(session) ? session : db.drizzle

  const query = sql`
    INSERT INTO "order_counters" ("tenant", "date", "last", "updated_at", "created_at")
    VALUES (${tenantId}, ${orderDate}, 1, now(), now())
    ON CONFLICT ("tenant", "date")
    DO UPDATE SET "last" = "order_counters"."last" + 1, "updated_at" = now()
    RETURNING "last"
  `
  const result = await executor.execute(query)
  const orderNumber = extractLast(result)
  if (orderNumber === null) {
    req.payload.logger.error({ msg: 'order: counter returned no number', tenantId, orderDate })
    throw new Error('order: failed to assign order number')
  }

  req.payload.logger.debug({
    msg: 'order: number assigned',
    tenantId,
    orderDate,
    orderNumber,
  })

  return {
    ...data,
    orderNumber,
    orderDate,
  }
}
