// `writeAuditLog` never fails the save: a log insert that fails in the database (a tenant id that
// doesn't exist: a real foreign key error inside the transaction) rolls back only itself, in a
// savepoint, so the rest of the request commits.
import { commitTransaction, initTransaction, killTransaction, type Payload } from 'payload'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { writeAuditLog } from '@/common/utils/auditLog'
import type { Page } from '@/payload-types'

import { context } from '../access-control/pages'
import { getTestPayload } from '../common/payload'
import { TEST_TENANTS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { reqFor } from '../common/users'
import { pageData, rowsFor, rowsWhere } from './rows'

describe('writeAuditLog', () => {
  let payload: Payload
  let failedLogReturned = false
  let errorCalls = 0
  let pageCommitted: Page | null = null
  let badDocId: string

  // one beforeAll, as the old script: a request with no user (reqFor) and initTransaction;
  // payload.logger.error wrapped only while writeAuditLog runs (vi.spyOn, restored after);
  // writeAuditLog with tenant 2_000_000_000 and docId uniqueName('audit-bad'); then a page created
  // on the same req; commitTransaction (killTransaction on a throw)
  beforeAll(async () => {
    payload = await getTestPayload()
    const tenantA = await findTenant(payload, TEST_TENANTS.a)
    badDocId = uniqueName('audit-bad')
    const req = await reqFor(payload, null)

    try {
      await initTransaction(req)
      const spy = vi.spyOn(payload.logger, 'error')
      try {
        await writeAuditLog(req, {
          operation: 'create',
          collectionSlug: 'pages',
          docId: badDocId,
          tenant: 2_000_000_000,
          user: null,
          changes: {},
        })
        failedLogReturned = true
        errorCalls = spy.mock.calls.length
      } finally {
        spy.mockRestore()
      }
      pageCommitted = await payload.create({
        collection: 'pages',
        data: pageData(uniqueName('audit-savepoint'), tenantA.id),
        req,
        context,
      })
      await commitTransaction(req)
    } catch (err) {
      await killTransaction(req)
      payload.logger.error({ msg: 'tests: writeAuditLog savepoint threw', err })
    }
  })

  it('returns without throwing on a database error', () => {
    // assert: writeAuditLog resolved
    expect(failedLogReturned).toBe(true)
  })

  it('logs the failure as an error', () => {
    // assert: logger.error was called while it ran
    expect(errorCalls).toBeGreaterThan(0)
  })

  it('commits the page saved after it on the same request', async () => {
    // assert: the page is found after the commit
    expect(pageCommitted).not.toBeNull()
    const { totalDocs } = await payload.find({
      collection: 'pages',
      where: { id: { equals: pageCommitted?.id } },
      depth: 0,
    })
    expect(totalDocs).toBe(1)
  })

  it('writes the page its create row and the failed entry none', async () => {
    // assert: one row for the page; no row with the bad docId
    expect(pageCommitted).not.toBeNull()
    expect(await rowsFor(payload, 'pages', pageCommitted?.id ?? '')).toHaveLength(1)
    expect(await rowsWhere(payload, { docId: { equals: badDocId } })).toHaveLength(0)
  })
})
