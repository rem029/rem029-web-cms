// `auditFailedLogin` (users `afterError`): a failed login writes one `login_failed` row with the
// email tried and why, never the password; other errors write nothing.
import { APIError, AuthenticationError, LockedAuth, ValidationError, type Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { auditFailedLogin } from '@/collections/Users/hooks/auditFailedLogin'
import type { User } from '@/payload-types'

import { getTestPayload } from '../common/payload'
import { TEST_USERS } from '../common/seed'
import { uniqueName } from '../common/unique'
import { loadUser, reqFor } from '../common/users'
import { changesOf, rowsWhere } from './rows'

const TEST_PASSWORD = 'Test-Password-123!'

const otherError = (kind: 'APIError' | 'ValidationError'): Error =>
  kind === 'APIError' ? new APIError('Bad request', 400) : new ValidationError({ errors: [] })

// the hook is called as Payload calls it: { collection: users config, context: {}, error, req,
// result: undefined }, req = reqFor(null) with req.data = { email, password }; rows are found by
// docId / email and created since the test started
describe('auditFailedLogin', () => {
  let payload: Payload

  const createUser = (prefix: string): Promise<User> => {
    const name = uniqueName(prefix)
    return payload.create({
      collection: 'users',
      data: {
        email: `${name}@example.test`,
        name,
        password: TEST_PASSWORD,
      },
    })
  }

  const runHook = async (error: Error, data?: Record<string, unknown>): Promise<void> => {
    const req = await reqFor(payload, null)
    if (data !== undefined) {
      req.data = data
    } else {
      delete req.data
    }
    await auditFailedLogin({
      collection: payload.collections.users.config,
      context: {},
      error,
      req,
      result: undefined,
    })
  }

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  it('logs a wrong password with the email, never the password', async () => {
    // arrange: a user the test creates; req.data = { email: theirs in upper case,
    // password: 'wrong-pass-xyz' }
    const user = await createUser('failed-wrong-pw')
    const startedAt = new Date().toISOString()

    // act: the hook with new AuthenticationError()
    await runHook(new AuthenticationError(), {
      email: user.email.toUpperCase(),
      password: 'wrong-pass-xyz',
    })

    // assert: one login_failed row with docId = their id: user null, changes = { email: lower
    // case, reason: 'wrong password' }; the row's JSON has no 'wrong-pass-xyz'
    const rows = await rowsWhere(payload, {
      and: [
        { createdAt: { greater_than_equal: startedAt } },
        { collectionSlug: { equals: 'users' } },
        { docId: { equals: String(user.id) } },
        { operation: { equals: 'login_failed' } },
      ],
    })
    expect(rows).toHaveLength(1)
    expect(rows[0]?.user).toBeNull()
    expect(changesOf(rows[0])).toEqual({
      email: user.email.toLowerCase(),
      reason: 'wrong password',
    })
    expect(JSON.stringify(rows[0])).not.toContain('wrong-pass-xyz')
  })

  it('logs an unknown email as unknown', async () => {
    // arrange: req.data.email = a uniqueName email nobody has
    const unknownEmail = `${uniqueName('failed-unknown')}@example.test`
    const startedAt = new Date().toISOString()

    // act: the hook with new AuthenticationError()
    await runHook(new AuthenticationError(), {
      email: unknownEmail,
      password: 'any-password',
    })

    // assert: a login_failed row with docId 'unknown' and that email: user null, reason
    // 'unknown email'
    const rows = await rowsWhere(payload, {
      and: [
        { createdAt: { greater_than_equal: startedAt } },
        { collectionSlug: { equals: 'users' } },
        { docId: { equals: 'unknown' } },
        { operation: { equals: 'login_failed' } },
      ],
    })
    const row = rows.find((r) => changesOf(r).email === unknownEmail)
    expect(row).toBeDefined()
    expect(row?.user).toBeNull()
    expect(changesOf(row).reason).toBe('unknown email')
  })

  it('logs a disabled user as disabled', async () => {
    // arrange: req.data.email = TEST_USERS.disabled
    const disabled = await loadUser(payload, TEST_USERS.disabled)
    const startedAt = new Date().toISOString()

    // act: the hook with new AuthenticationError()
    await runHook(new AuthenticationError(), {
      email: TEST_USERS.disabled,
      password: 'any-password',
    })

    // assert: a login_failed row for that user with that email: user null, reason 'disabled'
    const rows = await rowsWhere(payload, {
      and: [
        { createdAt: { greater_than_equal: startedAt } },
        { collectionSlug: { equals: 'users' } },
        { docId: { equals: String(disabled.id) } },
        { operation: { equals: 'login_failed' } },
      ],
    })
    const row = rows.find((r) => changesOf(r).email === TEST_USERS.disabled.toLowerCase())
    expect(row).toBeDefined()
    expect(row?.user).toBeNull()
    expect(changesOf(row).reason).toBe('disabled')
  })

  it('logs a locked account as locked', async () => {
    // arrange: a user the test creates
    const user = await createUser('failed-locked')
    const startedAt = new Date().toISOString()

    // act: the hook with new LockedAuth()
    await runHook(new LockedAuth(), {
      email: user.email,
      password: 'any-password',
    })

    // assert: a login_failed row for them: user null, email lower case, reason 'locked'
    const rows = await rowsWhere(payload, {
      and: [
        { createdAt: { greater_than_equal: startedAt } },
        { collectionSlug: { equals: 'users' } },
        { docId: { equals: String(user.id) } },
        { operation: { equals: 'login_failed' } },
      ],
    })
    const row = rows.find((r) => changesOf(r).reason === 'locked')
    expect(row).toBeDefined()
    expect(row?.user).toBeNull()
    expect(changesOf(row).email).toBe(user.email.toLowerCase())
  })

  it.each(['APIError', 'ValidationError'] as const)('ignores a %s', async (errorKind) => {
    // arrange: req.data.email = a uniqueName email
    const email = `${uniqueName(`failed-${errorKind.toLowerCase()}`)}@example.test`
    const startedAt = new Date().toISOString()

    // act: the hook with new APIError('Bad request', 400) / new ValidationError({ errors: [] })
    await runHook(otherError(errorKind), { email, password: 'password' })

    // assert: no login_failed row with that email
    const rows = await rowsWhere(payload, {
      and: [
        { createdAt: { greater_than_equal: startedAt } },
        { collectionSlug: { equals: 'users' } },
        { operation: { equals: 'login_failed' } },
      ],
    })
    expect(rows.some((r) => changesOf(r).email === email)).toBe(false)
  })

  it('logs a login without data with no email', async () => {
    // arrange: req with no data; note the time
    const startedAt = new Date().toISOString()

    // act: the hook with new AuthenticationError()
    await runHook(new AuthenticationError())

    // assert: a login_failed row since then with docId 'unknown', email null, user null,
    // reason 'unknown email'
    const rows = await rowsWhere(payload, {
      and: [
        { createdAt: { greater_than_equal: startedAt } },
        { collectionSlug: { equals: 'users' } },
        { docId: { equals: 'unknown' } },
        { operation: { equals: 'login_failed' } },
      ],
    })
    const row = rows.find((r) => changesOf(r).email === null)
    expect(row).toBeDefined()
    expect(row?.user).toBeNull()
    expect(changesOf(row).reason).toBe('unknown email')
  })
})
