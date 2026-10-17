import { sql } from '@payloadcms/db-postgres'
import type { CollectionSlug, FlattenedField, GlobalSlug, PayloadRequest } from 'payload'

import type { AuditLog } from '@/payload-types'
import { extractTenantId } from '@/common/utils/tenantCollections'

/** What the hooks pass to `writeAuditLog`; the row as stored, minus ids and timestamps. */
export interface AuditEntry {
  operation: AuditLog['operation']
  collectionSlug: CollectionSlug | GlobalSlug
  docId: string
  tenant: number | null
  user: number | null
  changes?: Record<string, unknown>
}

/** A field that changed: plain fields show both values, big ones only that they changed. */
export type FieldChange = { from: unknown; to: unknown } | 'changed'

// keys that are never stored in a row, at any depth. new sensitive fields go here
export const SECRET_KEY_PATTERN = /password|secret|token|apikey/i
export const SECRET_KEYS: string[] = [
  'hash',
  'salt',
  'apiKeyIndex',
  'enableAPIKey',
  'resetPasswordExpiration',
  'sessions',
  'loginAttempts',
  'lockUntil',
]

// stored only as "changed": big trees (Payload versions keep their history)
export const SUMMARISED_FIELD_TYPES: FlattenedField['type'][] = [
  'richText',
  'blocks',
  'array',
  'group',
  'json',
]

// left out of create/delete snapshots: the row has them already, or they're noise
export const SNAPSHOT_OMITTED_KEYS: string[] = [
  'id',
  'createdAt',
  'updatedAt',
  'createdBy',
  'updatedBy',
]

type Query = ReturnType<typeof sql>

// Payload types a transaction session as `unknown` (adapter-agnostic); on Postgres it's a
// drizzle transaction
const isExecutor = (val: unknown): val is { execute: (query: Query) => Promise<unknown> } =>
  typeof val === 'object' && val !== null && 'execute' in val && typeof val.execute === 'function'

const isRecord = (val: unknown): val is Record<string, unknown> =>
  typeof val === 'object' && val !== null && !Array.isArray(val) && !(val instanceof Date)

const relationId = (val: unknown): unknown => {
  const tenantId = extractTenantId(val)
  if (tenantId !== null) return tenantId
  if (isRecord(val) && 'id' in val) return val.id
  return val ?? null
}

const normalizeRelation = (val: unknown): unknown => {
  if (Array.isArray(val)) {
    return val.map(relationId)
  }
  return relationId(val)
}

// for comparing only: object keys sorted, empty (null/undefined) values dropped. Payload's
// previousDoc and doc disagree on empty fields (`media: null` in one, missing in the other)
const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonical)
  if (!isRecord(value)) return value ?? null
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .filter((key) => value[key] !== null && value[key] !== undefined)
      .map((key) => [key, canonical(value[key])]),
  )
}
const sameValue = (a: unknown, b: unknown): boolean =>
  JSON.stringify(canonical(a)) === JSON.stringify(canonical(b))

/** A deep copy of `value` without the keys matching `SECRET_KEY_PATTERN` or in `SECRET_KEYS`. */
export const redact = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(redact)
  }
  if (isRecord(value)) {
    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value)) {
      if (SECRET_KEY_PATTERN.test(key) || SECRET_KEYS.includes(key)) {
        continue
      }
      result[key] = redact(val)
    }
    return result
  }
  return value
}

/**
 * A created or deleted doc as stored in `changes`: redacted, without `SNAPSHOT_OMITTED_KEYS`.
 * When `fields` are given, top-level relationship and upload values become ids.
 */
export const snapshot = (
  doc: Record<string, unknown>,
  fields?: FlattenedField[],
): Record<string, unknown> => {
  const relationFields = new Set<string>()
  if (fields) {
    for (const field of fields) {
      if (
        'type' in field &&
        (field.type === 'relationship' || field.type === 'upload') &&
        'name' in field &&
        typeof field.name === 'string'
      ) {
        relationFields.add(field.name)
      }
    }
  }

  const copy: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(doc)) {
    if (!SNAPSHOT_OMITTED_KEYS.includes(key)) {
      copy[key] = relationFields.has(key) ? normalizeRelation(val) : val
    }
  }
  const redacted = redact(copy)
  return isRecord(redacted) ? redacted : {}
}

/**
 * The top-level fields that differ between two versions of a doc (compared as JSON), keyed by
 * field name. `{}` when nothing changed.
 * - plain fields (text, number, select, checkbox, date, relationship/upload ids, …) → { from, to }
 * - fields in `SUMMARISED_FIELD_TYPES` → 'changed'
 * - secret fields (`SECRET_KEY_PATTERN` / `SECRET_KEYS`) are skipped, except `passwordChanged`
 *   adds `password: 'changed'` (Payload removes the password before afterChange, so the hook
 *   detects it and passes the flag)
 * - `SNAPSHOT_OMITTED_KEYS` are ignored (updatedAt changes on every save)
 */
export const diff = (
  previous: Record<string, unknown>,
  current: Record<string, unknown>,
  fields: FlattenedField[],
  options?: { passwordChanged?: boolean },
): Record<string, FieldChange> => {
  const result: Record<string, FieldChange> = {}

  for (const field of fields) {
    if (!('name' in field) || typeof field.name !== 'string' || !field.name) {
      continue
    }
    const { name } = field
    if (SNAPSHOT_OMITTED_KEYS.includes(name)) {
      continue
    }
    if (SECRET_KEY_PATTERN.test(name) || SECRET_KEYS.includes(name)) {
      continue
    }

    const isRelation = field.type === 'relationship' || field.type === 'upload'
    const prev = isRelation ? normalizeRelation(previous[name]) : previous[name]
    const cur = isRelation ? normalizeRelation(current[name]) : current[name]

    if (sameValue(prev, cur)) {
      continue
    }

    if (SUMMARISED_FIELD_TYPES.includes(field.type)) {
      result[name] = 'changed'
    } else {
      result[name] = { from: redact(prev), to: redact(cur) }
    }
  }

  if (options?.passwordChanged) {
    result.password = 'changed'
  }

  return result
}

/** The tenant a row belongs to: a tenant's own id, else the doc's `tenant`, else null (users). */
export const tenantOf = (slug: CollectionSlug, doc: Record<string, unknown>): number | null => {
  if (slug === 'tenants' && typeof doc.id === 'number') {
    return doc.id
  }
  if ('tenant' in doc) {
    return extractTenantId(doc.tenant)
  }
  return null
}

/**
 * Client IP from the first entry of `x-forwarded-for` when `TRUST_PROXY=true`.
 */
export const clientIp = (req: PayloadRequest): string | null => clientIpFromHeaders(req.headers)

/** As `clientIp`, from bare headers (server actions read them through `next/headers`). */
export const clientIpFromHeaders = (headers: Pick<Headers, 'get'>): string | null => {
  if (process.env.TRUST_PROXY === 'true') {
    const forwarded = headers.get('x-forwarded-for')
    if (forwarded) {
      const first = forwarded.split(',')[0]?.trim()
      if (first) return first.slice(0, 64)
    }
  }
  return null
}

/**
 * Writes one `audit-logs` row and never throws: a failed log must not fail the save it records.
 *
 * Inside a transaction (`req.transactionID` set) the insert runs between a raw-SQL
 * `SAVEPOINT audit_log` and `RELEASE SAVEPOINT audit_log` on the request's own session (as the
 * Users logout endpoint gets it); on error `ROLLBACK TO SAVEPOINT audit_log` undoes only the log,
 * so Postgres doesn't abort the parent's transaction. Without a transaction it's a plain insert.
 */
export const writeAuditLog = async (req: PayloadRequest, entry: AuditEntry): Promise<void> => {
  const { db } = req.payload
  const transactionID = req.transactionID ? await req.transactionID : undefined
  const session = transactionID !== undefined ? db.sessions?.[transactionID]?.db : undefined
  const inTransaction = isExecutor(session)

  const data = {
    user: entry.user,
    operation: entry.operation,
    collectionSlug: entry.collectionSlug,
    docId: entry.docId,
    tenant: entry.tenant,
    ip: clientIp(req),
    changes: entry.changes,
  }

  const logContext = {
    collection: entry.collectionSlug,
    operation: entry.operation,
    docId: entry.docId,
    userId: entry.user,
    tenantId: entry.tenant,
  }

  const insert = () => db.create({ collection: 'audit-logs', data, req })
  try {
    if (!inTransaction) {
      await insert()
    } else {
      await session.execute(sql`SAVEPOINT audit_log`)
      try {
        await insert()
        await session.execute(sql`RELEASE SAVEPOINT audit_log`)
      } catch (err) {
        // undo only the log; if this fails too, the outer catch logs the original error
        await session.execute(sql`ROLLBACK TO SAVEPOINT audit_log`)
        throw err
      }
    }
    req.payload.logger.debug({ msg: 'audit log written', ...logContext })
  } catch (err) {
    req.payload.logger.error({ msg: 'audit log failed', ...logContext, err })
  }
}
