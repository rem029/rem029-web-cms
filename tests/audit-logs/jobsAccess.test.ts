// Who runs jobs (`canRunJobs`, `/api/payload-jobs/run`) and touches `payload-jobs`: Payload leaves
// both open to every signed-in user, so only super users, or the cron with `CRON_SECRET` when set.
import type { Payload } from 'payload'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { canRunJobs } from '@/common/utils/jobsAccess'

import { getTestPayload } from '../common/payload'
import { TEST_USERS } from '../common/seed'
import { loadUser, reqFor, type SessionUser } from '../common/users'

describe('jobs access', () => {
  let payload: Payload
  let superUser: SessionUser

  const runAllowed = async (user: SessionUser | null, authorization?: string): Promise<boolean> => {
    const req = await reqFor(payload, user)
    if (authorization) req.headers.set('authorization', authorization)
    return canRunJobs({ req })
  }

  beforeAll(async () => {
    payload = await getTestPayload()
    superUser = await loadUser(payload, TEST_USERS.superUser)
  })

  describe('canRunJobs', () => {
    // canRunJobs({ req }) with req = reqFor(user), plus an authorization header where given;
    // CRON_SECRET set per test with vi.stubEnv (vi.unstubAllEnvs after each)
    afterEach(() => {
      vi.unstubAllEnvs()
    })

    it('lets the super user run jobs', async () => {
      // assert: true for the super user
      expect(await runAllowed(superUser)).toBe(true)
    })

    it.each(['tenantAdmin', 'templateEditor'] as const)('refuses %s', async (role) => {
      // assert: false for that user
      const user = await loadUser(payload, TEST_USERS[role])
      expect(await runAllowed(user)).toBe(false)
    })

    it('refuses "Bearer undefined" with no CRON_SECRET', async () => {
      // arrange: CRON_SECRET unset
      vi.stubEnv('CRON_SECRET', '')

      // assert: false for no user with `Bearer undefined`
      expect(await runAllowed(null, 'Bearer undefined')).toBe(false)
    })

    it('accepts the right bearer secret', async () => {
      // arrange: CRON_SECRET = 'test-cron-secret'
      vi.stubEnv('CRON_SECRET', 'test-cron-secret')

      // assert: true for no user with `Bearer test-cron-secret`
      expect(await runAllowed(null, 'Bearer test-cron-secret')).toBe(true)
    })

    it('refuses a wrong bearer secret', async () => {
      // arrange: CRON_SECRET = 'test-cron-secret'
      vi.stubEnv('CRON_SECRET', 'test-cron-secret')

      // assert: false for no user with `Bearer nope`
      expect(await runAllowed(null, 'Bearer nope')).toBe(false)
    })
  })

  describe('payload-jobs', () => {
    it.each(['tenantAdmin', 'templateEditor'] as const)('refuses %s reading jobs', async (role) => {
      // act + assert: find payload-jobs as that user (overrideAccess: false) rejects with 403
      const user = await loadUser(payload, TEST_USERS[role])
      await expect(
        payload.find({
          collection: 'payload-jobs',
          user,
          overrideAccess: false,
        }),
      ).rejects.toMatchObject({ status: 403 })
    })

    it.each(['tenantAdmin', 'templateEditor'] as const)(
      'refuses %s queueing a job',
      async (role) => {
        // act + assert: create a pruneAuditLogs job in maintenance as that user rejects with 403
        const user = await loadUser(payload, TEST_USERS[role])
        await expect(
          payload.create({
            collection: 'payload-jobs',
            data: { taskSlug: 'pruneAuditLogs', queue: 'maintenance', input: {} },
            user,
            overrideAccess: false,
          }),
        ).rejects.toMatchObject({ status: 403 })
      },
    )

    it('lets the super user read jobs', async () => {
      // act + assert: find payload-jobs as the super user resolves
      const { docs } = await payload.find({
        collection: 'payload-jobs',
        user: superUser,
        overrideAccess: false,
      })
      expect(Array.isArray(docs)).toBe(true)
    })
  })
})
