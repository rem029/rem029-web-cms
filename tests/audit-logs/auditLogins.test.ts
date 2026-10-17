// Logins and logouts are logged on users (`auditLogin`, `auditLogout`, `auditFailedLogin`): one row
// each with the user and the ip, never the token or the password, no tenant (super users only).
import { AuthenticationError, createLocalReq, type Payload, type SelectField } from 'payload'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { logoutEndpoint } from '@/collections/Users/endpoints/logout'
import { auditFailedLogin } from '@/collections/Users/hooks/auditFailedLogin'
import { auditLogin } from '@/collections/Users/hooks/auditLogin'
import { auditLogout } from '@/collections/Users/hooks/auditLogout'
import type { AuditLog, User } from '@/payload-types'

import { getTestPayload } from '../common/payload'
import { TEST_USERS } from '../common/seed'
import { uniqueName } from '../common/unique'
import { asSessionUser, loadUser, reqFor, type SessionUser } from '../common/users'
import { isRecord, rowsFor } from './rows'

const TEST_PASSWORD = 'Test-Password-123!'

const HOOK_FNS = {
  auditLogin,
  auditLogout,
  auditFailedLogin,
} as const

const sidOf = (token: string | undefined, stored: User): string => {
  if (token) {
    const parts = token.split('.')
    if (parts[1]) {
      try {
        const parsed: unknown = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
        if (isRecord(parsed) && typeof parsed.sid === 'string') {
          return parsed.sid
        }
      } catch {
        // fallback to stored sessions
      }
    }
  }
  const sessions = stored.sessions ?? []
  return sessions[sessions.length - 1]?.id ?? 'test-sid'
}

// users the file creates (uniqueName emails, a known password, no tenant rows): logging in writes
// sessions to the user row, so seeded users stay untouched
describe('audit log of logins', () => {
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

  const loginRowsSeenBy = async (user: SessionUser, since: string): Promise<number> => {
    try {
      const { docs } = await payload.find({
        collection: 'audit-logs',
        user,
        overrideAccess: false,
        pagination: false,
        depth: 0,
        where: {
          and: [
            { createdAt: { greater_than_equal: since } },
            { operation: { in: ['login', 'login_failed'] } },
          ],
        },
      })
      return docs.length
    } catch (err) {
      if (isRecord(err) && err.status === 403) return 0
      throw err
    }
  }

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  describe('config', () => {
    it.each([
      ['afterLogin', 'auditLogin'],
      ['afterLogout', 'auditLogout'],
      ['afterError', 'auditFailedLogin'],
    ] as const)('users has %s → %s', (hook, fn) => {
      // assert: payload.collections.users.config.hooks[hook] contains the function
      const hooks = payload.collections.users.config.hooks[hook] ?? []
      expect(hooks).toContain(HOOK_FNS[fn])
    })

    it('has a login_failed operation', () => {
      // assert: audit-logs' `operation` select has the option login_failed
      const opField = payload.collections['audit-logs'].config.fields.find(
        (f): f is SelectField => 'name' in f && f.name === 'operation',
      )
      const values = (opField?.options ?? []).map((opt) =>
        typeof opt === 'object' ? opt.value : opt,
      )
      expect(values).toContain('login_failed')
    })
  })

  describe('login', () => {
    // one beforeAll: a user the file creates logs in (payload.login); its rows are read after
    let user: User
    let token: string | undefined
    let rows: AuditLog[]

    beforeAll(async () => {
      user = await createUser('audit-login')
      const res = await payload.login({
        collection: 'users',
        data: { email: user.email, password: TEST_PASSWORD },
      })
      token = res.token
      rows = await rowsFor(payload, 'users', user.id)
    })

    afterEach(() => {
      vi.unstubAllEnvs()
    })

    it('writes one login row for that user', () => {
      // assert: one login row with docId = user id: user = them, collectionSlug users, tenant null
      const logins = rows.filter((r) => r.operation === 'login')
      expect(logins).toHaveLength(1)
      expect(logins[0]?.user).toBe(user.id)
      expect(logins[0]?.collectionSlug).toBe('users')
      expect(logins[0]?.docId).toBe(String(user.id))
      expect(logins[0]?.tenant).toBeNull()
    })

    it('stores neither the token nor the password', () => {
      // assert: the row's JSON has neither the login token nor the password
      const [loginRow] = rows.filter((r) => r.operation === 'login')
      const rowJson = JSON.stringify(loginRow ?? null)
      expect(token).toBeTruthy()
      expect(rowJson).not.toContain(token ?? '')
      expect(rowJson).not.toContain(TEST_PASSWORD)
    })

    it('writes no update row on the user', () => {
      // assert: no update row with docId = user id
      const updates = rows.filter((r) => r.operation === 'update')
      expect(updates).toHaveLength(0)
    })

    it('stores the forwarded ip behind a trusted proxy', async () => {
      // arrange: TRUST_PROXY=true (vi.stubEnv), a req with x-forwarded-for '203.0.113.7, 10.0.0.1'
      vi.stubEnv('TRUST_PROXY', 'true')
      const ipReq = await createLocalReq(
        { req: { headers: new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }) } },
        payload,
      )

      // act: the user logs in with that req
      await payload.login({
        collection: 'users',
        data: { email: user.email, password: TEST_PASSWORD },
        req: ipReq,
      })

      // assert: the newest login row for them has ip 203.0.113.7
      const logins = (await rowsFor(payload, 'users', user.id)).filter(
        (r) => r.operation === 'login',
      )
      expect(logins.at(-1)?.ip).toBe('203.0.113.7')
    })
  })

  describe('logout', () => {
    it('writes one logout row through our endpoint', async () => {
      // arrange: a user the test creates logs in; the session id from the token's `sid`
      const user = await createUser('audit-logout')
      const loginRes = await payload.login({
        collection: 'users',
        data: { email: user.email, password: TEST_PASSWORD },
      })
      const stored = await payload.findByID({
        collection: 'users',
        id: user.id,
        showHiddenFields: true,
      })
      const sid = sidOf(loginRes.token, stored)
      // the session id the logout removes; not part of the User type
      const sessionUser = { ...asSessionUser(user), _sid: sid }

      // act: logoutEndpoint.handler(reqFor({ ...user, _sid }))
      await logoutEndpoint.handler(await reqFor(payload, sessionUser))

      // assert: one logout row for them: user = them, collectionSlug users, tenant null
      const logouts = (await rowsFor(payload, 'users', user.id)).filter(
        (r) => r.operation === 'logout',
      )
      expect(logouts).toHaveLength(1)
      expect(logouts[0]?.user).toBe(user.id)
      expect(logouts[0]?.collectionSlug).toBe('users')
      expect(logouts[0]?.docId).toBe(String(user.id))
      expect(logouts[0]?.tenant).toBeNull()
    })

    it('writes nothing when the logout fails', async () => {
      // arrange: a user the test creates logs in; build its logout req; then delete the user
      const user = await createUser('audit-logout-fail')
      const loginRes = await payload.login({
        collection: 'users',
        data: { email: user.email, password: TEST_PASSWORD },
      })
      const stored = await payload.findByID({
        collection: 'users',
        id: user.id,
        showHiddenFields: true,
      })
      const sid = sidOf(loginRes.token, stored)
      // the session id the logout removes; not part of the User type
      const sessionUser = { ...asSessionUser(user), _sid: sid }
      const req = await reqFor(payload, sessionUser)
      await payload.delete({ collection: 'users', id: user.id })

      // act: logoutEndpoint.handler(req)
      // assert: it rejects; no logout row for that id
      await expect(logoutEndpoint.handler(req)).rejects.toThrow()
      const logouts = (await rowsFor(payload, 'users', user.id)).filter(
        (r) => r.operation === 'logout',
      )
      expect(logouts).toHaveLength(0)
    })
  })

  describe('who reads them', () => {
    // login and login_failed rows have no tenant; one beforeAll makes sure some exist (a login
    // and a failed login of a user the file creates)
    let startedAt: string

    beforeAll(async () => {
      startedAt = new Date().toISOString()
      const user = await createUser('audit-login-readers')
      await payload.login({
        collection: 'users',
        data: { email: user.email, password: TEST_PASSWORD },
      })
      const errorReq = await reqFor(payload, null)
      errorReq.data = { email: user.email, password: 'wrong' }
      await auditFailedLogin({
        collection: payload.collections.users.config,
        context: {},
        error: new AuthenticationError(),
        req: errorReq,
        result: undefined,
      })
    })

    it.each(['tenantAdmin', 'templateEditor', 'logReader'] as const)(
      'shows %s none',
      async (role) => {
        // act: find login / login_failed rows as that user (overrideAccess: false)
        const user = await loadUser(payload, TEST_USERS[role])
        const count = await loginRowsSeenBy(user, startedAt)

        // assert: no rows, or a 403 refusal
        expect(count).toBe(0)
      },
    )

    it('shows the super user', async () => {
      // act: find login / login_failed rows as the super user
      const superUser = await loadUser(payload, TEST_USERS.superUser)
      const count = await loginRowsSeenBy(superUser, startedAt)

      // assert: some rows
      expect(count).toBeGreaterThan(0)
    })
  })
})
