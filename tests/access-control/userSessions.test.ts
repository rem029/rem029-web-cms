// The Users logout endpoint: Payload 3.44's own logout rewrites the user row without a
// transaction, so parallel logouts wiped the user's tenant rows. Ours replaces it and keeps them
// (drop with the Payload upgrade, rem0013).
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { logoutEndpoint } from '@/collections/Users/endpoints/logout'
import type { User } from '@/payload-types'

import { getTestPayload } from '../common/payload'
import { TEST_TENANTS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { loadUser, reqFor } from '../common/users'

describe('logout', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  it('uses our endpoint as the first POST /logout on users', () => {
    // act
    const endpoints = payload.collections.users.config.endpoints || []
    const logouts = endpoints.filter((e) => e.path === '/logout' && e.method === 'post')

    // assert
    expect(logouts[0]).toBe(logoutEndpoint)
  })

  describe('three logouts at once', () => {
    let responses: Response[]
    let after: User | null

    beforeAll(async () => {
      const tenantA = await findTenant(payload, TEST_TENANTS.a)
      const tenantB = await findTenant(payload, TEST_TENANTS.b)
      const email = `${uniqueName('user-sessions')}@example.test`
      const created = await payload.create({
        collection: 'users',
        data: {
          email,
          name: 'Logout test',
          password: email,
          tenants: [{ tenant: tenantA.id }, { tenant: tenantB.id }],
        },
      })
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
      const sessionIds = ['session-1', 'session-2', 'session-3']
      await payload.db.updateOne({
        collection: 'users',
        id: created.id,
        data: {
          ...(await payload.db.findOne({
            collection: 'users',
            where: { id: { equals: created.id } },
          })),
          sessions: sessionIds.map((id) => ({
            id,
            createdAt: new Date().toISOString(),
            expiresAt,
          })),
        },
        returning: false,
      })

      const user = await loadUser(payload, email)
      // precondition: both rows are there before the logouts
      expect(user.tenants).toHaveLength(2)

      // three logouts at once, each from its own session, as two tabs or a double click send them
      responses = await Promise.all(
        sessionIds.map(async (sid) => {
          // the session id the logout removes; not part of the User type
          const sessionUser = { ...user, _sid: sid }
          return logoutEndpoint.handler(await reqFor(payload, sessionUser))
        }),
      )
      after = await payload.db.findOne<User>({
        collection: 'users',
        where: { id: { equals: created.id } },
      })
    })

    it('lets each one succeed', () => {
      // assert
      expect(responses.map((response) => response.status)).toEqual([200, 200, 200])
    })

    it('keeps the tenant rows', () => {
      // assert
      expect(after?.tenants).toHaveLength(2)
    })

    it('removes every logged-out session', () => {
      // assert
      expect(after?.sessions).toHaveLength(0)
    })
  })
})
