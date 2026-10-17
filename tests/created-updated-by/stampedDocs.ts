/**
 * Shared setup for the created-updated-by tests: the collections whose writes must be stamped,
 * one doc per collection in a fresh business, and readers for the two fields.
 */
import { randomUUID } from 'crypto'

import type { CollectionSlug, Payload } from 'payload'

import { extractTenantId as relationId } from '@/common/utils/tenantCollections'
import type { Tenant } from '@/payload-types'

import { contentLayout, richText } from '../common/content'
import { uniqueName } from '../common/unique'
import { loadUser, type SessionUser } from '../common/users'

/**
 * The collections whose writes must be stamped (rem0003 requirement), kept independent of
 * `createdUpdatedByCollections`, so a collection missing from that list fails here.
 */
export const STAMPED: CollectionSlug[] = [
  'pages',
  'posts',
  'media',
  'header',
  'footer',
  'theme',
  'settings',
  'tenants',
  'users-access',
  'categories',
  'forms',
  'redirects',
  'users',
]

/** The stamped collections anonymous visitors can read (tenants, users-access, users: no). */
export const ANONYMOUS_READABLE: CollectionSlug[] = [
  'pages',
  'posts',
  'media',
  'header',
  'footer',
  'theme',
  'settings',
  'categories',
  'forms',
  'redirects',
]

/** Skips the Next cache revalidation hooks, which throw outside a Next request. */
export const context = { disableRevalidate: true }

export type AuditIds = { createdBy: number | null; updatedBy: number | null }

const AUDIT_FIELDS = ['createdBy', 'updatedBy'] as const

// a 1x1 transparent png, for the media doc
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
)

/** Both stamps of any collection's doc as ids; a missing or empty field reads as null. */
export const auditIds = (doc: object): AuditIds => ({
  createdBy: 'createdBy' in doc ? relationId(doc.createdBy) : null,
  updatedBy: 'updatedBy' in doc ? relationId(doc.updatedBy) : null,
})

/** True when the doc has neither field (as anonymous api readers get it). */
export const lacksAuditFields = (doc: object): boolean =>
  Object.entries(doc).every(
    ([key, value]) => !AUDIT_FIELDS.some((name) => name === key) || value === undefined,
  )

/**
 * A new business created by `superUser` (its header, footer, theme and settings come with it,
 * from createTenantDocs; no homepage), and its tenant admin (random password, never logged).
 */
export const createBusiness = async (
  payload: Payload,
  superUser: SessionUser,
): Promise<{ tenant: Tenant; tenantAdmin: SessionUser }> => {
  const name = uniqueName('cub')
  const tenant = await payload.create({
    collection: 'tenants',
    data: { name, slug: name },
    user: superUser,
    overrideAccess: false,
    context: { ...context, skipHomePage: true },
  })
  const email = `${name}-admin@example.test`
  await payload.create({
    collection: 'users',
    data: {
      email,
      name,
      password: randomUUID(),
      tenants: [{ tenant: tenant.id, isTenantAdmin: true }],
    },
  })
  return { tenant, tenantAdmin: await loadUser(payload, email) }
}

/**
 * One doc per STAMPED collection in `tenant`, written by `user` with `overrideAccess: false`, with
 * `extra` (e.g. forged createdBy/updatedBy) in each create's data. `docId(slug)` gives the doc of
 * each collection: `tenants` is the business itself, `users` a new member (default profile), whose
 * email and password are returned for a login.
 */
export const createStampedDocs = async (
  payload: Payload,
  options: { tenant: Tenant; user: SessionUser; extra?: Record<string, unknown> },
): Promise<{
  docId: (slug: CollectionSlug) => number
  memberEmail: string
  memberPassword: string
}> => {
  const { tenant, user, extra } = options
  const asUser = { user, overrideAccess: false, context }
  const name = uniqueName('cub-doc')
  const ids = new Map<CollectionSlug, number>([['tenants', tenant.id]])

  // tenants: its create already stamped it; update with `extra` so forged values are tested here too
  await payload.update({
    collection: 'tenants',
    id: tenant.id,
    data: { ...extra },
    ...asUser,
  })

  const page = await payload.create({
    collection: 'pages',
    data: {
      title: name,
      slug: name,
      tenant: tenant.id,
      _status: 'published',
      hero: { main: { type: 'none' } },
      layout: contentLayout(richText(name)),
      ...extra,
    },
    ...asUser,
  })
  ids.set('pages', page.id)

  const post = await payload.create({
    collection: 'posts',
    data: {
      title: name,
      slug: name,
      tenant: tenant.id,
      _status: 'published',
      content: richText(name),
      ...extra,
    },
    ...asUser,
  })
  ids.set('posts', post.id)

  const media = await payload.create({
    collection: 'media',
    data: { alt: name, tenant: tenant.id, ...extra },
    file: { data: PNG, mimetype: 'image/png', name: `${name}.png`, size: PNG.length },
    ...asUser,
  })
  ids.set('media', media.id)

  const usersAccess = await payload.create({
    collection: 'users-access',
    data: { name, slug: name, tenant: tenant.id, ...extra },
    ...asUser,
  })
  ids.set('users-access', usersAccess.id)

  const category = await payload.create({
    collection: 'categories',
    data: { title: name, tenant: tenant.id, ...extra },
    ...asUser,
  })
  ids.set('categories', category.id)

  const form = await payload.create({
    collection: 'forms',
    data: {
      // published: anonymous readers see published forms only
      _status: 'published',
      title: name,
      tenant: tenant.id,
      confirmationType: 'message',
      confirmationMessage: richText(name),
      ...extra,
    },
    ...asUser,
  })
  ids.set('forms', form.id)

  const redirect = await payload.create({
    collection: 'redirects',
    data: {
      from: `/${name}`,
      to: { type: 'custom', url: '/' },
      tenant: tenant.id,
      ...extra,
    },
    ...asUser,
  })
  ids.set('redirects', redirect.id)

  const memberEmail = `${name}-member@example.test`
  const memberPassword = randomUUID()
  const member = await payload.create({
    collection: 'users',
    data: {
      email: memberEmail,
      name,
      password: memberPassword,
      tenants: [{ tenant: tenant.id }],
      ...extra,
    },
    ...asUser,
  })
  ids.set('users', member.id)

  // header, footer, theme and settings were created with the business by createTenantDocs
  for (const slug of ['header', 'footer', 'theme', 'settings'] as const) {
    const { docs } = await payload.find({
      collection: slug,
      where: { tenant: { equals: tenant.id } },
      limit: 1,
      depth: 0,
    })
    if (docs[0]) ids.set(slug, docs[0].id)
  }

  return {
    docId: (slug) => {
      const id = ids.get(slug)
      if (id === undefined) throw new Error(`tests: no ${slug} doc`)
      return id
    },
    memberEmail,
    memberPassword,
  }
}
