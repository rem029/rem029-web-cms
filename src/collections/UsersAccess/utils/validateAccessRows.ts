import type { ArrayFieldValidation, TextFieldValidation } from 'payload'
import { getAccessSlugs } from './accessSlugs'

const PROFILE_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const validateProfileSlug: TextFieldValidation = (value) => {
  if (!value || typeof value !== 'string') {
    return 'Slug must be lowercase kebab-case (e.g. "pages-editor")'
  }

  if (!PROFILE_SLUG_REGEX.test(value)) {
    return 'Slug must be lowercase kebab-case (e.g. "pages-editor")'
  }

  return true
}

export const validateAccessRows: ArrayFieldValidation = (value, { req }) => {
  if (!value || !Array.isArray(value)) {
    return true
  }

  const collections = req?.payload?.config?.collections || []
  const validSlugs = getAccessSlugs(collections)
  const seenSlugs = new Set<string>()

  for (const row of value) {
    const slug =
      row && typeof row === 'object' && 'slug' in row && typeof row.slug === 'string'
        ? row.slug
        : ''

    if (!slug || !validSlugs.includes(slug)) {
      return `Unknown collection slug "${slug}"`
    }

    if (seenSlugs.has(slug)) {
      return `Duplicate row for "${slug}"`
    }

    seenSlugs.add(slug)
  }

  return true
}
