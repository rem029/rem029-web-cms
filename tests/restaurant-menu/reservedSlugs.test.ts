// Reserved page slugs (rem0017 phase 2 step 1, `src/common/utils/reservedSlugs.ts`): `/menu` is
// the menus route, so no page may take the slug `menu`. Other collections are unaffected.
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import type { Tenant } from '@/payload-types'

import { contentLayout, richText } from '../common/content'
import { rejectionText } from '../common/errors'
import { getTestPayload } from '../common/payload'
import { TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { loadUser, type SessionUser } from '../common/users'

// outside Next.js: skip the pages and menus cache revalidation
const context = { disableRevalidate: true }

describe('reserved slugs', () => {
  let payload: Payload
  let tenantC: Tenant
  let superUser: SessionUser

  beforeAll(async () => {
    payload = await getTestPayload()
    // test-c: nobody else creates docs there, so the slug `menu` is free in it
    tenantC = await findTenant(payload, TEST_TENANTS.c)
    superUser = await loadUser(payload, TEST_USERS.superUser)
  })

  // field validation, so on publish (a draft with it never renders, and Payload skips field
  // validation on drafts)
  it('refuses a page with the slug menu', async () => {
    // act
    const message = await rejectionText(
      payload.create({
        collection: 'pages',
        data: {
          title: 'Menu',
          slug: 'menu',
          tenant: tenantC.id,
          hero: { main: { type: 'none' } },
          layout: contentLayout(richText('Menu')),
          _status: 'published',
        },
        user: superUser,
        overrideAccess: false,
        context,
      }),
    )

    // assert
    expect(message).toContain('is used by the site itself')
  })

  it('allows a menu item or category with the slug menu', async () => {
    // act
    const category = await payload.create({
      collection: 'menu-categories',
      data: { title: 'Menu', tenant: tenantC.id },
      user: superUser,
      overrideAccess: false,
      context,
    })
    const item = await payload.create({
      collection: 'menu-items',
      data: { title: 'Menu', price: 1, tenant: tenantC.id },
      user: superUser,
      overrideAccess: false,
      context,
    })

    // assert
    expect([category.slug, item.slug]).toEqual(['menu', 'menu'])
    await payload.delete({ collection: 'menu-items', id: item.id, context })
    await payload.delete({ collection: 'menu-categories', id: category.id, context })
  })
})
