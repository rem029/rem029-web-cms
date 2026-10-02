/**
 * Multi-tenancy test data: tenants, a home + about page per tenant, and test users.
 *
 *   pnpm seed:tenants
 *
 * - Idempotent: creates only what's missing and never overwrites existing docs.
 * - Refuses to run in production.
 * - Test users are created only when SEED_USER_PASSWORD is set (min 12 chars) and a first
 *   (super) user already exists. The password
 *   is never logged.
 */
import config from '@payload-config'
import type { Payload } from 'payload'
import { getPayload } from 'payload'

import { DEFAULT_TENANT_SLUG } from '@/common/utils/defaultTenant'
import type { Page, Tenant } from '@/payload-types'

type SeedTenant = {
  slug: string
  name: { en: string; ar: string }
  tagline: string
}

type SeedUser = {
  email: string
  name: string
  tenantSlugs: string[]
}

// business names match the slugs so tenants are easy to tell apart while testing
const TENANTS: SeedTenant[] = [
  {
    slug: DEFAULT_TENANT_SLUG,
    name: { en: 'Admin', ar: 'الإدارة' },
    tagline: 'The default tenant, served on the base domain.',
  },
  {
    slug: 'tenant1',
    name: { en: 'tenant1', ar: 'tenant1' },
    tagline: 'Fresh handmade pasta every day.',
  },
  { slug: 'tenant2', name: { en: 'tenant2', ar: 'tenant2' }, tagline: 'Sushi rolled to order.' },
  {
    slug: 'tenant3',
    name: { en: 'tenant3', ar: 'tenant3' },
    tagline: 'Street tacos and fresh salsa.',
  },
  {
    slug: 'tenant4',
    name: { en: 'tenant4', ar: 'tenant4' },
    tagline: 'Healthy bowls and smoothies.',
  },
]

const USERS: SeedUser[] = [
  ...TENANTS.map((tenant) => ({
    email: `${tenant.slug}-editor@example.test`,
    name: `${tenant.name.en} editor`,
    tenantSlugs: [tenant.slug],
  })),
  {
    email: 'multi-editor@example.test',
    name: 'Editor of tenant1 + tenant2',
    tenantSlugs: ['tenant1', 'tenant2'],
  },
]

// pages are created outside next.js, so skip the revalidatePath hooks
const context = { disableRevalidate: true }

type RichText = NonNullable<
  Extract<Page['layout'][number], { blockType: 'content' }>['columns']
>[number]['richText']

const text = (value: string) => ({
  type: 'text',
  text: value,
  version: 1,
  detail: 0,
  format: 0,
  mode: 'normal',
  style: '',
})

const richText = (heading: string, ...paragraphs: string[]): RichText => ({
  root: {
    type: 'root',
    version: 1,
    direction: 'ltr',
    format: '',
    indent: 0,
    children: [
      {
        type: 'heading',
        tag: 'h2',
        version: 1,
        direction: 'ltr',
        format: '',
        indent: 0,
        children: [text(heading)],
      },
      ...paragraphs.map((paragraph) => ({
        type: 'paragraph',
        version: 1,
        direction: 'ltr' as const,
        format: '' as const,
        indent: 0,
        children: [text(paragraph)],
      })),
    ],
  },
})

const contentLayout = (content: RichText): Page['layout'] => [
  { blockType: 'content', columns: [{ size: 'full', richText: content }] },
]

const upsertTenant = async (payload: Payload, seed: SeedTenant): Promise<Tenant> => {
  const { docs } = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: seed.slug } },
    limit: 1,
    depth: 0,
  })
  if (docs[0]) return docs[0]

  const tenant = await payload.create({
    collection: 'tenants',
    data: { name: seed.name.en, slug: seed.slug },
    locale: 'en',
  })
  await payload.update({
    collection: 'tenants',
    id: tenant.id,
    data: { name: seed.name.ar },
    locale: 'ar',
  })
  payload.logger.info(`seed: created tenant ${seed.slug}`)
  return tenant
}

const upsertPage = async (
  payload: Payload,
  tenant: Tenant,
  page: { slug: string; title: { en: string; ar: string }; content: RichText },
) => {
  const { totalDocs } = await payload.count({
    collection: 'pages',
    where: { and: [{ tenant: { equals: tenant.id } }, { slug: { equals: page.slug } }] },
  })
  if (totalDocs > 0) return

  const created = await payload.create({
    collection: 'pages',
    data: {
      title: page.title.en,
      slug: page.slug,
      tenant: tenant.id,
      hero: { main: { type: 'none' } },
      layout: contentLayout(page.content),
      publishedAt: new Date().toISOString(),
      _status: 'published',
    },
    locale: 'en',
    context,
  })
  await payload.update({
    collection: 'pages',
    id: created.id,
    data: { title: page.title.ar },
    locale: 'ar',
    context,
  })
  payload.logger.info(`seed: created page ${tenant.slug}/${page.slug}`)
}

const upsertUser = async (
  payload: Payload,
  seed: SeedUser,
  password: string,
  tenantsBySlug: Map<string, Tenant>,
  roleId: number | undefined,
) => {
  const { totalDocs } = await payload.count({
    collection: 'users',
    where: { email: { equals: seed.email } },
  })
  if (totalDocs > 0) return

  const tenants = seed.tenantSlugs.flatMap((slug) => {
    const tenant = tenantsBySlug.get(slug)
    return tenant ? [{ tenant: tenant.id }] : []
  })

  await payload.create({
    collection: 'users',
    data: { email: seed.email, name: seed.name, password, role: roleId, tenants },
  })
  payload.logger.info(`seed: created user ${seed.email} (${seed.tenantSlugs.join(', ')})`)
}

const seed = async (payload: Payload) => {
  const tenantsBySlug = new Map<string, Tenant>()
  for (const seedTenant of TENANTS) {
    const tenant = await upsertTenant(payload, seedTenant)
    tenantsBySlug.set(seedTenant.slug, tenant)

    await upsertPage(payload, tenant, {
      slug: 'home',
      title: { en: `${seedTenant.name.en} — Home`, ar: `${seedTenant.name.ar} — الرئيسية` },
      content: richText(
        `Welcome to ${seedTenant.name.en}`,
        seedTenant.tagline,
        `This page belongs to tenant "${seedTenant.slug}". If another tenant shows it, isolation is broken.`,
      ),
    })
    await upsertPage(payload, tenant, {
      slug: 'about',
      title: { en: `About ${seedTenant.name.en}`, ar: `عن ${seedTenant.name.ar}` },
      content: richText(
        `About ${seedTenant.name.en}`,
        `${seedTenant.name.en} is a demo business for testing multi-tenancy (tenant "${seedTenant.slug}").`,
      ),
    })
  }

  const password = process.env.SEED_USER_PASSWORD
  if (!password || password.length < 12) {
    payload.logger.warn('seed: SEED_USER_PASSWORD not set (min 12 chars), skipping test users')
    return
  }

  // the first user becomes the super user (setupFirstUser), so that must be a real person
  if ((await payload.count({ collection: 'users' })).totalDocs === 0) {
    payload.logger.warn(
      'seed: no users yet, skipping test users. create your account at /admin first',
    )
    return
  }

  // the "admin" role from the roles migration; phase 3 replaces this with per-tenant access
  const { docs: roles } = await payload.find({
    collection: 'roles',
    where: { slug: { equals: 'admin' } },
    limit: 1,
    depth: 0,
  })
  for (const user of USERS) {
    await upsertUser(payload, user, password, tenantsBySlug, roles[0]?.id)
  }
}

if (process.env.NODE_ENV === 'production') {
  console.error('seed: refusing to run with NODE_ENV=production')
  process.exit(1)
}

const payload = await getPayload({ config })
try {
  await seed(payload)
  payload.logger.info('seed: multi-tenancy seed done')
  process.exit(0)
} catch (err) {
  payload.logger.error({ msg: 'seed: multi-tenancy seed failed', err })
  process.exit(1)
}
