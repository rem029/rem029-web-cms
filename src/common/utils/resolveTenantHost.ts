import { DEFAULT_TENANT_SLUG } from '@/common/utils/defaultTenant'

export type TenantHost =
  | { kind: 'default' } // the base domain, or tenant resolution disabled
  | { kind: 'slug'; slug: string } // <slug>.<base>, single label only
  | { kind: 'domain'; domain: string } // anything else: custom domain lookup

export const hostnameOf = (host: string): string => {
  let h = host.trim().toLowerCase()
  if (h.startsWith('[')) {
    const closing = h.indexOf(']')
    if (closing !== -1) {
      h = h.slice(0, closing + 1)
    }
  } else {
    h = h.replace(/:\d+$/, '')
  }
  return h.replace(/\.+$/, '')
}

export const resolveTenantHost = (
  host: string | null | undefined,
  baseDomain: string | undefined,
): TenantHost => {
  if (!baseDomain || !baseDomain.trim()) {
    return { kind: 'default' }
  }

  if (!host || !host.trim()) {
    return { kind: 'domain', domain: '' }
  }

  const base = hostnameOf(baseDomain)
  if (!base) {
    return { kind: 'default' }
  }

  const h = hostnameOf(host)
  if (!h) {
    return { kind: 'domain', domain: '' }
  }

  if (h === base) {
    return { kind: 'default' }
  }

  const suffix = `.${base}`
  if (h.endsWith(suffix)) {
    const prefix = h.slice(0, -suffix.length)
    if (prefix && !prefix.includes('.')) {
      return { kind: 'slug', slug: prefix }
    }
  }

  return { kind: 'domain', domain: h }
}

export const requestHost = (get: (name: string) => string | null): string | null => {
  if (process.env.TRUST_PROXY === 'true') {
    const forwarded = get('x-forwarded-host')
    if (forwarded) {
      const first = forwarded.split(',')[0]?.trim()
      if (first) return first
    }
  }
  return get('host')
}

export const isAdminAliasHost = (
  host: string | null | undefined,
  baseDomain: string | undefined,
): boolean => {
  if (!host || !baseDomain || !baseDomain.trim()) return false
  const h = hostnameOf(host)
  const base = hostnameOf(baseDomain)
  if (!h || !base) return false
  return h === `${DEFAULT_TENANT_SLUG}.${base}`
}
