import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { RESERVED_PAGE_SLUGS } from '@/common/utils/reservedSlugs'
import type { Tenant } from '@/payload-types'

import { context, draftPageData } from '../access-control/pages'
import { contentLayout, richText } from '../common/content'
import { rejectionText } from '../common/errors'
import { getTestPayload } from '../common/payload'
import { TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { uniqueName } from '../common/unique'
import { loadUser, type SessionUser } from '../common/users'

describe('reserved page slugs', () => {
  let payload: Payload
  let superUser: SessionUser
  let tenantA: Tenant

  beforeAll(async () => {
    payload = await getTestPayload()
    superUser = await loadUser(payload, TEST_USERS.superUser)
    tenantA = await findTenant(payload, TEST_TENANTS.a)
  })

  // published, not draft: Payload skips field validation on draft saves
  const createPage = (slug: string) =>
    payload.create({
      collection: 'pages',
      data: {
        ...draftPageData(tenantA.id, slug),
        layout: contentLayout(richText('Reserved slugs')),
        slugLock: false,
        _status: 'published',
      },
      user: superUser,
      overrideAccess: false,
      context,
    })

  it.each(RESERVED_PAGE_SLUGS)('refuses page slug %s', async (slug) => {
    // arrange: a reserved slug

    // act
    const message = await rejectionText(createPage(slug))

    // assert
    expect(message).toContain(`"${slug}" is used by the site itself`)
  })

  it('allows a slug that only starts with a reserved word', async () => {
    // arrange
    const slug = uniqueName('forms-and-guides')

    // act
    const page = await createPage(slug)

    // assert
    expect(page.slug).toBe(slug)
  })
})
