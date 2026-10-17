/**
 * Public site content (`TEST_CONTENT`, `TEST_THEMES`) for the tenant-frontend tests:
 * - admin: a published `home` page (no homepage picked in Settings, so `/` falls back to it), the
 *   `welcome` post and a redirect
 * - test-a: the `welcome` post, a page and a redirect only it has, a custom domain, theme Ocean
 * - test-b: the `welcome` post, an `about` page picked as its homepage, theme Sunset (other font)
 * test-a and test-b already have a published `home` page set as their homepage (`createTenantDocs`).
 */
import type { Payload, RequiredDataFromCollectionSlug, Where } from 'payload'

import { DEFAULT_TENANT_SLUG } from '@/common/utils/defaultTenant'
import { defaultThemeCSS } from '@/utilities/defaults'

import { contentLayout, richText } from '../content'
import { findTenant } from '../tenants'
import { TEST_CONTENT, TEST_THEMES, type TenantIds } from './fixtures'

// seeds run outside next.js: skip the revalidatePath hooks
const context = { disableRevalidate: true }

const inTenant = (tenantId: number, where: Where): Where => ({
  and: [{ tenant: { equals: tenantId } }, where],
})

const upsertPage = async (payload: Payload, tenantId: number, slug: string): Promise<number> => {
  const { docs } = await payload.find({
    collection: 'pages',
    where: inTenant(tenantId, { slug: { equals: slug } }),
    limit: 1,
    depth: 0,
  })
  const data: RequiredDataFromCollectionSlug<'pages'> = {
    title: slug,
    slug,
    slugLock: false,
    tenant: tenantId,
    hero: { main: { type: 'none' } },
    layout: contentLayout(richText(slug, `Page ${slug} of tenant ${tenantId}.`)),
    publishedAt: new Date().toISOString(),
    _status: 'published',
  }

  if (docs[0]) {
    const updated = await payload.update({ collection: 'pages', id: docs[0].id, data, context })
    payload.logger.info(`test seed: updated page ${tenantId}/${slug}`)
    return updated.id
  }

  const created = await payload.create({ collection: 'pages', data, context })
  payload.logger.info(`test seed: created page ${tenantId}/${slug}`)
  return created.id
}

const upsertWelcomePost = async (payload: Payload, tenantId: number): Promise<void> => {
  const slug = TEST_CONTENT.welcomePost
  const { docs } = await payload.find({
    collection: 'posts',
    where: inTenant(tenantId, { slug: { equals: slug } }),
    limit: 1,
    depth: 0,
  })
  const data: RequiredDataFromCollectionSlug<'posts'> = {
    title: `Welcome to tenant ${tenantId}`,
    slug,
    tenant: tenantId,
    content: richText('Welcome', `This post belongs to tenant ${tenantId}.`),
    publishedAt: new Date().toISOString(),
    _status: 'published',
  }

  if (docs[0]) {
    await payload.update({ collection: 'posts', id: docs[0].id, data, context })
    payload.logger.info(`test seed: updated post ${tenantId}/${slug}`)
    return
  }

  await payload.create({ collection: 'posts', data, context })
  payload.logger.info(`test seed: created post ${tenantId}/${slug}`)
}

const upsertRedirect = async (payload: Payload, tenantId: number, from: string): Promise<void> => {
  const { totalDocs } = await payload.count({
    collection: 'redirects',
    where: inTenant(tenantId, { from: { equals: from } }),
  })
  if (totalDocs > 0) return

  await payload.create({
    collection: 'redirects',
    data: { from, tenant: tenantId, to: { type: 'custom', url: '/' } },
    context,
  })
  payload.logger.info(`test seed: created redirect ${tenantId}${from}`)
}

// the tenant's one settings / theme doc (createTenantDocs or the migrations made it)
const tenantDocId = async (
  payload: Payload,
  collection: 'settings' | 'theme',
  tenantId: number,
): Promise<number> => {
  const { docs } = await payload.find({
    collection,
    where: { tenant: { equals: tenantId } },
    limit: 1,
    depth: 0,
  })
  if (!docs[0]) {
    throw new Error(`test seed: no ${collection} doc in tenant ${tenantId}`)
  }
  return docs[0].id
}

const setActiveTheme = async (
  payload: Payload,
  tenantId: number,
  theme: { name: string; primary: string; font?: string },
): Promise<void> => {
  const css = defaultThemeCSS.replace('--primary: #102721', `--primary: ${theme.primary}`)
  const fontCSS = theme.font ? `* { font-family: '${theme.font}', sans-serif; }` : ''
  await payload.update({
    collection: 'theme',
    id: await tenantDocId(payload, 'theme', tenantId),
    data: { themes: [{ active: true, name: theme.name, css: [css, fontCSS].join('\n') }] },
    context,
  })
  payload.logger.info(`test seed: set theme ${theme.name} for tenant ${tenantId}`)
}

export const seedTestContent = async (payload: Payload, tenants: TenantIds): Promise<void> => {
  const admin = await findTenant(payload, DEFAULT_TENANT_SLUG)

  await upsertPage(payload, admin.id, 'home')
  await upsertWelcomePost(payload, admin.id)
  await upsertRedirect(payload, admin.id, TEST_CONTENT.redirectInAdmin)

  await upsertWelcomePost(payload, tenants.a)
  await upsertPage(payload, tenants.a, TEST_CONTENT.onlyInA)
  await upsertRedirect(payload, tenants.a, TEST_CONTENT.redirectInA)
  await payload.update({
    collection: 'tenants',
    id: tenants.a,
    data: { domains: [{ domain: TEST_CONTENT.domainOfA }] },
    context,
  })
  await setActiveTheme(payload, tenants.a, TEST_THEMES.a)

  await upsertWelcomePost(payload, tenants.b)
  const aboutB = await upsertPage(payload, tenants.b, TEST_CONTENT.homepageOfB)
  await payload.update({
    collection: 'settings',
    id: await tenantDocId(payload, 'settings', tenants.b),
    data: { homepage: aboutB },
    context,
  })
  await setActiveTheme(payload, tenants.b, TEST_THEMES.b)
  payload.logger.info('test seed: public site content done')
}
