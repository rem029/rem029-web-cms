// Live preview of a menu (rem0017 phase 2 step 1): previewURL() for `menus` points at the menu's
// tenant host and /menu/<slug>, signed like the other previewable collections.
import type { Payload } from 'payload'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { previewURL } from '@/common/utils/preview'
import { verifyPreview } from '@/common/utils/previewToken'
import type { Tenant } from '@/payload-types'

import { getTestPayload } from '../common/payload'
import { TEST_CONTENT, TEST_MENU, TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { loadUser, reqFor, type SessionUser } from '../common/users'

describe('menu preview', () => {
  let payload: Payload
  let tenantA: Tenant
  let member: SessionUser

  const linkForDinner = async () =>
    new URL(
      (await previewURL({
        collection: 'menus',
        slug: TEST_MENU.dinner,
        tenant: tenantA.id,
        req: await reqFor(payload, member),
      })) ?? 'about:blank',
    )

  beforeAll(async () => {
    payload = await getTestPayload()
    tenantA = await findTenant(payload, TEST_TENANTS.a)
    member = await loadUser(payload, TEST_USERS.member)
  })

  beforeEach(() => {
    // arrange
    vi.stubEnv('TENANT_BASE_DOMAIN', 'cms.example.test')
    vi.stubEnv('NEXT_PUBLIC_SERVER_URL', 'http://localhost:3000')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('builds the preview url on the tenant host', async () => {
    // act
    const url = await linkForDinner()
    const token = verifyPreview(
      url.searchParams.get('token') ?? '',
      process.env.PAYLOAD_SECRET ?? '',
    )

    // assert
    // test-a's public url: its custom domain wins over the slug
    expect(url.origin).toBe(`http://${TEST_CONTENT.domainOfA}`)
    expect(token).toEqual({
      ok: true,
      claims: expect.objectContaining({ tenantId: tenantA.id, userId: member.id }),
    })
  })

  it('points the preview at /menu/<slug>', async () => {
    // act
    const url = await linkForDinner()

    // assert
    expect(url.searchParams.get('path')).toBe(`/menu/${TEST_MENU.dinner}?lang=en`)
  })
})
