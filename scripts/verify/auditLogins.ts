/**
 * Checks login, logout, and failed login audit logging (rem0002 step 3):
 * - config: users hooks include auditLogin, auditLogout, auditFailedLogin; audit-logs operation has login_failed
 * - login: Local API login writes exactly one login audit row with correct metadata, omitting tokens and passwords
 * - login leaves no update audit row on that user
 * - logout: logoutEndpoint.handler writes exactly one logout audit row
 * - failed logout: handler throws for deleted user and leaves no logout row
 * - clientIp: extracts first x-forwarded-for IP when TRUST_PROXY=true, null otherwise
 * - ip stored: login with TRUST_PROXY=true logs the client IP
 * - failed login: wrong password writes login_failed row with 'wrong password' reason without password
 * - failed login: unknown email writes login_failed row with 'unknown email' reason and unknown docId
 * - failed login: disabled user writes 'disabled' reason, LockedAuth writes 'locked' reason
 * - other errors: APIError and ValidationError write no audit row
 * - failed login: missing req.data writes row with null email and unknown docId without throwing
 * - readers: tenant admins and members cannot read login/login_failed rows; super users can
 *
 *   pnpm payload run scripts/verify/auditLogins.ts
 *
 * Refuses to run in production. Cleans up test business, users, and created logs at start and end.
 */
import { randomUUID } from 'crypto'

import config from '@payload-config'
import {
  APIError,
  AuthenticationError,
  createLocalReq,
  getPayload,
  LockedAuth,
  ValidationError,
  type SelectField,
  type Where,
} from 'payload'

import { logoutEndpoint } from '@/collections/Users/endpoints/logout'
import { auditFailedLogin } from '@/collections/Users/hooks/auditFailedLogin'
import { auditLogin } from '@/collections/Users/hooks/auditLogin'
import { auditLogout } from '@/collections/Users/hooks/auditLogout'
import { clientIp } from '@/common/utils/auditLog'
import type { AuditLog, Tenant } from '@/payload-types'
import {
  asSessionUser,
  createChecker,
  idOf,
  loadUser,
  platformProfileWhere,
  reqFor,
  statusOf,
  type SessionUser,
} from './lib/verifyKit'

if (process.env.NODE_ENV === 'production') {
  console.error('verify: refusing to run with NODE_ENV=production')
  process.exit(1)
}

const payload = await getPayload({ config })
const { check, failures } = createChecker(payload)

const PREFIX = 'verify-logins'
const VERIFY_EMAIL = `${PREFIX}-user@example.test`
const DISABLED_EMAIL = `${PREFIX}-disabled@example.test`
const ADMIN_EMAIL = `${PREFIX}-admin@example.test`
const MEMBER_EMAIL = `${PREFIX}-member@example.test`
const EPHEMERAL_EMAIL = `${PREFIX}-ephemeral@example.test`
const READER_EMAIL = `${PREFIX}-reader@example.test`
const TEST_EMAILS = [
  VERIFY_EMAIL,
  DISABLED_EMAIL,
  ADMIN_EMAIL,
  MEMBER_EMAIL,
  EPHEMERAL_EMAIL,
  READER_EMAIL,
]
const TEST_TENANTS = [PREFIX]
const TEST_PASSWORD = 'Test-Password-123!'
const context = { disableRevalidate: true }

const startedAt = new Date().toISOString()
const originalTrustProxy = process.env.TRUST_PROXY

const isRecord = (val: unknown): val is Record<string, unknown> =>
  typeof val === 'object' && val !== null && !Array.isArray(val)

const changesOf = (row: AuditLog | undefined): Record<string, unknown> =>
  isRecord(row?.changes) ? row.changes : {}

const safeCheck = async (name: string, fn: () => Promise<boolean> | boolean): Promise<void> => {
  try {
    const ok = await fn()
    check(name, ok)
  } catch (err) {
    payload.logger.error({ msg: `verify check threw: ${name}`, err })
    check(name, false)
  }
}

const findTenant = async (slug: string): Promise<Tenant | null> => {
  const { docs } = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
  })
  return docs[0] ?? null
}

const deleteBusiness = async (tenantId: number): Promise<void> => {
  const byTenant: Where = { tenant: { equals: tenantId } }
  for (const slug of [
    'form-submissions',
    'forms',
    'posts',
    'search',
    'pages',
    'categories',
    'analytics',
    'header',
    'footer',
    'theme',
    'settings',
    'users-access',
  ] as const) {
    await payload.delete({ collection: slug, where: byTenant, context })
  }
  await payload.delete({ collection: 'tenants', id: tenantId, context })
}

const cleanup = async (): Promise<void> => {
  if (originalTrustProxy !== undefined) {
    process.env.TRUST_PROXY = originalTrustProxy
  } else {
    delete process.env.TRUST_PROXY
  }

  try {
    await payload.delete({
      collection: 'users',
      where: { email: { in: TEST_EMAILS } },
    })
  } catch {
    // ignore
  }

  for (const slug of TEST_TENANTS) {
    try {
      const tenant = await findTenant(slug)
      if (tenant) await deleteBusiness(tenant.id)
    } catch {
      // ignore
    }
  }

  try {
    await payload.delete({
      collection: 'audit-logs',
      where: { createdAt: { greater_than_equal: startedAt } },
    })
  } catch {
    // ignore
  }
}

const makeMember = async (
  email: string,
  row: { tenant: number; isTenantAdmin?: boolean; access?: number },
): Promise<SessionUser> => {
  await payload.create({
    collection: 'users',
    data: { email, name: email.split('@')[0], password: randomUUID(), tenants: [row] },
  })
  return loadUser(payload, email)
}

const findLogs = async (whereAnd: Where[]): Promise<AuditLog[]> => {
  const { docs } = await payload.find({
    collection: 'audit-logs',
    overrideAccess: true,
    where: {
      and: [{ createdAt: { greater_than_equal: startedAt } }, ...whereAnd],
    },
  })
  return docs
}

try {
  await cleanup()

  const superUser = await loadUser(payload, process.env.SEED_ADMIN_EMAIL || 'default@payload.com')
  const asSuper = { user: superUser, overrideAccess: false, context }

  const makeTenant = (slug: string) =>
    payload.create({
      collection: 'tenants',
      data: { name: slug, slug },
      ...asSuper,
      context: { ...context, skipHomePage: true },
    })

  const tenantA = await makeTenant(PREFIX)
  const { docs: templates } = await payload.find({
    collection: 'users-access',
    where: platformProfileWhere('pages-editor'),
    limit: 1,
    depth: 0,
  })
  if (!templates[0]) throw new Error('verify: pages-editor template not found, run migrations')

  const tenantAdmin = await makeMember(ADMIN_EMAIL, {
    tenant: tenantA.id,
    isTenantAdmin: true,
  })
  const member = await makeMember(MEMBER_EMAIL, {
    tenant: tenantA.id,
    access: templates[0].id,
  })
  // a member whose profile allows reading audit logs still only sees their tenant's rows
  const readerProfile = await payload.create({
    collection: 'users-access',
    data: {
      name: `${PREFIX} log reader`,
      slug: `${PREFIX}-log-reader`,
      tenant: tenantA.id,
      access: [{ slug: 'audit-logs', hidden: false, read: true, admin: true }],
    },
    ...asSuper,
  })
  const reader = await makeMember(READER_EMAIL, { tenant: tenantA.id, access: readerProfile.id })
  const verifyUser = await payload.create({
    collection: 'users',
    data: {
      email: VERIFY_EMAIL,
      name: 'verify-logins-user',
      password: TEST_PASSWORD,
    },
  })
  const disabledUser = await payload.create({
    collection: 'users',
    data: {
      email: DISABLED_EMAIL,
      name: 'verify-logins-disabled',
      password: TEST_PASSWORD,
      is_disabled: true,
    },
  })

  // 1. config
  await safeCheck('1. config: users collection has auditLogin afterLogin hook', () => {
    const usersConfig = payload.collections.users.config
    return Boolean(usersConfig.hooks?.afterLogin?.includes(auditLogin))
  })

  await safeCheck('1. config: users collection has auditLogout afterLogout hook', () => {
    const usersConfig = payload.collections.users.config
    return Boolean(usersConfig.hooks?.afterLogout?.includes(auditLogout))
  })

  await safeCheck('1. config: users collection has auditFailedLogin afterError hook', () => {
    const usersConfig = payload.collections.users.config
    return Boolean(usersConfig.hooks?.afterError?.includes(auditFailedLogin))
  })

  await safeCheck(
    '1. config: audit-logs collection operation field has login_failed option',
    () => {
      const auditLogsConfig = payload.collections['audit-logs'].config
      const opField = auditLogsConfig.fields.find(
        (f): f is SelectField => 'name' in f && f.name === 'operation',
      )
      return Boolean(
        opField &&
          Array.isArray(opField.options) &&
          opField.options.some((opt) =>
            typeof opt === 'object' ? opt.value === 'login_failed' : opt === 'login_failed',
          ),
      )
    },
  )

  // 2. login
  const loginResult = await payload.login({
    collection: 'users',
    data: { email: VERIFY_EMAIL, password: TEST_PASSWORD },
  })

  let loginRow: AuditLog | undefined

  await safeCheck('2. login: Local API login writes exactly one login audit row', async () => {
    const docs = await findLogs([
      { collectionSlug: { equals: 'users' } },
      { docId: { equals: String(verifyUser.id) } },
      { operation: { equals: 'login' } },
    ])
    if (docs.length !== 1 || !docs[0]) return false
    const row = docs[0]
    loginRow = row
    return (
      idOf(row.user) === verifyUser.id &&
      row.docId === String(verifyUser.id) &&
      row.collectionSlug === 'users' &&
      row.tenant === null
    )
  })

  await safeCheck('2. login: login audit row contains neither token nor password', () => {
    if (!loginRow) return false
    const rowJson = JSON.stringify(loginRow)
    const tokenClean = Boolean(loginResult.token && !rowJson.includes(loginResult.token))
    const passwordClean = !rowJson.includes(TEST_PASSWORD)
    return tokenClean && passwordClean
  })

  // 3. login leaves no update audit row on that user
  await safeCheck('3. login: leaves no update audit row on that user', async () => {
    const docs = await findLogs([
      { collectionSlug: { equals: 'users' } },
      { docId: { equals: String(verifyUser.id) } },
      { operation: { equals: 'update' } },
    ])
    return docs.length === 0
  })

  // 4. logout
  const storedVerifyUser = await payload.findByID({
    collection: 'users',
    id: verifyUser.id,
    showHiddenFields: true,
  })
  const sessions = storedVerifyUser.sessions ?? []
  let sidFromToken: string | undefined
  if (loginResult.token) {
    const parts = loginResult.token.split('.')
    if (parts[1]) {
      try {
        const tokenPayload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as {
          sid?: string
        }
        sidFromToken = tokenPayload.sid
      } catch {
        // fallback to stored sessions
      }
    }
  }
  const sid = sidFromToken ?? sessions[sessions.length - 1]?.id ?? 'verify-sid'

  // Payload attaches `_sid` to `req.user` at auth time, which SessionUser omits
  const userWithSid = { ...asSessionUser(verifyUser), _sid: sid } as unknown as SessionUser
  const logoutReq = await reqFor(payload, userWithSid)
  await logoutEndpoint.handler(logoutReq)

  await safeCheck(
    '4. logout: logoutEndpoint.handler writes exactly one logout audit row',
    async () => {
      const docs = await findLogs([
        { collectionSlug: { equals: 'users' } },
        { docId: { equals: String(verifyUser.id) } },
        { operation: { equals: 'logout' } },
      ])
      if (docs.length !== 1 || !docs[0]) return false
      const row = docs[0]
      return (
        idOf(row.user) === verifyUser.id &&
        row.docId === String(verifyUser.id) &&
        row.collectionSlug === 'users' &&
        row.tenant === null
      )
    },
  )

  // 5. failed logout
  await safeCheck(
    '5. failed logout: handler for deleted user throws and leaves no logout audit row',
    async () => {
      const ephemeralUser = await payload.create({
        collection: 'users',
        data: {
          email: EPHEMERAL_EMAIL,
          name: 'ephemeral',
          password: TEST_PASSWORD,
        },
      })
      await payload.login({
        collection: 'users',
        data: { email: ephemeralUser.email, password: TEST_PASSWORD },
      })
      const ephDoc = await payload.findByID({
        collection: 'users',
        id: ephemeralUser.id,
        showHiddenFields: true,
      })
      const ephSid = ephDoc.sessions?.[ephDoc.sessions.length - 1]?.id ?? 'eph-sid'
      // Payload attaches `_sid` to `req.user` at auth time, which SessionUser omits
      const ephUserWithSid = {
        ...asSessionUser(ephemeralUser),
        _sid: ephSid,
      } as unknown as SessionUser
      const ephReq = await reqFor(payload, ephUserWithSid)

      await payload.delete({ collection: 'users', id: ephemeralUser.id })

      let threw = false
      try {
        await logoutEndpoint.handler(ephReq)
      } catch {
        threw = true
      }

      const docs = await findLogs([
        { collectionSlug: { equals: 'users' } },
        { docId: { equals: String(ephemeralUser.id) } },
        { operation: { equals: 'logout' } },
      ])

      return threw && docs.length === 0
    },
  )

  // 6. ip helper clientIp
  await safeCheck(
    '6. ip: clientIp with TRUST_PROXY=true returns first forwarded-for IP',
    async () => {
      process.env.TRUST_PROXY = 'true'
      const req = await createLocalReq(
        { req: { headers: new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }) } },
        payload,
      )
      return clientIp(req) === '203.0.113.7'
    },
  )

  await safeCheck('6. ip: clientIp with TRUST_PROXY unset returns null', async () => {
    delete process.env.TRUST_PROXY
    const req = await createLocalReq(
      { req: { headers: new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }) } },
      payload,
    )
    return clientIp(req) === null
  })

  await safeCheck('6. ip: clientIp with TRUST_PROXY=true and no header returns null', async () => {
    process.env.TRUST_PROXY = 'true'
    const req = await createLocalReq({ req: { headers: new Headers() } }, payload)
    return clientIp(req) === null
  })

  // 7. ip stored in login row
  await safeCheck('7. ip stored: login with TRUST_PROXY=true stores IP in audit row', async () => {
    process.env.TRUST_PROXY = 'true'
    const ipReq = await createLocalReq(
      { req: { headers: new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }) } },
      payload,
    )
    await payload.login({
      collection: 'users',
      data: { email: VERIFY_EMAIL, password: TEST_PASSWORD },
      req: ipReq,
    })
    const docs = await payload.find({
      collection: 'audit-logs',
      overrideAccess: true,
      where: {
        and: [
          { createdAt: { greater_than_equal: startedAt } },
          { collectionSlug: { equals: 'users' } },
          { docId: { equals: String(verifyUser.id) } },
          { operation: { equals: 'login' } },
        ],
      },
      sort: '-createdAt',
      limit: 1,
    })
    return Boolean(docs.docs[0] && docs.docs[0].ip === '203.0.113.7')
  })

  // 8. failed login, wrong password
  await safeCheck(
    '8. failed login: wrong password writes login_failed row with reason and without password',
    async () => {
      const errorReq = await reqFor(payload, null)
      errorReq.data = {
        email: VERIFY_EMAIL.toUpperCase(),
        password: 'wrong-pass-xyz',
      }
      await auditFailedLogin({
        collection: payload.collections.users.config,
        context: {},
        error: new AuthenticationError(),
        req: errorReq,
        result: undefined,
      })

      const docs = await findLogs([
        { collectionSlug: { equals: 'users' } },
        { docId: { equals: String(verifyUser.id) } },
        { operation: { equals: 'login_failed' } },
      ])
      if (docs.length !== 1 || !docs[0]) return false
      const row = docs[0]
      const changes = changesOf(row)
      const rowJson = JSON.stringify(row)

      return (
        row.user === null &&
        changes.email === VERIFY_EMAIL.toLowerCase() &&
        changes.reason === 'wrong password' &&
        !rowJson.includes('wrong-pass-xyz')
      )
    },
  )

  // 9. failed login, unknown email
  await safeCheck(
    '9. failed login: unknown email writes login_failed row with unknown docId and reason',
    async () => {
      const unknownEmail = 'unknown-ghost-user@example.test'
      const errorReq = await reqFor(payload, null)
      errorReq.data = {
        email: unknownEmail,
        password: 'any-password',
      }
      await auditFailedLogin({
        collection: payload.collections.users.config,
        context: {},
        error: new AuthenticationError(),
        req: errorReq,
        result: undefined,
      })

      const docs = await findLogs([
        { collectionSlug: { equals: 'users' } },
        { docId: { equals: 'unknown' } },
        { operation: { equals: 'login_failed' } },
      ])
      const row = docs.find((d) => changesOf(d).email === unknownEmail)
      if (!row) return false
      const changes = changesOf(row)
      return row.user === null && changes.reason === 'unknown email'
    },
  )

  // 10. failed login: disabled user
  await safeCheck(
    '10. failed login: disabled user writes login_failed row with disabled reason',
    async () => {
      const errorReq = await reqFor(payload, null)
      errorReq.data = {
        email: DISABLED_EMAIL,
        password: 'any-password',
      }
      await auditFailedLogin({
        collection: payload.collections.users.config,
        context: {},
        error: new AuthenticationError(),
        req: errorReq,
        result: undefined,
      })

      const docs = await findLogs([
        { collectionSlug: { equals: 'users' } },
        { docId: { equals: String(disabledUser.id) } },
        { operation: { equals: 'login_failed' } },
      ])
      const row = docs.find((d) => changesOf(d).email === DISABLED_EMAIL.toLowerCase())
      if (!row) return false
      const changes = changesOf(row)
      return row.user === null && changes.reason === 'disabled'
    },
  )

  // 10. failed login: LockedAuth
  await safeCheck(
    '10. failed login: LockedAuth writes login_failed row with locked reason',
    async () => {
      const errorReq = await reqFor(payload, null)
      errorReq.data = {
        email: VERIFY_EMAIL,
        password: 'any-password',
      }
      await auditFailedLogin({
        collection: payload.collections.users.config,
        context: {},
        error: new LockedAuth(),
        req: errorReq,
        result: undefined,
      })

      const docs = await findLogs([
        { collectionSlug: { equals: 'users' } },
        { docId: { equals: String(verifyUser.id) } },
        { operation: { equals: 'login_failed' } },
      ])
      const row = docs.find((d) => changesOf(d).reason === 'locked')
      if (!row) return false
      const changes = changesOf(row)
      return row.user === null && changes.email === VERIFY_EMAIL.toLowerCase()
    },
  )

  // 11. other errors
  await safeCheck('11. other errors: APIError writes no audit row', async () => {
    const errorReq = await reqFor(payload, null)
    errorReq.data = {
      email: `${PREFIX}-apierror@example.test`,
      password: 'password',
    }
    await auditFailedLogin({
      collection: payload.collections.users.config,
      context: {},
      error: new APIError('Bad request', 400),
      req: errorReq,
      result: undefined,
    })

    const docs = await findLogs([
      { collectionSlug: { equals: 'users' } },
      { operation: { equals: 'login_failed' } },
    ])
    return !docs.some((d) => changesOf(d).email === `${PREFIX}-apierror@example.test`)
  })

  await safeCheck('11. other errors: ValidationError writes no audit row', async () => {
    const errorReq = await reqFor(payload, null)
    errorReq.data = {
      email: `${PREFIX}-validation@example.test`,
      password: 'password',
    }
    await auditFailedLogin({
      collection: payload.collections.users.config,
      context: {},
      error: new ValidationError({ errors: [] }),
      req: errorReq,
      result: undefined,
    })

    const docs = await findLogs([
      { collectionSlug: { equals: 'users' } },
      { operation: { equals: 'login_failed' } },
    ])
    return !docs.some((d) => changesOf(d).email === `${PREFIX}-validation@example.test`)
  })

  // 12. failed login with no req.data
  await safeCheck(
    '12. failed login: no req.data writes login_failed row with null email and unknown docId',
    async () => {
      const errorReq = await reqFor(payload, null)
      delete errorReq.data

      await auditFailedLogin({
        collection: payload.collections.users.config,
        context: {},
        error: new AuthenticationError(),
        req: errorReq,
        result: undefined,
      })

      const docs = await findLogs([
        { collectionSlug: { equals: 'users' } },
        { docId: { equals: 'unknown' } },
        { operation: { equals: 'login_failed' } },
      ])
      const row = docs.find((d) => changesOf(d).email === null)
      if (!row) return false
      const changes = changesOf(row)
      return row.user === null && changes.reason === 'unknown email'
    },
  )

  // 13. readers: login rows have no tenant, so only super users see them
  const seesNoLoginRows = async (user: SessionUser): Promise<boolean> => {
    try {
      const { docs } = await payload.find({
        collection: 'audit-logs',
        user,
        overrideAccess: false,
        where: {
          and: [
            { createdAt: { greater_than_equal: startedAt } },
            { operation: { in: ['login', 'login_failed'] } },
          ],
        },
      })
      return docs.length === 0
    } catch (err) {
      return statusOf(err) === 403
    }
  }
  await safeCheck('13. readers: tenant admin cannot read login or login_failed rows', async () => {
    return seesNoLoginRows(tenantAdmin)
  })

  await safeCheck('13. readers: member cannot read login or login_failed rows', async () => {
    return seesNoLoginRows(member)
  })

  await safeCheck(
    '13. readers: a member whose profile allows audit-logs read sees no login or login_failed rows',
    () => seesNoLoginRows(reader),
  )

  await safeCheck('13. readers: super user can read login and login_failed rows', async () => {
    const { docs } = await payload.find({
      collection: 'audit-logs',
      user: superUser,
      overrideAccess: false,
      where: {
        and: [
          { createdAt: { greater_than_equal: startedAt } },
          { operation: { in: ['login', 'login_failed'] } },
        ],
      },
    })
    return docs.length > 0
  })
} catch (err) {
  payload.logger.error({ msg: 'verify: auditLogins crashed', err })
  check('verify ran to the end', false)
} finally {
  await cleanup()
}

if (failures() > 0) {
  payload.logger.error(`verify: auditLogins ${failures()} check(s) failed`)
  process.exit(1)
}
payload.logger.info('verify: auditLogins all checks passed')
process.exit(0)
