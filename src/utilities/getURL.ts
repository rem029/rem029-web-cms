import type { Tenant } from '@/payload-types'
import { DEFAULT_TENANT_SLUG } from '@/common/utils/defaultTenant'
import canUseDOM from './canUseDOM'

export const getServerSideURL = () => {
  let url = process.env.NEXT_PUBLIC_SERVER_URL

  if (!url && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }

  if (!url) {
    url = 'http://localhost:3000'
  }

  return url
}

export const getClientSideURL = () => {
  if (canUseDOM) {
    const protocol = window.location.protocol
    const domain = window.location.hostname
    const port = window.location.port

    return `${protocol}//${domain}${port ? `:${port}` : ''}`
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }

  return process.env.NEXT_PUBLIC_SERVER_URL || ''
}

export const getTenantURL = (tenant: Pick<Tenant, 'slug' | 'domains'>): string => {
  const base = process.env.TENANT_BASE_DOMAIN
  if (!base || !base.trim()) {
    return getServerSideURL()
  }

  const protocol = new URL(getServerSideURL()).protocol
  const firstDomain = tenant.domains?.find((d) => Boolean(d?.domain?.trim()))?.domain?.trim()
  const host = firstDomain
    ? firstDomain
    : tenant.slug === DEFAULT_TENANT_SLUG
      ? base.trim()
      : `${tenant.slug}.${base.trim()}`

  return `${protocol}//${host}`
}
