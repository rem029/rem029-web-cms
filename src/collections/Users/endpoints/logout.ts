import { sql } from '@payloadcms/db-postgres'
import type { Endpoint, PayloadRequest } from 'payload'
import {
  APIError,
  commitTransaction,
  headersWithCors,
  initTransaction,
  killTransaction,
} from 'payload'
import { generateExpiredPayloadCookie } from 'payload/shared'

import type { User } from '@/payload-types'

type Query = ReturnType<typeof sql>

// Payload types a transaction session as `unknown` (adapter-agnostic); on Postgres it's a
// drizzle transaction
const isExecutor = (val: unknown): val is { execute: (query: Query) => Promise<unknown> } =>
  typeof val === 'object' && val !== null && 'execute' in val && typeof val.execute === 'function'

const sessionIdOf = (user: PayloadRequest['user']): string | undefined =>
  user && '_sid' in user && typeof user._sid === 'string' ? user._sid : undefined

/**
 * Replaces Payload's `POST /api/users/logout` (3.44). Payload's logout reads the user and writes
 * the whole row back (`db.updateOne` deletes and re-inserts every array) without a transaction,
 * so two logouts at once (the admin sends two in dev; two tabs, a double click) can interleave
 * and wipe the user's `tenants` rows: they lose access to their business. Fixed upstream in
 * 3.90 with a transaction; drop this endpoint when Payload is upgraded.
 *
 * Same behaviour as Payload's, in one transaction that first locks the user row, so a parallel
 * logout waits and then reads the committed rows instead of failing or wiping them.
 */
export const logoutEndpoint: Endpoint = {
  path: '/logout',
  method: 'post',
  handler: async (req) => {
    const { payload, user } = req
    if (!user) throw new APIError('No User', 400)

    const collection = payload.collections.users.config
    for (const hook of collection.hooks?.afterLogout ?? []) {
      await hook({ collection, context: req.context, req })
    }

    const allSessions = req.searchParams.get('allSessions') === 'true'
    const shouldCommit = await initTransaction(req)
    try {
      const { db } = payload
      const transactionID = req.transactionID ? await req.transactionID : undefined
      // the request's transaction, as Payload's own getTransaction picks it
      const session = transactionID !== undefined ? db.sessions?.[transactionID]?.db : undefined
      if (!isExecutor(session)) throw new APIError('logout: no database transaction', 500)
      await session.execute(sql`SELECT "id" FROM "users" WHERE "id" = ${user.id} FOR UPDATE`)

      const stored = await db.findOne<User>({
        collection: 'users',
        req,
        where: { id: { equals: user.id } },
      })
      if (!stored) throw new APIError('No User', 400)

      const sid = sessionIdOf(user)
      const sessions = stored.sessions ?? []
      await db.updateOne({
        collection: 'users',
        id: user.id,
        data: {
          ...stored,
          sessions: allSessions ? [] : sessions.filter((s) => s.id !== sid),
        },
        req,
        returning: false,
      })
      if (shouldCommit) await commitTransaction(req)
    } catch (err) {
      await killTransaction(req)
      payload.logger.error({ msg: 'logout failed', userId: user.id, err })
      throw err
    }

    payload.logger.debug({ msg: 'logout', userId: user.id, allSessions })
    const headers = headersWithCors({ headers: new Headers(), req })
    headers.set(
      'Set-Cookie',
      generateExpiredPayloadCookie({
        collectionAuthConfig: collection.auth,
        config: payload.config,
        cookiePrefix: payload.config.cookiePrefix,
      }),
    )
    return Response.json(
      { message: req.t('authentication:logoutSuccessful') },
      { headers, status: 200 },
    )
  },
}
