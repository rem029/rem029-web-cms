export const RESERVED_SLUGS: readonly string[] = [
  'www',
  'api',
  'app',
  'cms',
  'mail',
  'static',
  'assets',
] as const

export const isReservedSlug = (slug: string): boolean => {
  return RESERVED_SLUGS.includes(slug.toLowerCase())
}
