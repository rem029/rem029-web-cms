import type { PayloadRequest } from 'payload'

type TransactionSession = {
  db: unknown
  reject: () => unknown
  resolve: () => unknown
}

const sessionCallbacks = new WeakMap<TransactionSession, (() => void)[]>()

const hasSessions = (db: unknown): db is { sessions: Record<string | number, unknown> } => {
  return typeof db === 'object' && db !== null && 'sessions' in db
}

const isSession = (val: unknown): val is TransactionSession => {
  return (
    typeof val === 'object' &&
    val !== null &&
    'resolve' in val &&
    typeof val.resolve === 'function' &&
    'reject' in val &&
    typeof val.reject === 'function'
  )
}

/**
 * Runs `fn` once the request's transaction has committed, or at once when there is none
 * (rem0018 phase 1 step 3b, plan "real time", improvement 1). Payload 3.44 runs `afterChange`
 * inside the transaction, so a later hook that throws would roll back a save whose event was
 * already sent. Dropped on rollback. `fn` errors are logged, never thrown into the request.
 *
 * Relies on @payloadcms/db-postgres keeping `db.sessions[transactionID] = { db, resolve, reject }`
 * and `commitTransaction` calling `resolve`: re-check on the Payload upgrade (rem0013);
 * `tests/restaurant-orders/orderEvents.test.ts` guards it.
 */
export const afterCommit = async (req: PayloadRequest, fn: () => void): Promise<void> => {
  const runDirectly = (): void => {
    try {
      fn()
    } catch (err) {
      req.payload.logger.error({ msg: 'after commit: callback failed', err })
    }
  }

  if (!req.transactionID) {
    runDirectly()
    return
  }

  const transactionID = await req.transactionID
  if (transactionID === undefined || transactionID === null) {
    runDirectly()
    return
  }

  const db = req.payload.db
  if (!hasSessions(db)) {
    req.payload.logger.warn({ msg: 'after commit: no session, running now' })
    runDirectly()
    return
  }

  const session = db.sessions[transactionID]
  if (!isSession(session)) {
    req.payload.logger.warn({ msg: 'after commit: no session, running now' })
    runDirectly()
    return
  }

  let callbacks = sessionCallbacks.get(session)
  if (!callbacks) {
    callbacks = []
    sessionCallbacks.set(session, callbacks)
    const originalResolve = session.resolve
    session.resolve = async () => {
      const result = await originalResolve()
      const cbs = sessionCallbacks.get(session) ?? []
      for (const cb of cbs) {
        try {
          cb()
        } catch (err) {
          req.payload.logger.error({ msg: 'after commit: callback failed', err })
        }
      }
      return result
    }
  }

  callbacks.push(fn)
}
