// resolveTenantHost: which tenant a host asks for, before any db lookup. Pure, no db.
import { describe, expect, it } from 'vitest'

import { isAdminAliasHost, resolveTenantHost } from '@/common/utils/resolveTenantHost'

const BASE = 'cms.example.test:3000'

describe('resolveTenantHost', () => {
  it('resolves every host to the default tenant without a base', () => {
    // act
    const result = resolveTenantHost('anything.test', undefined)

    // assert
    expect(result).toEqual({ kind: 'default' })
  })

  it('resolves the base host to the default tenant, any case', () => {
    // act
    const result = resolveTenantHost('CMS.example.test:3000', BASE)

    // assert
    expect(result).toEqual({ kind: 'default' })
  })

  it('resolves a subdomain of the base to its slug', () => {
    // act
    const result = resolveTenantHost('test-a.cms.example.test', BASE)

    // assert
    expect(result).toEqual({ kind: 'slug', slug: 'test-a' })
  })

  it('treats a nested subdomain as a custom domain', () => {
    // act
    const result = resolveTenantHost('a.b.cms.example.test', BASE)

    // assert
    expect(result).toEqual({ kind: 'domain', domain: 'a.b.cms.example.test' })
  })

  it('treats another host as a custom domain', () => {
    // act
    const result = resolveTenantHost('shop.example.com', BASE)

    // assert
    expect(result).toEqual({ kind: 'domain', domain: 'shop.example.com' })
  })

  it('knows admin.<base> as the admin alias', () => {
    // act
    const result = isAdminAliasHost('admin.cms.example.test', BASE)

    // assert
    expect(result).toBe(true)
  })
})
