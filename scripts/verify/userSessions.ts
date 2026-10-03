/**
 * Checks the Users logout endpoint (`src/collections/Users/endpoints/logout.ts`): Payload 3.44's
 * own logout rewrites the user row without a transaction, so parallel logouts wiped the user's
 * `tenants` rows. Ours replaces it and must keep them.
 *
 *   pnpm payload run scripts/verify/userSessions.ts
 *   or: pnpm verify
 *
 * Creates and deletes its own user (`verify-us-…`). Refuses to run in production.
 */
import config from '@payload-config'
import { getPayload } from 'payload'

import { logoutEndpoint } from '@/collections/Users/endpoints/logout'
import type { User } from '@/payload-types'
import { createChecker, loadUser, reqFor } from './lib/verifyKit'

if (process.env.NODE_ENV === 'production') {
  console.error('verify: refusing to run with NODE_ENV=production')
  process.exit(1)
}

const payload = await getPayload({ config })
const { check, failures } = createChecker(payload)

const EMAIL = 'verify-us-user@example.test'

const cleanup = async (): Promise<void> => {
  await payload.delete({ collection: 'users', where: { email: { equals: EMAIL } } })
}

const tenantIdOf = async (slug: string): Promise<number> => {
  const { docs } = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
  })
  if (!docs[0]) throw new Error(`verify: tenant ${slug} not found, run pnpm seed`)
  return docs[0].id
}

try {
  await cleanup()

  const endpoints = payload.collections.users.config.endpoints || []
  const logouts = endpoints.filter((e) => e.path === '/logout' && e.method === 'post')
  check('logout: our endpoint is the first POST /logout on users', logouts[0] === logoutEndpoint)

  const t1 = await tenantIdOf('tenant1')
  const t2 = await tenantIdOf('tenant2')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
  const sessionIds = ['verify-us-1', 'verify-us-2', 'verify-us-3']
  const created = await payload.create({
    collection: 'users',
    data: {
      email: EMAIL,
      name: 'Verify sessions',
      password: EMAIL,
      tenants: [{ tenant: t1 }, { tenant: t2 }],
    },
  })
  // sessions as login would store them (a login adds one per sign-in)
  await payload.db.updateOne({
    collection: 'users',
    id: created.id,
    data: {
      ...(await payload.db.findOne({ collection: 'users', where: { id: { equals: created.id } } })),
      sessions: sessionIds.map((id) => ({ id, createdAt: new Date().toISOString(), expiresAt })),
    },
    returning: false,
  })

  const user = await loadUser(payload, EMAIL)
  check('setup: user has 2 tenant rows and 3 sessions', (user.tenants?.length ?? 0) === 2)

  // three logouts at once, each from its own session, as two tabs or a double click would send
  const results = await Promise.allSettled(
    sessionIds.map(async (sid) => {
      const sessionUser = { ...user, _sid: sid }
      return logoutEndpoint.handler(await reqFor(payload, sessionUser))
    }),
  )
  check(
    'logout: three parallel logouts all succeed',
    results.every((r) => r.status === 'fulfilled' && r.value.status === 200),
  )

  const after = await payload.db.findOne<User>({
    collection: 'users',
    where: { id: { equals: created.id } },
  })
  check('logout: tenant rows survive parallel logouts', after?.tenants?.length === 2)
  check('logout: every logged-out session is removed', after?.sessions?.length === 0)
} catch (err) {
  check('no crash', false)
  payload.logger.error({ msg: 'verify: userSessions crashed', err })
} finally {
  await cleanup()
}

if (failures() > 0) {
  payload.logger.error(`verify: userSessions ${failures()} check(s) failed`)
  process.exit(1)
}
payload.logger.info('verify: userSessions all checks passed')
process.exit(0)
