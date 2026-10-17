import { sql } from '@payloadcms/db-postgres'
import type { Payload, TaskConfig } from 'payload'

export interface PruneAuditLogsOptions {
  now?: Date
  batchSize?: number
  maxRows?: number
  pauseMs?: number
}

export interface PruneAuditLogsResult {
  deleted: number
  remaining: number
  cutoff: string
}

const isRecord = (val: unknown): val is Record<string, unknown> =>
  typeof val === 'object' && val !== null && !Array.isArray(val)

const nextThreeAm = (now = new Date()): Date => {
  const target = new Date(now)
  target.setHours(3, 0, 0, 0)
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1)
  }
  return target
}

/**
 * Prunes audit log entries older than the retention period set in `audit-logs-settings`.
 * Runs in batches with raw SQL to prevent memory spikes or locking up the server.
 */
export const pruneAuditLogs = async (
  payload: Payload,
  options?: PruneAuditLogsOptions,
): Promise<PruneAuditLogsResult> => {
  const settings = await payload.findGlobal({
    slug: 'audit-logs-settings',
    depth: 0,
  })

  const rawMonths = settings?.retentionMonths
  let retentionMonths = 12
  if (
    typeof rawMonths === 'number' &&
    Number.isInteger(rawMonths) &&
    rawMonths >= 1 &&
    rawMonths <= 120
  ) {
    retentionMonths = rawMonths
  } else {
    payload.logger.warn({
      msg: 'invalid or missing retentionMonths in audit-logs-settings, falling back to 12',
      retentionMonths: rawMonths,
    })
  }

  const cutoff = new Date(options?.now ?? new Date())
  cutoff.setMonth(cutoff.getMonth() - retentionMonths)

  const batchSize = options?.batchSize ?? 1000
  const maxRows = options?.maxRows ?? 50000
  const pauseMs = options?.pauseMs ?? 100

  let deleted = 0
  while (true) {
    const limit = Math.min(batchSize, maxRows - deleted)
    if (limit <= 0) {
      break
    }

    const result = await payload.db.drizzle.execute(
      sql`WITH doomed AS (SELECT id FROM audit_logs WHERE created_at < ${cutoff} ORDER BY id LIMIT ${limit}) DELETE FROM audit_logs WHERE id IN (SELECT id FROM doomed)`,
    )

    let batchDeleted = 0
    if (isRecord(result)) {
      if (typeof result.rowCount === 'number') {
        batchDeleted = result.rowCount
      } else if (Array.isArray(result.rows)) {
        batchDeleted = result.rows.length
      }
    }

    deleted += batchDeleted

    if (batchDeleted < limit) {
      break
    }

    if (pauseMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, pauseMs))
    }
  }

  const countResult = await payload.db.drizzle.execute(
    sql`SELECT count(*)::int AS count FROM audit_logs WHERE created_at < ${cutoff}`,
  )

  let remaining = 0
  if (isRecord(countResult) && Array.isArray(countResult.rows) && countResult.rows.length > 0) {
    const firstRow = countResult.rows[0]
    if (isRecord(firstRow)) {
      remaining = Number(firstRow.count) || 0
    }
  }

  const iso = cutoff.toISOString()
  payload.logger.info({
    msg: 'audit logs pruned',
    deleted,
    remaining,
    cutoff: iso,
    months: retentionMonths,
  })

  if (remaining > 0) {
    payload.logger.warn({
      msg: 'audit logs prune hit the per-run cap',
      deleted,
      remaining,
      maxRows,
      cutoff: iso,
    })
  }

  return { deleted, remaining, cutoff: iso }
}

/**
 * Payload task for running pruneAuditLogs and queueing the next daily run at 03:00.
 */
export const pruneAuditLogsTask: TaskConfig<'pruneAuditLogs'> = {
  slug: 'pruneAuditLogs',
  label: 'Prune Audit Logs',
  outputSchema: [
    { name: 'deleted', type: 'number', required: true },
    { name: 'remaining', type: 'number', required: true },
  ],
  handler: async ({ req }) => {
    try {
      const result = await pruneAuditLogs(req.payload)
      return { output: { deleted: result.deleted, remaining: result.remaining } }
    } finally {
      // queue tomorrow's run even when this one fails, or pruning stops until the next restart
      const waitUntil = nextThreeAm()
      await req.payload.jobs.queue({
        task: 'pruneAuditLogs',
        queue: 'maintenance',
        waitUntil,
        input: {},
        req,
      })
      req.payload.logger.info({
        msg: 'audit logs prune next run queued',
        waitUntil: waitUntil.toISOString(),
      })
    }
  },
}

/**
 * Ensures exactly one pruneAuditLogs job is queued for next 03:00 in the 'maintenance' queue.
 * Idempotent: checks if a job is already waiting (not completed, no error) before queueing.
 */
export const ensurePruneJobQueued = async (payload: Payload): Promise<void> => {
  const { docs } = await payload.find({
    collection: 'payload-jobs',
    where: {
      and: [
        { taskSlug: { equals: 'pruneAuditLogs' } },
        { completedAt: { exists: false } },
        { hasError: { not_equals: true } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  if (docs.length > 0) {
    payload.logger.debug({
      msg: 'audit logs prune job already queued',
      jobId: docs[0]?.id,
    })
    return
  }

  const waitUntil = nextThreeAm()
  await payload.jobs.queue({
    task: 'pruneAuditLogs',
    queue: 'maintenance',
    waitUntil,
    input: {},
  })
  payload.logger.info({ msg: 'audit logs prune job queued', waitUntil })
}
