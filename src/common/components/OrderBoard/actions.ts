'use server'

import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { APIError, getPayload, NotFound, ValidationError, type Payload } from 'payload'

import {
  clearAssistance,
  getBoardContext,
  listBoardOrders,
  listRefundDue,
  moveOrder,
  recordPayment,
  voidPayment,
  type BoardContext,
  type BoardOrders,
  type ClearAssistanceInput,
  type ListBoardOrdersInput,
  type MoveOrderInput,
  type RecordPaymentInput,
  type VoidPaymentInput,
} from '@/collections/Orders/utils/board'
import { closeOrder, type CloseOrderInput } from '@/collections/Orders/utils/closeOrder'
import { staffRolesFor, type StaffRole } from '@/common/utils/staffRoles'
import type { Order, Payment, User } from '@/payload-types'

/**
 * The staff boards' actions (rem0018 phase 4 step 1): thin wrappers over
 * `src/collections/Orders/utils/board.ts` and `closeOrder`. Each signs the user in from the
 * request (`payload.auth` with the request headers) and passes the client's arguments through
 * untrusted: the Local API calls as that user decide.
 */

/** What the board shows on a refusal; `status` 401 / 403 / 404 / 400. Never throws to the client. */
export type BoardResult<T> = { ok: true; data: T } | { ok: false; status: number; message: string }

const isRecord = (val: unknown): val is Record<string, unknown> =>
  typeof val === 'object' && val !== null

const isUser = (val: unknown): val is User => {
  if (!isRecord(val)) return false
  if (typeof val.id !== 'number' || typeof val.email !== 'string') return false
  if ('collection' in val && val.collection !== 'users') return false
  return true
}

/**
 * Runs `fn` with the signed-in user, turning a thrown APIError / ValidationError into
 * `{ ok: false, status, message }` (its own message: they are written for the board) and
 * anything else into 500 "Something went wrong" (logged `error` with the action name).
 * 1. `payload.auth({ headers: await headers() })`; no user → `{ ok: false, status: 401 }`
 * 2. `await fn(payload, user)` → `{ ok: true, data }`
 */
const withStaff = async <T>(
  action: string,
  fn: (payload: Payload, user: User) => Promise<T>,
): Promise<BoardResult<T>> => {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await headers() })
  if (!isUser(user)) {
    return { ok: false, status: 401, message: 'Unauthorized' }
  }

  try {
    const data = await fn(payload, user)
    return { ok: true, data }
  } catch (err) {
    if (err instanceof NotFound) {
      return { ok: false, status: 404, message: err.message }
    }
    if (err instanceof APIError || err instanceof ValidationError) {
      return { ok: false, status: err.status, message: err.message }
    }
    payload.logger.error({
      msg: `board action failed: ${action}`,
      action,
      err,
    })
    return { ok: false, status: 500, message: 'Something went wrong' }
  }
}

/** The roles the user holds in a tenant, for the nav links (no menus, no 403). */
export const getBoardRolesAction = async (tenantId: number): Promise<BoardResult<StaffRole[]>> =>
  withStaff('getBoardRoles', async (_payload, user) => staffRolesFor(user, tenantId))

export const getBoardContextAction = async (tenantId: number): Promise<BoardResult<BoardContext>> =>
  withStaff('getBoardContext', (payload, user) => getBoardContext(payload, user, tenantId))

export const listBoardOrdersAction = async (
  input: ListBoardOrdersInput,
): Promise<BoardResult<BoardOrders>> =>
  withStaff('listBoardOrders', (payload, user) => listBoardOrders(payload, user, input))

export const listRefundDueAction = async (tenantId: number): Promise<BoardResult<Payment[]>> =>
  withStaff('listRefundDue', (payload, user) => listRefundDue(payload, user, tenantId))

export const moveOrderAction = async (input: MoveOrderInput): Promise<BoardResult<Order>> =>
  withStaff('moveOrder', (payload, user) => moveOrder(payload, user, input))

export const recordPaymentAction = async (
  input: RecordPaymentInput,
): Promise<BoardResult<Payment>> =>
  withStaff('recordPayment', (payload, user) => recordPayment(payload, user, input))

export const voidPaymentAction = async (input: VoidPaymentInput): Promise<BoardResult<Payment>> =>
  withStaff('voidPayment', (payload, user) => voidPayment(payload, user, input))

export const closeOrderAction = async (input: CloseOrderInput): Promise<BoardResult<Order>> =>
  withStaff('closeOrder', (payload, user) => closeOrder(payload, user, input))

export const clearAssistanceAction = async (
  input: ClearAssistanceInput,
): Promise<BoardResult<Order>> =>
  withStaff('clearAssistance', (payload, user) => clearAssistance(payload, user, input))
