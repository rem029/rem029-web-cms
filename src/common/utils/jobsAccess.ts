import type { Access, PayloadRequest } from 'payload'

import { isActiveSuperUser } from '@/common/utils/access'

/**
 * Who may run queued jobs through the api (`/api/payload-jobs/run`): active super users, or a
 * scheduler sending `Authorization: Bearer <CRON_SECRET>`, only when `CRON_SECRET` is set (an
 * unset secret must not match the header `Bearer undefined`). `autoRun` runs jobs in-process and
 * doesn't go through this.
 */
export const canRunJobs = ({ req }: { req: PayloadRequest }): boolean => {
  if (isActiveSuperUser(req.user)) return true
  const secret = process.env.CRON_SECRET
  if (!secret) {
    req.payload.logger.debug({ msg: 'jobs run refused: CRON_SECRET not set' })
    return false
  }
  return req.headers.get('authorization') === `Bearer ${secret}`
}

/**
 * `payload-jobs` (Payload's queue collection): super users only. Payload leaves it open to every
 * signed-in user, and creating a job queues work the server then runs.
 */
export const jobsCollectionAccess: Access = ({ req }) => isActiveSuperUser(req.user)
