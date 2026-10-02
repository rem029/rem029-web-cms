/**
 * Multi-tenancy test data: tenants, a home + about page per tenant, and test users.
 *
 *   pnpm seed:tenants
 *
 * - Idempotent: creates only what's missing and never overwrites existing docs.
 * - Refuses to run in production.
 * - Test users (`*@example.test`) log in with their email as the password, and are created only
 *   once a first (super) user exists. Existing test users get their password reset to it.
 */
import config from '@payload-config'
import type { Payload, RequiredDataFromCollectionSlug } from 'payload'
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

// header/footer/theme/settings are one doc per tenant. tenants created since phase 2 get empty ones
// from createTenantDocs; older tenants get them here. only empty docs are filled, so edits survive
const upsertTenantDocs = async (payload: Payload, tenant: Tenant, seed: SeedTenant) => {
  const findOrCreate = async <T extends 'header' | 'footer' | 'theme' | 'settings'>(slug: T) => {
    const { docs } = await payload.find({
      collection: slug,
      where: { tenant: { equals: tenant.id } },
      limit: 1,
      depth: 0,
    })
    if (docs[0]) return docs[0]
    payload.logger.info(`seed: created ${slug} for ${tenant.slug}`)
    // every field on these collections is optional, so the tenant alone is a valid doc
    const data = { tenant: tenant.id } as RequiredDataFromCollectionSlug<T>
    return payload.create({ collection: slug, data, context, depth: 0 })
  }

  const header = await findOrCreate('header')
  if (!header.navItems?.length) {
    const navItems = [
      { link: { type: 'custom' as const, label: `${seed.name.en} home`, url: '/' } },
      { link: { type: 'custom' as const, label: `About ${seed.name.en}`, url: '/about' } },
    ]
    await payload.update({ collection: 'header', id: header.id, data: { navItems }, context })
    payload.logger.info(`seed: filled header for ${tenant.slug}`)
  }

  await findOrCreate('footer')
  await findOrCreate('theme')

  const settings = await findOrCreate('settings')
  if (!settings.siteName || settings.siteName === 'CMS Website') {
    for (const locale of ['en', 'ar'] as const) {
      await payload.update({
        collection: 'settings',
        id: settings.id,
        locale,
        data: { siteName: seed.name[locale] },
        context,
      })
    }
    payload.logger.info(`seed: set site name for ${tenant.slug}`)
  }
}

const upsertUser = async (
  payload: Payload,
  seed: SeedUser,
  tenantsBySlug: Map<string, Tenant>,
  roleId: number | undefined,
) => {
  // test-only accounts: the email doubles as the password so anyone testing can log in
  const password = seed.email
  const { docs } = await payload.find({
    collection: 'users',
    where: { email: { equals: seed.email } },
    limit: 1,
    depth: 0,
  })
  if (docs[0]) {
    await payload.update({ collection: 'users', id: docs[0].id, data: { password } })
    payload.logger.info(`seed: reset password of ${seed.email} to its email`)
    return
  }

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
    await upsertTenantDocs(payload, tenant, seedTenant)

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
    await upsertUser(payload, user, tenantsBySlug, roles[0]?.id)
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
