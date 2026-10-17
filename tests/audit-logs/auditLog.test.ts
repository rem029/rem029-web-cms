// The audit hooks (`auditLogAfterChange` / `auditLogAfterDelete`): creates, updates and deletes
// write one row each with the user, collection, doc id, tenant and the changes (changed fields only,
// from → to; big fields as "changed"; secrets never). Draft saves write nothing.
import { randomUUID } from 'crypto'

import type { Payload, Where } from 'payload'
import { beforeAll, describe, expect, it, onTestFinished } from 'vitest'

import { extractTenantId as relationId } from '@/common/utils/tenantCollections'
import type { AuditLog, FormSubmission, Page, Post, Tenant } from '@/payload-types'

import { context } from '../access-control/pages'
import { contentLayout, richText } from '../common/content'
import { getTestPayload } from '../common/payload'
import { TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { loadUser, type SessionUser } from '../common/users'
import { changesOf, isChange, keysOf, pageData, rowsFor, rowsWhere } from './rows'

// keys that must never appear in a row
const SECRET_KEYS = ['password', 'hash', 'salt', 'resetPasswordToken', 'sessions', 'loginAttempts']

// a business and everything in it; cleanupAfterTenantDelete is off, so its docs go first
const deleteBusiness = async (payload: Payload, tenantId: number): Promise<void> => {
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

describe('audit log hooks', () => {
  let payload: Payload
  let tenantA: Tenant
  // tenant admin of test-a: writes the pages below
  let tenantAdmin: SessionUser

  const createPage = (prefix: string): Promise<Page> => {
    const title = uniqueName(prefix)
    return payload.create({
      collection: 'pages',
      data: pageData(title, tenantA.id),
      user: tenantAdmin,
      overrideAccess: false,
      context,
    })
  }

  const createMember = async (prefix: string): Promise<SessionUser> => {
    const name = uniqueName(prefix)
    const email = `${name}@example.test`
    await payload.create({
      collection: 'users',
      data: {
        email,
        name,
        password: randomUUID(),
        tenants: [{ tenant: tenantA.id }],
      },
    })
    return loadUser(payload, email)
  }

  beforeAll(async () => {
    payload = await getTestPayload()
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    tenantAdmin = await loadUser(payload, TEST_USERS.tenantAdmin)
  })

  // every page is created by its own test (uniqueName, pageData from ./rows), as the tenant admin
  // with overrideAccess: false and `context`; rows are read with rowsFor (what's stored)
  describe('create', () => {
    it('writes one create row', async () => {
      // arrange + act: the tenant admin creates a page
      const page = await createPage('audit-create')
      const created = (await rowsFor(payload, 'pages', page.id)).filter(
        (row) => row.operation === 'create',
      )

      // assert: one row with operation create for it
      expect(created).toHaveLength(1)
    })

    it('records the user, collection, doc id and tenant', async () => {
      // arrange + act: the tenant admin creates a page
      const page = await createPage('audit-create-fields')
      const [row] = (await rowsFor(payload, 'pages', page.id)).filter(
        (r) => r.operation === 'create',
      )

      // assert: user = tenant admin, collectionSlug pages, docId = page id, tenant = test-a
      expect(row?.user).toBe(tenantAdmin.id)
      expect(row?.collectionSlug).toBe('pages')
      expect(row?.docId).toBe(String(page.id))
      expect(relationId(row?.tenant)).toBe(tenantA.id)
    })

    it('keeps the title, without id, timestamps, createdBy or updatedBy', async () => {
      // arrange + act: the tenant admin creates a page
      const page = await createPage('audit-create-snapshot')
      const [row] = (await rowsFor(payload, 'pages', page.id)).filter(
        (r) => r.operation === 'create',
      )
      const changes = changesOf(row)

      // assert: changes.title is the page title; none of id, createdAt, updatedAt, createdBy,
      // updatedBy in changes
      expect(changes.title).toBe(page.title)
      expect(
        ['id', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'].every(
          (key) => !(key in changes),
        ),
      ).toBe(true)
    })
  })

  describe('update', () => {
    it('writes one update row', async () => {
      // arrange: a page
      const page = await createPage('audit-update')

      // act: rename it
      await payload.update({
        collection: 'pages',
        id: page.id,
        data: { title: `${page.title} renamed` },
        user: tenantAdmin,
        overrideAccess: false,
        context,
      })

      // assert: one update row
      const updates = (await rowsFor(payload, 'pages', page.id)).filter(
        (row) => row.operation === 'update',
      )
      expect(updates).toHaveLength(1)
    })

    it('records only the changed title, from → to', async () => {
      // arrange: a page
      const page = await createPage('audit-update-diff')
      const nextTitle = `${page.title} renamed`

      // act: rename it
      await payload.update({
        collection: 'pages',
        id: page.id,
        data: { title: nextTitle },
        user: tenantAdmin,
        overrideAccess: false,
        context,
      })

      // assert: the update row's changes has only `title`, isChange(title, old, new)
      const [update] = (await rowsFor(payload, 'pages', page.id)).filter(
        (row) => row.operation === 'update',
      )
      const changes = changesOf(update)
      expect(Object.keys(changes)).toEqual(['title'])
      expect(isChange(changes.title, page.title, nextTitle)).toBe(true)
    })

    it('writes no row when nothing changed', async () => {
      // arrange: a page, renamed once
      const page = await createPage('audit-no-change')
      const nextTitle = `${page.title} renamed`
      await payload.update({
        collection: 'pages',
        id: page.id,
        data: { title: nextTitle },
        user: tenantAdmin,
        overrideAccess: false,
        context,
      })

      // act: save the same title again
      await payload.update({
        collection: 'pages',
        id: page.id,
        data: { title: nextTitle },
        user: tenantAdmin,
        overrideAccess: false,
        context,
      })

      // assert: still two rows (create + the first update)
      expect(await rowsFor(payload, 'pages', page.id)).toHaveLength(2)
    })

    it('shows blocks as "changed", without their values', async () => {
      // arrange: a page
      const page = await createPage('audit-blocks')
      const marker = uniqueName('audit-block-marker')

      // act: replace its layout with a content block holding a unique marker
      await payload.update({
        collection: 'pages',
        id: page.id,
        data: { layout: contentLayout(richText(marker)) },
        user: tenantAdmin,
        overrideAccess: false,
        context,
      })

      // assert: the last row's changes.layout is 'changed'; the row's JSON has no marker
      const lastRow = (await rowsFor(payload, 'pages', page.id)).at(-1)
      expect(changesOf(lastRow).layout).toBe('changed')
      expect(JSON.stringify(lastRow ?? null)).not.toContain(marker)
    })
  })

  it('writes one delete row with the page fields', async () => {
    // arrange: a page
    const page = await createPage('audit-delete')

    // act: the tenant admin deletes it
    await payload.delete({
      collection: 'pages',
      id: page.id,
      user: tenantAdmin,
      overrideAccess: false,
      context,
    })

    // assert: one delete row, user = tenant admin, changes.title = the page title
    const deleted = (await rowsFor(payload, 'pages', page.id)).filter(
      (row) => row.operation === 'delete',
    )
    expect(deleted).toHaveLength(1)
    expect(deleted[0]?.user).toBe(tenantAdmin.id)
    expect(changesOf(deleted[0]).title).toBe(page.title)
  })

  describe('drafts', () => {
    it('writes no row for a draft save or an autosave', async () => {
      // arrange: a published page; count its rows
      const drafted = await createPage('audit-drafts')
      const afterCreate = (await rowsFor(payload, 'pages', drafted.id)).length

      // act: a draft save (draft: true, _status draft), then an autosave (autosave: true)
      await payload.update({
        collection: 'pages',
        id: drafted.id,
        data: { title: `${drafted.title} manual`, _status: 'draft' },
        draft: true,
        user: tenantAdmin,
        overrideAccess: false,
        context,
      })
      await payload.update({
        collection: 'pages',
        id: drafted.id,
        data: { title: `${drafted.title} autosaved`, _status: 'draft' },
        draft: true,
        autosave: true,
        user: tenantAdmin,
        overrideAccess: false,
        context,
      })

      // assert: the row count is unchanged
      expect(await rowsFor(payload, 'pages', drafted.id)).toHaveLength(afterCreate)
    })

    it('logs publishing as one update, from the last published title', async () => {
      // arrange: a published page, then a draft save and an autosave with new titles
      const drafted = await createPage('audit-publish')
      const afterCreate = (await rowsFor(payload, 'pages', drafted.id)).length
      const autosavedTitle = `${drafted.title} autosaved`
      await payload.update({
        collection: 'pages',
        id: drafted.id,
        data: { title: `${drafted.title} manual`, _status: 'draft' },
        draft: true,
        user: tenantAdmin,
        overrideAccess: false,
        context,
      })
      await payload.update({
        collection: 'pages',
        id: drafted.id,
        data: { title: autosavedTitle, _status: 'draft' },
        draft: true,
        autosave: true,
        user: tenantAdmin,
        overrideAccess: false,
        context,
      })

      // act: publish it (_status published)
      await payload.update({
        collection: 'pages',
        id: drafted.id,
        data: { _status: 'published' },
        user: tenantAdmin,
        overrideAccess: false,
        context,
      })

      // assert: one new update row, isChange(title, the first title, the autosaved title)
      const published = (await rowsFor(payload, 'pages', drafted.id)).slice(afterCreate)
      expect(published).toHaveLength(1)
      expect(published[0]?.operation).toBe('update')
      expect(isChange(changesOf(published[0]).title, drafted.title, autosavedTitle)).toBe(true)
    })

    it('logs unpublishing as one update with the status', async () => {
      // arrange: a published page
      const drafted = await createPage('audit-unpublish')
      const beforeUnpublish = (await rowsFor(payload, 'pages', drafted.id)).length

      // act: set _status draft (not a draft save)
      await payload.update({
        collection: 'pages',
        id: drafted.id,
        data: { _status: 'draft' },
        user: tenantAdmin,
        overrideAccess: false,
        context,
      })

      // assert: one new row, isChange(_status, 'published', 'draft')
      const unpublished = (await rowsFor(payload, 'pages', drafted.id)).slice(beforeUnpublish)
      expect(unpublished).toHaveLength(1)
      expect(isChange(changesOf(unpublished[0])._status, 'published', 'draft')).toBe(true)
    })
  })

  describe('bulk', () => {
    it('writes one row per page for one bulk update', async () => {
      // arrange: two pages
      const bulk = [await createPage('audit-bulk-u1'), await createPage('audit-bulk-u2')]
      const ids = bulk.map((doc) => doc.id)

      // act: one payload.update with where id in both
      await payload.update({
        collection: 'pages',
        where: { id: { in: ids } },
        data: { title: 'bulk renamed' },
        user: tenantAdmin,
        overrideAccess: false,
        context,
      })

      // assert: two update rows for those ids
      const rows = await rowsWhere(payload, {
        and: [
          { collectionSlug: { equals: 'pages' } },
          { docId: { in: ids.map(String) } },
          { operation: { equals: 'update' } },
        ],
      })
      expect(rows).toHaveLength(2)
    })

    it('writes one row per page for one bulk delete', async () => {
      // arrange: two pages
      const bulk = [await createPage('audit-bulk-d1'), await createPage('audit-bulk-d2')]
      const ids = bulk.map((doc) => doc.id)

      // act: one payload.delete with where id in both
      await payload.delete({
        collection: 'pages',
        where: { id: { in: ids } },
        user: tenantAdmin,
        overrideAccess: false,
        context,
      })

      // assert: two delete rows for those ids
      const rows = await rowsWhere(payload, {
        and: [
          { collectionSlug: { equals: 'pages' } },
          { docId: { in: ids.map(String) } },
          { operation: { equals: 'delete' } },
        ],
      })
      expect(rows).toHaveLength(2)
    })
  })

  it('logs a parent category rename once, not its child', async () => {
    // nested-docs (Payload 3.44) only resaves children of a published parent and categories have no
    // drafts, so the child isn't resaved (stale breadcrumbs: follow-up in the rem0002 plan)
    // arrange: a parent category and a child in test-a; count their rows
    const parent = await payload.create({
      collection: 'categories',
      data: { title: uniqueName('audit-cat-parent'), tenant: tenantA.id },
      user: tenantAdmin,
      overrideAccess: false,
      context,
    })
    const child = await payload.create({
      collection: 'categories',
      data: { title: uniqueName('audit-cat-child'), tenant: tenantA.id, parent: parent.id },
      user: tenantAdmin,
      overrideAccess: false,
      context,
    })
    const beforeParent = (await rowsFor(payload, 'categories', parent.id)).length
    const beforeChild = (await rowsFor(payload, 'categories', child.id)).length

    // act: rename the parent
    await payload.update({
      collection: 'categories',
      id: parent.id,
      data: { title: `${parent.title} renamed` },
      user: tenantAdmin,
      overrideAccess: false,
      context,
    })

    // assert: one more row for the parent, none for the child
    expect(await rowsFor(payload, 'categories', parent.id)).toHaveLength(beforeParent + 1)
    expect(await rowsFor(payload, 'categories', child.id)).toHaveLength(beforeChild)
  })

  it('logs a business rename with that business', async () => {
    // arrange: test-a's name; onTestFinished puts it back (overrideAccess)
    const oldName = tenantA.name
    onTestFinished(async () => {
      await payload.update({
        collection: 'tenants',
        id: tenantA.id,
        data: { name: oldName },
        context,
      })
    })

    // act: the tenant admin renames test-a
    await payload.update({
      collection: 'tenants',
      id: tenantA.id,
      data: { name: `${oldName} renamed` },
      user: tenantAdmin,
      overrideAccess: false,
      context,
    })

    // assert: the last tenants row for test-a is an update, user = tenant admin, tenant = test-a
    const renamed = (await rowsFor(payload, 'tenants', tenantA.id)).at(-1)
    expect(renamed?.operation).toBe('update')
    expect(renamed?.user).toBe(tenantAdmin.id)
    expect(relationId(renamed?.tenant)).toBe(tenantA.id)
  })

  it('logs a user renaming themselves with no tenant', async () => {
    // arrange: a user the test creates (uniqueName, a row in test-a)
    const member = await createMember('audit-user-rename')
    const oldName = member.name
    const nextName = `${oldName} renamed`

    // act: they rename themselves (user: them, overrideAccess: false)
    await payload.update({
      collection: 'users',
      id: member.id,
      data: { name: nextName },
      user: member,
      overrideAccess: false,
    })

    // assert: the last users row is an update by them, tenant null, isChange(name, old, new)
    const nameRow = (await rowsFor(payload, 'users', member.id)).at(-1)
    expect(nameRow?.operation).toBe('update')
    expect(nameRow?.user).toBe(member.id)
    expect(relationId(nameRow?.tenant)).toBeNull()
    expect(isChange(changesOf(nameRow).name, oldName, nextName)).toBe(true)
  })

  describe('redaction', () => {
    it('shows a password change as password: "changed"', async () => {
      // arrange: a user the test creates
      const member = await createMember('audit-pw-changed')
      const newPassword = randomUUID()

      // act: they change their password to a random uuid
      await payload.update({
        collection: 'users',
        id: member.id,
        data: { password: newPassword },
        user: member,
        overrideAccess: false,
      })

      // assert: the last users row has changes.password === 'changed'
      const passwordRow = (await rowsFor(payload, 'users', member.id)).at(-1)
      expect(changesOf(passwordRow).password).toBe('changed')
    })

    it('stores no password, hash, salt, token or sessions', async () => {
      // arrange: a user the test creates
      const member = await createMember('audit-pw-secret')
      const newPassword = randomUUID()

      // act: they change their password to a random uuid
      await payload.update({
        collection: 'users',
        id: member.id,
        data: { password: newPassword },
        user: member,
        overrideAccess: false,
      })

      // assert: the row's JSON has no new password; keysOf(changes) has none of SECRET_KEYS
      // except `password`
      const passwordRow = (await rowsFor(payload, 'users', member.id)).at(-1)
      const passwordChanges = changesOf(passwordRow)
      expect(JSON.stringify(passwordRow ?? null)).not.toContain(newPassword)
      expect(
        keysOf(passwordChanges).every((key) => key === 'password' || !SECRET_KEYS.includes(key)),
      ).toBe(true)
    })
  })

  it('logs a write without a user with an empty user', async () => {
    // act: create a page with no user (overrideAccess, `context`)
    const noUserPage = await payload.create({
      collection: 'pages',
      data: pageData(uniqueName('audit-no-user'), tenantA.id),
      context,
    })

    // assert: one row for it, user null
    const noUserRows = await rowsFor(payload, 'pages', noUserPage.id)
    expect(noUserRows).toHaveLength(1)
    expect(noUserRows[0]?.user ?? null).toBeNull()
  })

  describe('collections not audited', () => {
    // one beforeAll: an analytics row in test-a, a form (as the tenant admin) and an anonymous
    // submission to it, a published post (synced to search); the rows checked are the ones written
    // since that beforeAll started
    let startedAt: string
    let submission: FormSubmission
    let post: Post

    beforeAll(async () => {
      startedAt = new Date().toISOString()
      const prefix = uniqueName('audit-unaudited')
      await payload.create({
        collection: 'analytics',
        data: {
          deviceType: 'desktop',
          pagePath: `/${prefix}`,
          eventType: 'page_view',
          timestamp: new Date().toISOString(),
          tenant: tenantA.id,
        },
      })
      const form = await payload.create({
        collection: 'forms',
        data: {
          _status: 'published',
          title: prefix,
          tenant: tenantA.id,
          confirmationType: 'message',
          confirmationMessage: richText(prefix),
          fields: [],
        },
        user: tenantAdmin,
        overrideAccess: false,
        context,
      })
      submission = await payload.create({
        collection: 'form-submissions',
        data: { form: form.id, submissionData: [] },
        overrideAccess: false,
      })
      post = await payload.create({
        collection: 'posts',
        data: {
          title: prefix,
          slug: prefix,
          tenant: tenantA.id,
          _status: 'published',
          content: richText(prefix),
        },
        user: tenantAdmin,
        overrideAccess: false,
        context,
      })
    })

    it('accepts an anonymous form submission', () => {
      // assert: the submission was created (overrideAccess: false, no user)
      expect(submission.id).toBeDefined()
    })

    it('syncs the post to search', async () => {
      // assert: one search doc for the post (doc.value = post id)
      const { totalDocs } = await payload.count({
        collection: 'search',
        where: { 'doc.value': { equals: post.id } },
      })
      expect(totalDocs).toBe(1)
    })

    it.each(['audit-logs', 'analytics', 'form-submissions', 'search'])(
      'writes no row about %s',
      async (slug) => {
        // assert: no row with that collectionSlug since the beforeAll started
        const rows = await rowsWhere(payload, {
          and: [
            { createdAt: { greater_than_equal: startedAt } },
            { collectionSlug: { equals: slug } },
          ],
        })
        expect(rows).toHaveLength(0)
      },
    )
  })

  it('logs deleting a business with no tenant', async () => {
    // the row can't point at a tenant deleted in the same transaction (foreign key)
    // arrange: a business the test creates (super user, skipHomePage), with its docs
    const superUser = await loadUser(payload, TEST_USERS.superUser)
    const slug = uniqueName('audit-del-tenant')
    const tenant = await payload.create({
      collection: 'tenants',
      data: { name: slug, slug },
      user: superUser,
      overrideAccess: false,
      context: { ...context, skipHomePage: true },
    })

    // act: delete its docs, then the tenant (cleanupAfterTenantDelete is off)
    await deleteBusiness(payload, tenant.id)

    // assert: one delete row for that tenant, tenant null
    const deleted: AuditLog[] = (await rowsFor(payload, 'tenants', tenant.id)).filter(
      (row) => row.operation === 'delete',
    )
    expect(deleted).toHaveLength(1)
    expect(relationId(deleted[0]?.tenant)).toBeNull()
  })
})
