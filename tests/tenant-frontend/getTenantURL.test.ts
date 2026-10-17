// getTenantURL: the public url of a tenant with TENANT_BASE_DOMAIN set. Pure, no db.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_TENANT_SLUG } from '@/common/utils/defaultTenant'
import { getTenantURL } from '@/utilities/getURL'

describe('getTenantURL', () => {
  beforeEach(() => {
    // arrange
    vi.stubEnv('TENANT_BASE_DOMAIN', 'cms.example.test:3000')
    vi.stubEnv('NEXT_PUBLIC_SERVER_URL', 'http://localhost:3000')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('puts the slug on the base domain and keeps the port', () => {
    // act
    const url = getTenantURL({ slug: 'test-a', domains: [] })

    // assert
    expect(url).toBe('http://test-a.cms.example.test:3000')
  })

  it('uses the base domain for the admin tenant', () => {
    // act
    const url = getTenantURL({ slug: DEFAULT_TENANT_SLUG, domains: [] })

    // assert
    expect(url).toBe('http://cms.example.test:3000')
  })

  it('prefers a custom domain over the slug', () => {
    // act
    const url = getTenantURL({ slug: 'x', domains: [{ domain: 'shop.example.com' }] })

    // assert
    expect(url).toBe('http://shop.example.com')
  })
})
