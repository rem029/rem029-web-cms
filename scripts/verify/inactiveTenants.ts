/**
 * Checks inactive tenants (rem0001 phase 7):
 * Inactive tenants (isActive: false) are read-only for their members on tenant collections
 * and tenants collection updates. Super users are unaffected.
 *
 *   pnpm payload run scripts/verify/inactiveTenants.ts
 *   or: pnpm verify
 *
 * Local API with `overrideAccess: false`. Cleans up what it creates (`verify-it-…`).
 * Refuses to run in production.
 */
import config from '@payload-config'
import { getPayload } from 'payload'

import { accessCheckResolver } from '@/common/utils/access'
import { extractTenantId } from '@/common/utils/tenantCollections'
import type { Tenant } from '@/payload-types'
import { contentLayout, richText } from '@/seeds/multiTenancy'
import {
  asSessionUser,
  createChecker,
  isRefused,
  loadUser,
  reqFor,
  succeeds,
} from './lib/verifyKit'

if (process.env.NODE_ENV === 'production') {
  console.error('verify: refusing to run with NODE_ENV=production')
  process.exit(1)
}

const payload = await getPayload({ config })
const { check, failures } = createChecker(payload)

const PREFIX = 'verify-it'
const context = { disableRevalidate: true }

const cleanup = async (): Promise<void> => {
  await payload.delete({
    collection: 'pages',
    where: { slug: { like: `${PREFIX}-` } },
    overrideAccess: true,
    context,
  })
  await payload.delete({
    collection: 'categories',
    where: { title: { like: `${PREFIX}-` } },
    overrideAccess: true,
    context,
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

try {
  const member3 = await loadUser(payload, 'member3@example.test')
  const admin3 = await loadUser(payload, 'admin3@example.test')
  const editor1 = await loadUser(payload, 'editor1@example.test')

  const { docs: superUsers } = await payload.find({
    collection: 'users',
    where: { super_user: { equals: true } },
    limit: 1,
    depth: 2,
    overrideAccess: true,
  })
  if (!superUsers[0]) throw new Error('verify: no super user found')
  const superUser = asSessionUser(superUsers[0])

  const tenant3 = await findTenant('tenant3')
  const tenant1 = await findTenant('tenant1')

  await cleanup()

  // 1. Seed checks
  check('seed: tenant3 is inactive', tenant3.isActive === false)
  const member3Row = member3.tenants?.find((r) => extractTenantId(r.tenant) === tenant3.id)
  check('seed: member3@ has tenant3 row', Boolean(member3Row))
  const admin3Row = admin3.tenants?.find(
    (r) => extractTenantId(r.tenant) === tenant3.id && r.isTenantAdmin === true,
  )
  check('seed: admin3@ has tenant3 row', Boolean(admin3Row))

  // 2. member3@ (editor profile) checks
  const member3Pages = await payload.find({
    collection: 'pages',
    where: { tenant: { equals: tenant3.id } },
    user: member3,
    overrideAccess: false,
  })
  check('member3@: can find tenant3 pages', member3Pages.totalDocs > 0)
  const page3 = member3Pages.docs[0]
  if (!page3) throw new Error('verify: no tenant3 page found for testing')
  const originalPage3Title = page3.title
  // the slug regenerates from the title unless it is sent too

  check(
    'member3@: can read tenant3 header',
    await succeeds(payload, async () => {
      const headers = await payload.find({
        collection: 'header',
        where: { tenant: { equals: tenant3.id } },
        user: member3,
        overrideAccess: false,
      })
      if (headers.totalDocs === 0) throw new Error('no header found')
    }),
  )

  const member3Headers = await payload.find({
    collection: 'header',
    where: { tenant: { equals: tenant3.id } },
    user: member3,
    overrideAccess: false,
  })
  const header3 = member3Headers.docs[0]
  if (!header3) throw new Error('verify: no tenant3 header found for testing')

  check(
    'member3@: can read tenant3 theme',
    await succeeds(payload, async () => {
      const themes = await payload.find({
        collection: 'theme',
        where: { tenant: { equals: tenant3.id } },
        user: member3,
        overrideAccess: false,
      })
      if (themes.totalDocs === 0) throw new Error('no theme found')
    }),
  )

  check(
    'member3@: can read tenant3 settings',
    await succeeds(payload, async () => {
      const settings = await payload.find({
        collection: 'settings',
        where: { tenant: { equals: tenant3.id } },
        user: member3,
        overrideAccess: false,
      })
      if (settings.totalDocs === 0) throw new Error('no settings found')
    }),
  )

  check(
    'member3@: cannot create page in tenant3',
    await isRefused(
      payload,
      () =>
        payload.create({
          collection: 'pages',
          data: {
            title: `${PREFIX}-page-m3`,
            slug: `${PREFIX}-page-m3`,
            tenant: tenant3.id,
            hero: { main: { type: 'none' } },
            layout: contentLayout(richText('Inactive test')),
          },
          user: member3,
          overrideAccess: false,
          context,
        }),
      [403],
    ),
  )

  check(
    'member3@: cannot update tenant3 page',
    await isRefused(
      payload,
      () =>
        payload.update({
          collection: 'pages',
          id: page3.id,
          data: { title: 'updated by member3', slug: page3.slug },
          user: member3,
          overrideAccess: false,
          context,
        }),
      [403, 404],
    ),
  )

  check(
    'member3@: cannot delete tenant3 page',
    await isRefused(
      payload,
      () =>
        payload.delete({
          collection: 'pages',
          id: page3.id,
          user: member3,
          overrideAccess: false,
          context,
        }),
      [403, 404],
    ),
  )

  check(
    'member3@: cannot update tenant3 header',
    await isRefused(
      payload,
      () =>
        payload.update({
          collection: 'header',
          id: header3.id,
          data: { navItems: [] },
          user: member3,
          overrideAccess: false,
          context,
        }),
      [403, 404],
    ),
  )

  check(
    'member3@: cannot create media in tenant3',
    await isRefused(
      payload,
      () =>
        payload.create({
          collection: 'media',
          data: {
            alt: `${PREFIX}-media-m3`,
            tenant: tenant3.id,
          },
          user: member3,
          overrideAccess: false,
          context,
        }),
      [403],
    ),
  )

  check(
    'member3@: cannot create category in tenant3',
    await isRefused(
      payload,
      () =>
        payload.create({
          collection: 'categories',
          data: {
            title: `${PREFIX}-cat-m3`,
            tenant: tenant3.id,
          },
          user: member3,
          overrideAccess: false,
          context,
        }),
      [403],
    ),
  )

  // 3. admin3@ (tenant admin) checks
  check(
    'admin3@: can find tenant3 pages',
    await succeeds(payload, async () => {
      const res = await payload.find({
        collection: 'pages',
        where: { tenant: { equals: tenant3.id } },
        user: admin3,
        overrideAccess: false,
      })
      if (res.totalDocs === 0) throw new Error('no pages found')
    }),
  )

  check(
    'admin3@: can read tenant3 header',
    await succeeds(payload, async () => {
      const res = await payload.find({
        collection: 'header',
        where: { tenant: { equals: tenant3.id } },
        user: admin3,
        overrideAccess: false,
      })
      if (res.totalDocs === 0) throw new Error('no header found')
    }),
  )

  check(
    'admin3@: cannot create page in tenant3',
    await isRefused(
      payload,
      () =>
        payload.create({
          collection: 'pages',
          data: {
            title: `${PREFIX}-page-a3`,
            slug: `${PREFIX}-page-a3`,
            tenant: tenant3.id,
            hero: { main: { type: 'none' } },
            layout: contentLayout(richText('Admin inactive test')),
          },
          user: admin3,
          overrideAccess: false,
          context,
        }),
      [403],
    ),
  )

  check(
    'admin3@: cannot update tenant3 page',
    await isRefused(
      payload,
      () =>
        payload.update({
          collection: 'pages',
          id: page3.id,
          data: { title: 'updated by admin3', slug: page3.slug },
          user: admin3,
          overrideAccess: false,
          context,
        }),
      [403, 404],
    ),
  )

  check(
    'admin3@: cannot delete tenant3 page',
    await isRefused(
      payload,
      () =>
        payload.delete({
          collection: 'pages',
          id: page3.id,
          user: admin3,
          overrideAccess: false,
          context,
        }),
      [403, 404],
    ),
  )

  check(
    'admin3@: cannot update tenant3 header',
    await isRefused(
      payload,
      () =>
        payload.update({
          collection: 'header',
          id: header3.id,
          data: { navItems: [] },
          user: admin3,
          overrideAccess: false,
          context,
        }),
      [403, 404],
    ),
  )

  check(
    'admin3@: cannot update tenant3 name',
    await isRefused(
      payload,
      () =>
        payload.update({
          collection: 'tenants',
          id: tenant3.id,
          data: { name: 'Attempted Renamed Tenant 3' },
          user: admin3,
          overrideAccess: false,
          context,
        }),
      [403, 404],
    ),
  )

  const tenant3Users = await payload.find({
    collection: 'users',
    user: admin3,
    overrideAccess: false,
  })
  check(
    'admin3@: still reads tenant3 members',
    tenant3Users.docs.some((u) => u.email === 'member3@example.test'),
  )

  // 4. Super user check
  check(
    'super user: can update tenant3 page',
    await succeeds(payload, () =>
      payload.update({
        collection: 'pages',
        id: page3.id,
        data: { title: 'updated by super user', slug: page3.slug },
        user: superUser,
        overrideAccess: false,
        context,
      }),
    ),
  )
  await payload.update({
    collection: 'pages',
    id: page3.id,
    data: { title: originalPage3Title, slug: page3.slug },
    user: superUser,
    overrideAccess: false,
    context,
  })

  // 5. Tenant1 editor unaffected
  let t1PageId: number | null = null
  check(
    'editor1@: can create page in active tenant1',
    await succeeds(payload, async () => {
      const created = await payload.create({
        collection: 'pages',
        data: {
          title: `${PREFIX}-t1-page`,
          slug: `${PREFIX}-t1-page`,
          tenant: tenant1.id,
          hero: { main: { type: 'none' } },
          layout: contentLayout(richText('Active tenant test')),
        },
        user: editor1,
        overrideAccess: false,
        context,
      })
      t1PageId = created.id
    }),
  )

  if (t1PageId !== null) {
    const pageIdToDelete = t1PageId
    check(
      'editor1@: can delete page in active tenant1',
      await succeeds(payload, () =>
        payload.delete({
          collection: 'pages',
          id: pageIdToDelete,
          user: editor1,
          overrideAccess: false,
          context,
        }),
      ),
    )
  }

  // 6. Access function level check
  const member3Req = await reqFor(payload, member3)
  const pagesUpdateAccess = accessCheckResolver('pages', 'update')
  const member3UpdateResult = await pagesUpdateAccess({ req: member3Req })
  check(
    "access function: accessCheckResolver('pages', 'update') result for member3@ is false",
    member3UpdateResult === false,
  )

  // 7. Reactivation check
  try {
    await payload.update({
      collection: 'tenants',
      id: tenant3.id,
      data: { isActive: true },
      overrideAccess: true,
    })
    const reloadedMember3 = await loadUser(payload, 'member3@example.test')
    check(
      'reactivation: member3@ can now update a tenant3 page',
      await succeeds(payload, () =>
        payload.update({
          collection: 'pages',
          id: page3.id,
          data: { title: 'reactivated title by member3', slug: page3.slug },
          user: reloadedMember3,
          overrideAccess: false,
          context,
        }),
      ),
    )
    await payload.update({
      collection: 'pages',
      id: page3.id,
      data: { title: originalPage3Title, slug: page3.slug },
      overrideAccess: true,
      context,
    })
  } finally {
    await payload.update({
      collection: 'tenants',
      id: tenant3.id,
      data: { isActive: false },
      overrideAccess: true,
    })
  }
} catch (err) {
  check('no crash', false)
  payload.logger.error({ msg: 'verify: inactiveTenants crashed', err })
} finally {
  await cleanup()
}

if (failures() > 0) {
  payload.logger.error(`verify: inactiveTenants ${failures()} check(s) failed`)
  process.exit(1)
}
payload.logger.info('verify: inactiveTenants all checks passed')
process.exit(0)
