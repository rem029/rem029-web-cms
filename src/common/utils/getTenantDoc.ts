import type { Footer, Header, Setting, Tenant, Theme } from '@/payload-types'
import configPromise from '@payload-config'
import { getPayload, type TypedLocale } from 'payload'
import { cache } from 'react'
import { DEFAULT_TENANT_SLUG } from './defaultTenant'

export type TenantDocSlug = 'header' | 'footer' | 'theme' | 'settings'

type TenantDocMap = {
  header: Header
  footer: Footer
  theme: Theme
  settings: Setting
}

export type TenantDocType<T extends TenantDocSlug> = TenantDocMap[T]

// cached per request: layout, header, footer and metadata all ask for it
export const getDefaultTenantId = cache(async (): Promise<Tenant['id'] | null> => {
  const payload = await getPayload({ config: configPromise })
  const tenants = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: DEFAULT_TENANT_SLUG } },
    limit: 1,
    pagination: false,
    depth: 0,
  })

  const tenant = tenants.docs[0]
  if (!tenant) {
    payload.logger.warn({ msg: 'Default tenant not found', slug: DEFAULT_TENANT_SLUG })
    return null
  }

  return tenant.id
})

export async function getTenantDoc<T extends TenantDocSlug>(
  slug: T,
  tenantId: number | string | null | undefined,
  options: { depth?: number; locale?: TypedLocale } = {},
): Promise<TenantDocType<T> | null> {
  const payload = await getPayload({ config: configPromise })

  if (!tenantId) {
    payload.logger.debug({ msg: 'getTenantDoc: no tenant id', slug })
    return null
  }

  const result = await payload.find({
    collection: slug,
    where: { tenant: { equals: tenantId } },
    limit: 1,
    pagination: false,
    depth: options.depth ?? 0,
    locale: options.locale,
  })

  const doc = (result.docs[0] as TenantDocType<T>) ?? null
  if (!doc) {
    payload.logger.debug({ msg: 'getTenantDoc: no doc for tenant', slug, tenantId })
  }

  return doc
}
