/**
 * Hidden documents (rem0001 phase 6): two hidden pages in tenant1, created by `editor1@` with
 * `editor2@` in "Visible to". `editor3@` (also a tenant1 editor) can't see either of them.
 *
 * - `new-lunch-menu-hidden-draft`: a draft, hidden (members without access don't see it anywhere)
 * - `hidden-but-published`: published and hidden (still public on the site, hidden in the admin)
 *
 *   pnpm seed
 *
 * Slugs match the titles (the admin's locked slug follows the title). Runs after `tenantAccess`
 * (it needs the editors). Upserts by tenant + slug; re-running resets
 * `isHidden`/`visibleTo` to the values below.
 */
import type { Payload } from 'payload'

import type { User } from '@/payload-types'
import { contentLayout, richText } from './multiTenancy'

// pages are created outside next.js, so skip the revalidatePath hooks
const context = { disableRevalidate: true }

const PAGES = [
  {
    slug: 'new-lunch-menu-hidden-draft',
    title: 'New lunch menu (hidden draft)',
    status: 'draft' as const,
  },
  {
    slug: 'hidden-but-published',
    title: 'Hidden but published',
    status: 'published' as const,
  },
]

const findUser = async (payload: Payload, email: string): Promise<User> => {
  const { docs } = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
    depth: 1,
  })
  if (!docs[0]) throw new Error(`seed: ${email} not found; run tenantAccess first`)
  return docs[0]
}

export const seedHiddenDocuments = async (payload: Payload): Promise<void> => {
  const { docs: tenants } = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: 'tenant1' } },
    limit: 1,
    depth: 0,
  })
  const tenant = tenants[0]
  if (!tenant) throw new Error('seed: tenant1 not found; run multiTenancy first')

  const creator = await findUser(payload, 'editor1@example.test')
  const viewer = await findUser(payload, 'editor2@example.test')

  for (const page of PAGES) {
    const { docs } = await payload.find({
      collection: 'pages',
      where: { and: [{ tenant: { equals: tenant.id } }, { slug: { equals: page.slug } }] },
      limit: 1,
      depth: 0,
    })

    if (docs[0]) {
      await payload.update({
        collection: 'pages',
        id: docs[0].id,
        data: { slug: page.slug, isHidden: true, visibleTo: [viewer.id], _status: page.status },
        draft: page.status === 'draft',
        context,
      })
      payload.logger.info(`seed: reset hidden page ${page.slug}`)
      continue
    }

    // as editor1@, so setCreatedUpdatedBy makes them the creator
    await payload.create({
      collection: 'pages',
      user: creator,
      data: {
        title: page.title,
        slug: page.slug,
        tenant: tenant.id,
        hero: { main: { type: 'none' } },
        layout: contentLayout(richText(page.title, 'Only some members of tenant1 can see this.')),
        isHidden: true,
        visibleTo: [viewer.id],
        _status: page.status,
        ...(page.status === 'published' ? { publishedAt: new Date().toISOString() } : {}),
      },
      draft: page.status === 'draft',
      locale: 'en',
      context,
    })
    payload.logger.info(`seed: created hidden page ${page.slug}`)
  }
}
