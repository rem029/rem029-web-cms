/**
 * Checks access templates (rem0001 phase 7 chunk 2):
 * - Templates exist on admin tenant with isTemplate true: pages-editor, pages-viewer, default
 * - editor1@ (pages-editor in tenant1): can manage tenant1 pages, media create resolver true,
 *   cannot create post/category, cannot update header, adminAccess true
 * - owner@: reads templates, cannot update/delete templates, cannot set isTemplate true on tenant1 profile
 * - superUser: setting isTemplate on tenant1 profile is refused by guardTemplateTenant hook
 * - owner@ can assign pages-viewer to tenant1 member row, cannot assign tenant2-made profile to tenant1 row
 * - Migration data idempotency: count of template profiles on admin tenant is exactly 2
 *
 *   pnpm payload run scripts/verify/accessTemplates.ts
 *   or: pnpm verify
 *
 * Local API with `overrideAccess: false`. Cleans up what it creates (`verify-at-…`).
 * Refuses to run in production.
 */
import config from '@payload-config'
import { getPayload } from 'payload'

import { accessCheckResolver, adminAccess } from '@/common/utils/access'
import { DEFAULT_ACCESS_SLUG } from '@/collections/UsersAccess/utils/defaultProfile'
import { DEFAULT_TENANT_SLUG } from '@/common/utils/defaultTenant'
import {
  PAGES_EDITOR_TEMPLATE,
  PAGES_VIEWER_TEMPLATE,
} from '@/collections/UsersAccess/utils/templates'
import type { Post, Tenant } from '@/payload-types'
import { contentLayout, richText } from '@/seeds/multiTenancy'
import {
  adminTenantIdOf,
  asSessionUser,
  createChecker,
  isRefused,
  loadUser,
  reqFor,
  statusOf,
  succeeds,
} from './lib/verifyKit'

if (process.env.NODE_ENV === 'production') {
  console.error('verify: refusing to run with NODE_ENV=production')
  process.exit(1)
}

const payload = await getPayload({ config })
const { check, failures } = createChecker(payload)

const PREFIX = 'verify-at'
const context = { disableRevalidate: true }
const TEST_MEMBER_EMAIL = `${PREFIX}-member@example.test`

const cleanup = async (): Promise<void> => {
  await payload.delete({
    collection: 'pages',
    where: { slug: { like: `${PREFIX}-` } },
    overrideAccess: true,
    context,
  })
  await payload.delete({
    collection: 'users',
    where: { email: { equals: TEST_MEMBER_EMAIL } },
    overrideAccess: true,
  })
  // a failed hook check would leave a tenant profile marked as a template
  await payload.update({
    collection: 'users-access',
    where: {
      and: [
        { isTemplate: { equals: true } },
        { 'tenant.slug': { not_equals: DEFAULT_TENANT_SLUG } },
      ],
    },
    data: { isTemplate: false },
    overrideAccess: true,
  })
}

const findTenant = async (slug: string): Promise<Tenant> => {
  const { docs } = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (!docs[0]) throw new Error(`verify: tenant ${slug} not found, run pnpm seed`)
  return docs[0]
}

const postContent = (value: string): Post['content'] => ({
  root: {
    type: 'root',
    version: 1,
    direction: 'ltr',
    format: '',
    indent: 0,
    children: [
      {
        type: 'paragraph',
        version: 1,
        direction: 'ltr',
        format: '',
        indent: 0,
        children: [
          {
            type: 'text',
            text: value,
            version: 1,
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
          },
        ],
      },
    ],
  },
})

const isValidationError = async (fn: () => Promise<unknown>, text: string): Promise<boolean> => {
  try {
    await fn()
    return false
  } catch (err) {
    const errors =
      err &&
      typeof err === 'object' &&
      'data' in err &&
      typeof err.data === 'object' &&
      err.data !== null &&
      'errors' in err.data &&
      Array.isArray(err.data.errors)
        ? err.data.errors
        : []
    const messages = errors.map((e: unknown) =>
      typeof e === 'object' && e !== null && 'message' in e && typeof e.message === 'string'
        ? e.message
        : '',
    )
    return statusOf(err) === 400 && messages.some((message) => message.includes(text))
  }
}

try {
  const editor1 = await loadUser(payload, 'editor1@example.test')
  const owner = await loadUser(payload, 'owner@example.test')

  const { docs: superUsers } = await payload.find({
    collection: 'users',
    where: { super_user: { equals: true } },
    limit: 1,
    depth: 2,
    overrideAccess: true,
  })
  if (!superUsers[0]) throw new Error('verify: no super user found')
  const superUser = asSessionUser(superUsers[0])

  const tenant1 = await findTenant('tenant1')
  const tenant2 = await findTenant('tenant2')
  const adminTenantId = await adminTenantIdOf(payload)

  await cleanup()

  // 1. Templates exist on the admin tenant with isTemplate true
  const { docs: templateDocs } = await payload.find({
    collection: 'users-access',
    where: {
      and: [
        { slug: { in: [PAGES_EDITOR_TEMPLATE, PAGES_VIEWER_TEMPLATE, DEFAULT_ACCESS_SLUG] } },
        { tenant: { equals: adminTenantId } },
      ],
    },
    depth: 0,
    overrideAccess: true,
  })

  const pagesEditor = templateDocs.find((d) => d.slug === PAGES_EDITOR_TEMPLATE)
  const pagesViewer = templateDocs.find((d) => d.slug === PAGES_VIEWER_TEMPLATE)
  const defaultProfile = templateDocs.find((d) => d.slug === DEFAULT_ACCESS_SLUG)

  check(
    'templates: pages-editor exists on admin tenant with isTemplate true',
    pagesEditor?.isTemplate === true,
  )
  check(
    'templates: pages-viewer exists on admin tenant with isTemplate true',
    pagesViewer?.isTemplate === true,
  )
  check(
    'templates: default exists on admin tenant with isTemplate true',
    defaultProfile?.isTemplate === true,
  )

  if (!pagesEditor || !pagesViewer || !defaultProfile) {
    throw new Error('verify: platform templates not found on admin tenant')
  }

  // 2. editor1@ (pages-editor in tenant1) checks
  const editor1Pages = await payload.find({
    collection: 'pages',
    where: { tenant: { equals: tenant1.id } },
    user: editor1,
    overrideAccess: false,
  })
  check('editor1@: can find tenant1 pages', editor1Pages.totalDocs > 0)

  let createdPageId: number | null = null
  check(
    'editor1@: can create tenant1 page',
    await succeeds(payload, async () => {
      const doc = await payload.create({
        collection: 'pages',
        data: {
          title: `${PREFIX}-editor1-page`,
          slug: `${PREFIX}-editor1-page`,
          tenant: tenant1.id,
          hero: { main: { type: 'none' } },
          layout: contentLayout(richText('Template editor test')),
        },
        user: editor1,
        overrideAccess: false,
        context,
      })
      createdPageId = doc.id
    }),
  )

  if (createdPageId !== null) {
    const pageId = createdPageId
    check(
      'editor1@: can update tenant1 page',
      await succeeds(payload, () =>
        payload.update({
          collection: 'pages',
          id: pageId,
          data: {
            title: `${PREFIX}-editor1-page-updated`,
            slug: `${PREFIX}-editor1-page`,
          },
          user: editor1,
          overrideAccess: false,
          context,
        }),
      ),
    )

    check(
      'editor1@: can delete tenant1 page',
      await succeeds(payload, () =>
        payload.delete({
          collection: 'pages',
          id: pageId,
          user: editor1,
          overrideAccess: false,
          context,
        }),
      ),
    )
  }

  const editor1Req = await reqFor(payload, editor1)
  const canCreateMedia = accessCheckResolver('media', 'create')
  const mediaCreateResult = await canCreateMedia({
    req: editor1Req,
    data: { tenant: tenant1.id },
  })
  check(
    'editor1@: accessCheckResolver("media", "create") is true for tenant1',
    mediaCreateResult === true,
  )

  check(
    'editor1@: cannot create post in tenant1',
    await isRefused(
      payload,
      () =>
        payload.create({
          collection: 'posts',
          data: {
            title: `${PREFIX}-editor1-post`,
            slug: `${PREFIX}-editor1-post`,
            tenant: tenant1.id,
            content: postContent('Post test'),
          },
          user: editor1,
          overrideAccess: false,
          context,
        }),
      [403],
    ),
  )

  check(
    'editor1@: cannot create category in tenant1',
    await isRefused(
      payload,
      () =>
        payload.create({
          collection: 'categories',
          data: {
            title: `${PREFIX}-editor1-category`,
            tenant: tenant1.id,
          },
          user: editor1,
          overrideAccess: false,
          context,
        }),
      [403],
    ),
  )

  const { docs: t1Headers } = await payload.find({
    collection: 'header',
    where: { tenant: { equals: tenant1.id } },
    limit: 1,
    overrideAccess: true,
  })
  if (!t1Headers[0]) throw new Error('verify: tenant1 header not found')
  const t1Header = t1Headers[0]

  check(
    'editor1@: cannot update tenant1 header',
    await isRefused(
      payload,
      () =>
        payload.update({
          collection: 'header',
          id: t1Header.id,
          data: { navItems: [] },
          user: editor1,
          overrideAccess: false,
          context,
        }),
      [403, 404],
    ),
  )

  check('editor1@: adminAccess({ req }) is true', adminAccess({ req: editor1Req }) === true)

  // 3. owner@ (tenant admin tenant1+tenant2) checks
  const ownerTemplates = await payload.find({
    collection: 'users-access',
    where: {
      slug: { in: [PAGES_EDITOR_TEMPLATE, PAGES_VIEWER_TEMPLATE, DEFAULT_ACCESS_SLUG] },
    },
    user: owner,
    overrideAccess: false,
  })
  check('owner@: reads the 3 templates', ownerTemplates.totalDocs === 3)

  check(
    'owner@: cannot update pages-editor template',
    await isRefused(
      payload,
      () =>
        payload.update({
          collection: 'users-access',
          id: pagesEditor.id,
          data: { name: 'Attempted Renamed Template' },
          user: owner,
          overrideAccess: false,
        }),
      [403, 404],
    ),
  )

  check(
    'owner@: cannot delete pages-editor template',
    await isRefused(
      payload,
      () =>
        payload.delete({
          collection: 'users-access',
          id: pagesEditor.id,
          user: owner,
          overrideAccess: false,
        }),
      [403, 404],
    ),
  )

  const { docs: t1Profiles } = await payload.find({
    collection: 'users-access',
    where: {
      and: [{ slug: { equals: 'editor' } }, { tenant: { equals: tenant1.id } }],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (!t1Profiles[0]) throw new Error('verify: tenant1 editor profile not found')
  const t1EditorProfile = t1Profiles[0]

  await payload.update({
    collection: 'users-access',
    id: t1EditorProfile.id,
    data: { isTemplate: true },
    user: owner,
    overrideAccess: false,
  })

  const reloadedT1Profile = await payload.findByID({
    collection: 'users-access',
    id: t1EditorProfile.id,
    depth: 0,
    overrideAccess: true,
  })
  check(
    'owner@: cannot set isTemplate true on tenant1 profile (stripped by field access)',
    reloadedT1Profile.isTemplate === false,
  )

  check(
    'super user: setting isTemplate on tenant1 profile is refused by guardTemplateTenant hook',
    await isValidationError(
      () =>
        payload.update({
          collection: 'users-access',
          id: t1EditorProfile.id,
          data: { isTemplate: true },
          user: superUser,
          overrideAccess: false,
        }),
      'Only profiles of the platform business (admin) can be templates.',
    ),
  )

  // 4. owner@ assigns template vs foreign profile to tenant1 member row
  let testUserId: number | null = null
  check(
    'owner@: can assign pages-viewer template to a tenant1 member row',
    await succeeds(payload, async () => {
      const created = await payload.create({
        collection: 'users',
        data: {
          email: TEST_MEMBER_EMAIL,
          name: 'Verify AT Member',
          password: TEST_MEMBER_EMAIL,
          tenants: [{ tenant: tenant1.id, access: pagesViewer.id }],
        },
        user: owner,
        overrideAccess: false,
      })
      testUserId = created.id
    }),
  )

  const { docs: t2Profiles } = await payload.find({
    collection: 'users-access',
    where: {
      and: [{ slug: { equals: 'editor' } }, { tenant: { equals: tenant2.id } }],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (!t2Profiles[0]) throw new Error('verify: tenant2 editor profile not found')
  const t2EditorProfile = t2Profiles[0]

  if (testUserId !== null) {
    const targetUserId = testUserId
    check(
      'owner@: cannot assign tenant2-made profile to tenant1 row',
      await isRefused(
        payload,
        () =>
          payload.update({
            collection: 'users',
            id: targetUserId,
            data: {
              tenants: [{ tenant: tenant1.id, access: t2EditorProfile.id }],
            },
            user: owner,
            overrideAccess: false,
          }),
        [403],
      ),
    )
  }

  // 5. Migration data idempotency check
  const templateCount = await payload.count({
    collection: 'users-access',
    where: {
      and: [
        { slug: { in: [PAGES_EDITOR_TEMPLATE, PAGES_VIEWER_TEMPLATE] } },
        { tenant: { equals: adminTenantId } },
      ],
    },
    overrideAccess: true,
  })
  check(
    'migration data idempotency: count of template profiles on admin tenant is exactly 2',
    templateCount.totalDocs === 2,
  )
} catch (err) {
  check('no crash', false)
  payload.logger.error({ msg: 'verify: accessTemplates crashed', err })
} finally {
  await cleanup()
}

if (failures() > 0) {
  payload.logger.error(`verify: accessTemplates ${failures()} check(s) failed`)
  process.exit(1)
}
payload.logger.info('verify: accessTemplates all checks passed')
process.exit(0)
