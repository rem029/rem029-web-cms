import type { FieldHook, TextFieldValidation } from 'payload'
import { isReservedSlug } from '../utils/reservedSlugs'

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const validateTenantSlug: TextFieldValidation = (value) => {
  if (!value || typeof value !== 'string') {
    return 'Slug is required.'
  }

  const slug = value.trim().toLowerCase()

  if (slug.length < 3 || slug.length > 40) {
    return 'Slug must be between 3 and 40 characters.'
  }

  if (isReservedSlug(slug)) {
    return `Slug "${slug}" is reserved and cannot be used.`
  }

  if (!SLUG_REGEX.test(slug)) {
    return 'Slug must only contain lowercase letters, numbers, and hyphens without consecutive hyphens, and cannot start or end with a hyphen.'
  }

  return true
}

export const formatTenantSlugHook: FieldHook = ({ value }) => {
  if (typeof value === 'string') {
    return value.trim().toLowerCase()
  }
  return value
}
