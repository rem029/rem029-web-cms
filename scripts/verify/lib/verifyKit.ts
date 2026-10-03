/**
 * Shared helpers for `scripts/verify/*.ts`. Lives in `lib/` so `pnpm verify` (which runs
 * `scripts/verify/*.ts`) doesn't run it as a script.
 *
 * Typed against `@/payload-types`, no casts: users are real docs or full `User` literals, and
 * requests come from `createLocalReq`, as Payload builds them.
 */
import type { Payload, PayloadRequest, Where } from 'payload'
import { createLocalReq } from 'payload'

import { DEFAULT_TENANT_SLUG } from '@/common/utils/defaultTenant'
import type { User, UsersAccess } from '@/payload-types'

/**
 * `req.user` on the server: the doc plus the auth collection's slug. `sessions` is left out:
 * the generated type allows `null`, Payload's own `User` type (used by `createLocalReq`) doesn't.
 */
export type SessionUser = Omit<User, 'sessions'> & { collection: 'users' }

export type AccessRow = NonNullable<UsersAccess['access']>[number]
export type TenantRow = NonNullable<User['tenants']>[number]

export const createChecker = (payload: Payload) => {
  let failures = 0
  const check = (name: string, ok: boolean): void => {
    if (ok) {
      payload.logger.info(`PASS ${name}`)
      return
    }
    failures++
    payload.logger.error(`FAIL ${name}`)
  }
  const fail = (): void => {
    failures++
  }
  return { check, fail, failures: () => failures }
}

export const statusOf = (err: unknown): number | undefined =>
  err && typeof err === 'object' && 'status' in err && typeof err.status === 'number'
    ? err.status
    : undefined

/** true when the call is refused with one of the given statuses, false when it succeeds. */
export const isRefused = async (
  payload: Payload,
  fn: () => Promise<unknown>,
  statuses = [403],
): Promise<boolean> => {
  try {
    await fn()
    return false
  } catch (err) {
    const status = statusOf(err)
    if (status && statuses.includes(status)) return true
    payload.logger.error({ msg: 'verify: unexpected error', status, err })
    return false
  }
}

export const succeeds = async (payload: Payload, fn: () => Promise<unknown>): Promise<boolean> => {
  try {
    await fn()
    return true
  } catch (err) {
    payload.logger.error({ msg: 'verify: unexpected error', err })
    return false
  }
}

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
  if (!docs[0]) throw new Error(`verify: user ${email} not found, run pnpm seed`)
  return asSessionUser(docs[0])
}

/** A user that exists only in memory, for pure checks of the access helpers. */
export const makeUser = (fields: Partial<SessionUser> & { id: number }): SessionUser => ({
  email: `verify-${fields.id}@example.test`,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...fields,
  collection: 'users',
})

/** An access profile that exists only in memory. Unset columns are false, `hidden` true. */
export const makeRecord = (rows: (Partial<AccessRow> & Pick<AccessRow, 'slug'>)[]): UsersAccess => ({
  id: 99999,
  name: 'verify-record',
  slug: 'verify-record',
  access: rows.map((row) => ({
    hidden: true,
    read: false,
    create: false,
    update: false,
    delete: false,
    admin: false,
    access: false,
    ...row,
  })),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

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

export const idOf = (value: unknown): unknown =>
  value && typeof value === 'object' && 'id' in value ? value.id : value

/** A platform profile (on the `admin` tenant); slugs are unique per tenant since rem0001 phase 5. */
export const platformProfileWhere = (slug: string): Where => ({
  and: [{ slug: { equals: slug } }, { 'tenant.slug': { equals: DEFAULT_TENANT_SLUG } }],
})

/** The id of the default tenant (`admin`), where platform profiles live. */
export const adminTenantIdOf = async (payload: Payload): Promise<number> => {
  const { docs } = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: DEFAULT_TENANT_SLUG } },
    limit: 1,
    depth: 0,
  })
  if (!docs[0]) throw new Error(`verify: tenant ${DEFAULT_TENANT_SLUG} not found, run migrations`)
  return docs[0].id
}
