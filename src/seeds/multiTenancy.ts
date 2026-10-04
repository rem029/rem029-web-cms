/**
 * Multi-tenancy test data: tenants, a home + about page and a `welcome` post per tenant (same slugs
 * everywhere, so a public page showing another tenant's doc is easy to spot), tenant2's homepage
 * set to its about page (tests Settings -> Homepage resolution vs. the slug `home` fallback), a
 * tenant1-only page and redirect, different active themes for tenant1 (Ocean) and tenant2 (Sunset,
 * other font), and test users.
 *
 *   pnpm seed
 *
 * - Idempotent: creates only what's missing and never overwrites existing docs.
 * - Never runs in production (src/seeds/index.ts refuses).
 * - Test users (`*@example.test`) log in with their email as the password, and are created only
 *   once a first (super) user exists. Existing test users get their password reset to it.
 */
import type { Payload, RequiredDataFromCollectionSlug } from 'payload'

import { DEFAULT_TENANT_SLUG } from '@/common/utils/defaultTenant'
import { defaultThemeCSS } from '@/utilities/defaults'
import type { Page, Tenant } from '@/payload-types'

type SeedTenant = {
  slug: string
  name: { en: string; ar: string }
  tagline: string
  // an active theme (name + --primary, optional extra css), so tenants look different
  theme?: { name: string; primary: string; extraCSS?: string }
}

// a profile (users-access slug) per tenant row (rem0001 phase 4)
type SeedUser = {
  email: string
  name: string
  memberships: { tenantSlug: string; profileSlug: string }[]
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
    theme: { name: 'Ocean', primary: '#1d4ed8' },
  },
  {
    slug: 'tenant2',
    name: { en: 'tenant2', ar: 'tenant2' },
    tagline: 'Sushi rolled to order.',
    theme: {
      name: 'Sunset',
      primary: '#b4232c',
      extraCSS: "* { font-family: 'Urbanist', sans-serif; }",
    },
  },
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
    memberships: [{ tenantSlug: tenant.slug, profileSlug: 'editor' }],
  })),
  {
    email: 'multi-editor@example.test',
    name: 'Editor of tenant1 + tenant2',
    memberships: [
      { tenantSlug: 'tenant1', profileSlug: 'editor' },
      { tenantSlug: 'tenant2', profileSlug: 'editor' },
    ],
  },
  {
    // different access per tenant: edits tenant1, reads tenant2, nothing in tenant3
    email: 'mixed@example.test',
    name: 'Editor in tenant1, viewer in tenant2',
    memberships: [
      { tenantSlug: 'tenant1', profileSlug: 'editor' },
      { tenantSlug: 'tenant2', profileSlug: 'viewer' },
    ],
  },
]

// pages are created outside next.js, so skip the revalidatePath hooks
const context = { disableRevalidate: true }

// non-null: the post content field is required, the content block column is optional
type RichText = NonNullable<
  NonNullable<
    Extract<Page['layout'][number], { blockType: 'content' }>['columns']
  >[number]['richText']
>

const text = (value: string) => ({
  type: 'text',
  text: value,
  version: 1,
  detail: 0,
  format: 0,
  mode: 'normal',
  style: '',
})

export const richText = (heading: string, ...paragraphs: string[]): RichText => ({
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

export const contentLayout = (content: RichText): Page['layout'] => [
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
    context: { ...context, skipHomePage: true },
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
  page: {
    slug: string
    title: { en: string; ar: string }
    content: RichText
    layout?: Page['layout']
  },
) => {
  const { docs } = await payload.find({
    collection: 'pages',
    where: { and: [{ tenant: { equals: tenant.id } }, { slug: { equals: page.slug } }] },
    limit: 1,
    depth: 0,
  })
  const existing = docs[0]
  if (existing) {
    // pages seeded before slugs were unlocked
    if (existing.slugLock !== false) {
      await payload.update({
        collection: 'pages',
        id: existing.id,
        // keep the status: without it the update saves the page as a draft
        data: { slugLock: false, slug: existing.slug, _status: existing._status },
        depth: 0,
        context,
      })
      payload.logger.info(`seed: unlocked slug of ${tenant.slug}/${page.slug}`)
    }
    return
  }

  const created = await payload.create({
    collection: 'pages',
    data: {
      title: page.title.en,
      slug: page.slug,
      // unlocked: a locked slug follows the title ("tenant1 — Home" → tenant1--home) once opened
      slugLock: false,
      tenant: tenant.id,
      hero: { main: { type: 'none' } },
      layout: page.layout ?? contentLayout(page.content),
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

const upsertPost = async (payload: Payload, tenant: Tenant, seed: SeedTenant) => {
  const slug = 'welcome'
  const { totalDocs } = await payload.count({
    collection: 'posts',
    where: { and: [{ tenant: { equals: tenant.id } }, { slug: { equals: slug } }] },
  })
  if (totalDocs > 0) return

  await payload.create({
    collection: 'posts',
    data: {
      title: `Welcome to ${seed.name.en}`,
      slug,
      tenant: tenant.id,
      content: richText(
        `Welcome to ${seed.name.en}`,
        `This post belongs to tenant "${seed.slug}".`,
      ),
      publishedAt: new Date().toISOString(),
      _status: 'published',
    },
    locale: 'en',
    context,
  })
  payload.logger.info(`seed: created post ${tenant.slug}/${slug}`)
}

// a tenant's contact form: submitting it on the tenant's host must create a tenant submission
const upsertContactForm = async (payload: Payload, tenant: Tenant): Promise<number> => {
  const title = `${tenant.slug} contact`
  const { docs } = await payload.find({
    collection: 'forms',
    where: { and: [{ tenant: { equals: tenant.id } }, { title: { equals: title } }] },
    limit: 1,
    depth: 0,
  })
  if (docs[0]) return docs[0].id

  const form = await payload.create({
    collection: 'forms',
    data: {
      title,
      tenant: tenant.id,
      fields: [{ blockType: 'email', name: 'email', label: 'Email', required: true }],
      confirmationType: 'message',
      confirmationMessage: richText('Thanks!'),
    },
    context,
  })
  payload.logger.info(`seed: created form ${title}`)
  return form.id
}

const upsertRedirect = async (payload: Payload, tenant: Tenant, from: string, url: string) => {
  const { totalDocs } = await payload.count({
    collection: 'redirects',
    where: { and: [{ tenant: { equals: tenant.id } }, { from: { equals: from } }] },
  })
  if (totalDocs > 0) return

  await payload.create({
    collection: 'redirects',
    data: { from, tenant: tenant.id, to: { type: 'custom', url } },
    context,
  })
  payload.logger.info(`seed: created redirect ${tenant.slug}${from} -> ${url}`)
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
  const theme = await findOrCreate('theme')
  if (seed.theme && !theme.themes?.length) {
    const css = defaultThemeCSS.replace('--primary: #102721', `--primary: ${seed.theme.primary}`)
    const themes = [
      {
        active: true,
        name: seed.theme.name,
        css: [css, seed.theme.extraCSS].filter(Boolean).join('\n'),
      },
    ]
    await payload.update({ collection: 'theme', id: theme.id, data: { themes }, context })
    payload.logger.info(`seed: set theme ${seed.theme.name} for ${tenant.slug}`)
  }

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
  profileIdsBySlug: Map<string, number>,
) => {
  const tenants = seed.memberships.flatMap(({ tenantSlug, profileSlug }) => {
    const tenant = tenantsBySlug.get(tenantSlug)
    const access = profileIdsBySlug.get(profileSlug)
    if (!tenant || !access) {
      throw new Error(
        `seed: tenant "${tenantSlug}" or profile "${profileSlug}" missing for ${seed.email}`,
      )
    }
    return [{ tenant: tenant.id, access }]
  })

  // test-only accounts: the email doubles as the password so anyone testing can log in
  const password = seed.email
  const { docs } = await payload.find({
    collection: 'users',
    where: { email: { equals: seed.email } },
    limit: 1,
    depth: 0,
  })
  if (docs[0]) {
    await payload.update({
      collection: 'users',
      id: docs[0].id,
      data: { password, tenants },
    })
    payload.logger.info(`seed: reset password and memberships of ${seed.email}`)
    return
  }

  await payload.create({
    collection: 'users',
    data: { email: seed.email, name: seed.name, password, tenants },
  })
  const summary = seed.memberships.map((m) => `${m.tenantSlug}:${m.profileSlug}`).join(', ')
  payload.logger.info(`seed: created user ${seed.email} (${summary})`)
}

export const seedMultiTenancy = async (payload: Payload) => {
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
    await upsertPost(payload, tenant, seedTenant)
  }

  // set tenant2's settings.homepage to its about page if empty (Settings -> Homepage resolution)
  const tenant2 = tenantsBySlug.get('tenant2')
  if (tenant2) {
    const { docs: settingsDocs } = await payload.find({
      collection: 'settings',
      where: { tenant: { equals: tenant2.id } },
      limit: 1,
      depth: 0,
    })
    const tenant2Settings = settingsDocs[0]
    if (tenant2Settings && !tenant2Settings.homepage) {
      const { docs: aboutPages } = await payload.find({
        collection: 'pages',
        where: {
          and: [{ tenant: { equals: tenant2.id } }, { slug: { equals: 'about' } }],
        },
        limit: 1,
        depth: 0,
      })
      const aboutPage = aboutPages[0]
      if (aboutPage) {
        await payload.update({
          collection: 'settings',
          id: tenant2Settings.id,
          data: { homepage: aboutPage.id },
          context,
        })
        payload.logger.info('seed: set tenant2 homepage to about page')
      }
    }
  }

  // only tenant1 has these: they must 404 on every other tenant's host
  const tenant1 = tenantsBySlug.get('tenant1')
  if (tenant1) {
    await upsertPage(payload, tenant1, {
      slug: 'tenant1-only',
      title: { en: 'Only in tenant1', ar: 'فقط في tenant1' },
      content: richText(
        'Only in tenant1',
        'If the admin site shows this page, isolation is broken.',
      ),
    })
    await upsertRedirect(payload, tenant1, '/tenant1-redirect', '/about')
    const formId = await upsertContactForm(payload, tenant1)
    await upsertPage(payload, tenant1, {
      slug: 'contact',
      title: { en: 'Contact tenant1', ar: 'اتصل بـ tenant1' },
      content: richText('Contact tenant1'),
      layout: [{ blockType: 'formBlock', form: formId }],
    })
  }

  // the first user becomes the super user (setupFirstUser), so that must be a real person
  if ((await payload.count({ collection: 'users' })).totalDocs === 0) {
    payload.logger.warn(
      'seed: no users yet, skipping test users. create your account at /admin first',
    )
    return
  }

  // platform profiles (on the admin tenant) come from the access seed, which runs first; slugs are
  // unique per tenant since rem0001 phase 5, so the tenant is part of the lookup
  const { docs: profiles } = await payload.find({
    collection: 'users-access',
    where: {
      and: [
        { slug: { in: ['editor', 'viewer'] } },
        { 'tenant.slug': { equals: DEFAULT_TENANT_SLUG } },
      ],
    },
    limit: 10,
    depth: 0,
  })
  const profileIdsBySlug = new Map(profiles.map((profile) => [profile.slug, profile.id]))
  for (const user of USERS) {
    await upsertUser(payload, user, tenantsBySlug, profileIdsBySlug)
  }
}
