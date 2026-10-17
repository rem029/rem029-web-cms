// `pruneAuditLogs` and its daily job: rows older than the retention are deleted in batches (capped
// per run), nothing else is touched, and the job always leaves its next run queued.
import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, onTestFinished } from 'vitest'

import { ensurePruneJobQueued, pruneAuditLogs } from '@/collections/AuditLogs/jobs/pruneAuditLogs'

import { getTestPayload } from '../common/payload'
import { uniqueName } from '../common/unique'

interface DrizzleExecutor {
  execute: (query: ReturnType<typeof sql>) => Promise<unknown>
}

const isDrizzleAdapter = (db: unknown): db is { drizzle: DrizzleExecutor } => {
  if (typeof db !== 'object' || db === null) return false
  if (!('drizzle' in db)) return false
  const drizzle = db.drizzle
  if (typeof drizzle !== 'object' || drizzle === null) return false
  return 'execute' in drizzle && typeof drizzle.execute === 'function'
}

// old rows are inserted with SQL (payload.db.drizzle.execute + sql from @payloadcms/db-postgres),
// `created_at` backdated, `collection_slug` = uniqueName('test-retention') per test, counted by
// that slug; each test sets retentionMonths first (overrideAccess)
describe('pruneAuditLogs', () => {
  let payload: Payload
  let drizzle: DrizzleExecutor

  const setRetention = (retentionMonths: number) =>
    payload.updateGlobal({
      slug: 'audit-logs-settings',
      data: { retentionMonths },
      overrideAccess: true,
    })

  const insertOldRows = async (slug: string, count: number, monthsOld: number): Promise<void> => {
    onTestFinished(async () => {
      await drizzle.execute(sql`DELETE FROM audit_logs WHERE collection_slug = ${slug}`)
    })
    await drizzle.execute(
      sql`INSERT INTO audit_logs (operation, collection_slug, doc_id, created_at, updated_at) SELECT 'create', ${slug}, g::text, now() - make_interval(months => ${monthsOld}), now() FROM generate_series(1, ${count}) g`,
    )
  }

  const countRows = async (slug: string): Promise<number> => {
    const { totalDocs } = await payload.find({
      collection: 'audit-logs',
      where: { collectionSlug: { equals: slug } },
      depth: 0,
      overrideAccess: true,
      limit: 0,
    })
    return totalDocs
  }

  const deletePruneJobs = () =>
    payload.delete({
      collection: 'payload-jobs',
      where: {
        and: [{ taskSlug: { equals: 'pruneAuditLogs' } }, { queue: { equals: 'maintenance' } }],
      },
      overrideAccess: true,
    })

  const findWaitingPruneJobs = async () => {
    const { docs } = await payload.find({
      collection: 'payload-jobs',
      where: {
        and: [
          { taskSlug: { equals: 'pruneAuditLogs' } },
          { queue: { equals: 'maintenance' } },
          { hasError: { equals: false } },
          { completedAt: { exists: false } },
        ],
      },
      depth: 0,
      overrideAccess: true,
    })
    return docs
  }

  beforeAll(async () => {
    payload = await getTestPayload()
    if (!isDrizzleAdapter(payload.db)) {
      throw new Error('tests: postgres drizzle adapter expected')
    }
    drizzle = payload.db.drizzle
  })

  afterAll(async () => {
    // retentionMonths back to 12; delete the pruneAuditLogs jobs (overrideAccess)
    await setRetention(12)
    await deletePruneJobs()
  })

  it('deletes rows past the retention and keeps newer ones', async () => {
    // arrange: retention 12; 2,500 rows 13 months old, 10 rows 11 months old
    const slug = uniqueName('test-retention')
    await setRetention(12)
    await insertOldRows(slug, 2500, 13)
    await insertOldRows(slug, 10, 11)

    // act: pruneAuditLogs(payload, { batchSize: 1000, pauseMs: 0 })
    const res = await pruneAuditLogs(payload, { batchSize: 1000, pauseMs: 0 })

    // assert: deleted 2500, remaining 0, the 10 newer rows still there
    expect(res.deleted).toBe(2500)
    expect(res.remaining).toBe(0)
    expect(await countRows(slug)).toBe(10)
  })

  it('stops at maxRows and deletes the rest on the next run', async () => {
    // arrange: retention 12; 2,500 rows 13 months old
    const slug = uniqueName('test-retention')
    await setRetention(12)
    await insertOldRows(slug, 2500, 13)

    // act: a run with { batchSize: 500, maxRows: 1000, pauseMs: 0 }, then { maxRows: 2000 }
    const first = await pruneAuditLogs(payload, { batchSize: 500, maxRows: 1000, pauseMs: 0 })
    const second = await pruneAuditLogs(payload, { batchSize: 500, maxRows: 2000, pauseMs: 0 })

    // assert: first deleted 1000, remaining 1500; second deleted 1500, remaining 0
    expect(first).toMatchObject({ deleted: 1000, remaining: 1500 })
    expect(second).toMatchObject({ deleted: 1500, remaining: 0 })
    expect(await countRows(slug)).toBe(0)
  })

  it('follows the retention setting', async () => {
    // arrange: retention 6; 20 rows 7 months old, 15 rows 5 months old
    const slug = uniqueName('test-retention')
    await setRetention(6)
    await insertOldRows(slug, 20, 7)
    await insertOldRows(slug, 15, 5)

    // act: pruneAuditLogs(payload, { pauseMs: 0 })
    const res = await pruneAuditLogs(payload, { pauseMs: 0 })

    // assert: deleted 20, the 15 rows still there
    expect(res.deleted).toBe(20)
    expect(await countRows(slug)).toBe(15)
  })

  it('touches only old audit rows', async () => {
    // arrange: count pages, and audit rows created in the last hour
    await setRetention(12)
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { totalDocs: pagesBefore } = await payload.find({
      collection: 'pages',
      depth: 0,
      overrideAccess: true,
      limit: 0,
    })
    const { totalDocs: recentAuditBefore } = await payload.find({
      collection: 'audit-logs',
      where: { createdAt: { greater_than_equal: hourAgo } },
      depth: 0,
      overrideAccess: true,
      limit: 0,
    })

    // act: pruneAuditLogs(payload, { pauseMs: 0 })
    await pruneAuditLogs(payload, { pauseMs: 0 })

    // assert: both counts unchanged
    const { totalDocs: pagesAfter } = await payload.find({
      collection: 'pages',
      depth: 0,
      overrideAccess: true,
      limit: 0,
    })
    const { totalDocs: recentAuditAfter } = await payload.find({
      collection: 'audit-logs',
      where: { createdAt: { greater_than_equal: hourAgo } },
      depth: 0,
      overrideAccess: true,
      limit: 0,
    })
    expect(pagesAfter).toBe(pagesBefore)
    expect(recentAuditAfter).toBe(recentAuditBefore)
  })

  describe('job', () => {
    it('prunes and queues the next run within 24 hours', async () => {
      // arrange: retention 12; 50 rows 13 months old; no pruneAuditLogs jobs
      const slug = uniqueName('test-retention')
      await setRetention(12)
      await insertOldRows(slug, 50, 13)
      await deletePruneJobs()

      // act: payload.jobs.queue({ task: 'pruneAuditLogs', queue: 'maintenance' }), then
      // payload.jobs.run({ queue: 'maintenance' })
      await payload.jobs.queue({
        task: 'pruneAuditLogs',
        queue: 'maintenance',
        input: {},
      })
      await payload.jobs.run({ queue: 'maintenance' })

      // assert: the 50 rows are gone; exactly one waiting job (no error, not completed) with
      // waitUntil in the future and at most 24 h away
      expect(await countRows(slug)).toBe(0)
      const waitingJobs = await findWaitingPruneJobs()
      expect(waitingJobs).toHaveLength(1)
      const nowMs = Date.now()
      const waitMs = waitingJobs[0]?.waitUntil ? new Date(waitingJobs[0].waitUntil).getTime() : 0
      expect(waitMs).toBeGreaterThan(nowMs)
      expect(waitMs).toBeLessThanOrEqual(nowMs + 24 * 60 * 60 * 1000)
    })

    it('queues only one job when ensured twice', async () => {
      // arrange: no pruneAuditLogs jobs
      await deletePruneJobs()

      // act: ensurePruneJobQueued twice
      await ensurePruneJobQueued(payload)
      await ensurePruneJobQueued(payload)

      // assert: exactly one waiting job
      expect(await findWaitingPruneJobs()).toHaveLength(1)
    })
  })
})
