/**
 * Seeded users as tests use them: loaded with their tenant rows and profiles, and turned into the
 * `req.user` / `req` the Local API expects. Typed against `@/payload-types`, no casts.
 */
import type { Payload, PayloadRequest } from 'payload'
import { createLocalReq } from 'payload'

import type { User } from '@/payload-types'

/**
 * `req.user` on the server: the doc plus the auth collection's slug. `sessions` is left out:
 * the generated type allows `null`, Payload's own `User` type (used by `createLocalReq`) doesn't.
 */
export type SessionUser = Omit<User, 'sessions'> & { collection: 'users' }

export type TenantRow = NonNullable<User['tenants']>[number]

/** A user doc as `req.user`. */
export const asSessionUser = ({ sessions: _sessions, ...user }: User): SessionUser => ({
  ...user,
  collection: 'users',
})

/** A seeded user with tenant rows and their profiles populated, as `payload.auth()` gives it. */
export const loadUser = async (payload: Payload, email: string): Promise<SessionUser> => {
  const { docs } = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    depth: 2,
    limit: 1,
  })
  if (!docs[0]) {
    throw new Error(`tests: user ${email} not in the test seed (tests/common/seed/)`)
  }
  return asSessionUser(docs[0])
}

/** A request as Payload builds it for the Local API, optionally with a `payload-tenant` cookie. */
export const reqFor = async (
  payload: Payload,
  user: SessionUser | null,
  options?: { tenantCookie?: number | string },
): Promise<PayloadRequest> => {
  const headers =
    options?.tenantCookie !== undefined
      ? new Headers({ cookie: `payload-tenant=${options.tenantCookie}` })
      : new Headers()
  return createLocalReq({ ...(user ? { user } : {}), req: { headers } }, payload)
}

/** A user that exists only in memory, for checks of the access helpers without the db. */
export const makeUser = (fields: Partial<SessionUser> & { id: number }): SessionUser => ({
  email: `memory-${fields.id}@example.test`,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...fields,
  collection: 'users',
})
