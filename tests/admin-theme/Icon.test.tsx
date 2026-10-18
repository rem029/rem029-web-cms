// The breadcrumb home link holds only the admin icon, so the icon names the link.
import type { Payload } from 'payload'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { Icon } from '@/common/components/AdminBranding/Icon'

import { getTestPayload } from '../common/payload'
import { TEST_TENANTS, TEST_USERS } from '../common/seed'
import { findTenant } from '../common/tenants'
import { loadUser, type SessionUser } from '../common/users'

const cookie = vi.hoisted(() => ({ value: undefined as string | undefined }))

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: () => (cookie.value === undefined ? undefined : { value: cookie.value }),
  }),
  headers: async () => new Headers(),
}))

describe('admin icon', () => {
  let payload: Payload
  let superUser: SessionUser
  let tenantBId: string

  beforeAll(async () => {
    payload = await getTestPayload()
    superUser = await loadUser(payload, TEST_USERS.superUser)
    tenantBId = String((await findTenant(payload, TEST_TENANTS.b)).id)
  })

  it('names the platform mascot Dashboard', async () => {
    // arrange
    cookie.value = undefined

    // act
    const html = renderToStaticMarkup(await Icon({ payload }))

    // assert
    expect(html).toContain('alt="Dashboard"')
  })

  it("names a business's initial Dashboard", async () => {
    // arrange
    cookie.value = tenantBId

    // act
    const html = renderToStaticMarkup(await Icon({ payload, user: superUser }))

    // assert
    expect(html).toContain('aria-label="Dashboard"')
  })
})
