import type { FieldHook } from 'payload'

export const formatSlug = (val: string): string =>
  val
    .replace(/ /g, '-')
    .replace(/[^\w-]+/g, '')
    .toLowerCase()

export const formatSlugHook =
  (fallback: string): FieldHook =>
  async ({ data, operation, value, req }) => {
    let categorySlug = ''

    if (data?.category) {
      const category = await req.payload.findByID({
        collection: 'categories',
        id: data?.category,
        depth: 0,
      })
      categorySlug = category?.slug || ''
    }

    if (typeof value === 'string') {
      const returnValue = categorySlug ? `${categorySlug}/${formatSlug(value)}` : formatSlug(value)

      return returnValue
    }

    if (operation === 'create' || !data?.slug) {
      const fallbackData = data?.[fallback] || data?.[fallback]

      if (fallbackData && typeof fallbackData === 'string') {
        const returnValue = categorySlug
          ? `${categorySlug}/${formatSlug(fallbackData)}`
          : formatSlug(fallbackData)

        return returnValue
      }
    }

    return value
  }
