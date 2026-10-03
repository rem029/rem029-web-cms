import type { ArrayField, Config, Plugin, SelectField } from 'payload'
import { getAccessSlugs } from './accessSlugs'

/**
 * Payload plugin that sets the options of the `users-access` collection's
 * `access` array `slug` select field to `getAccessSlugs(config.collections)`.
 *
 * Why a plugin:
 * Select options in Payload are static and defined at build/config time.
 * Registering this plugin LAST ensures that all collections added by other plugins
 * (such as forms, form-submissions, redirects, search, etc.) are already present
 * in `config.collections` when computing the allowed access slugs.
 */
export const withAccessSlugOptions: Plugin = (config: Config): Config => {
  const collections = config.collections || []
  const usersAccess = collections.find((c) => c.slug === 'users-access')

  if (!usersAccess) {
    throw new Error(
      'withAccessSlugOptions: "users-access" collection not found in config.collections',
    )
  }

  const accessArrayField = usersAccess.fields?.find(
    (field) => 'name' in field && field.name === 'access' && field.type === 'array',
  ) as ArrayField | undefined

  if (!accessArrayField || !Array.isArray(accessArrayField.fields)) {
    throw new Error(
      'withAccessSlugOptions: "access" array field not found in "users-access" collection',
    )
  }

  const slugField = accessArrayField.fields.find(
    (field) => 'name' in field && field.name === 'slug' && field.type === 'select',
  ) as SelectField | undefined

  if (!slugField) {
    throw new Error(
      'withAccessSlugOptions: "slug" select field not found in "access" array of "users-access"',
    )
  }

  const validSlugs = getAccessSlugs(collections)
  slugField.options = validSlugs.map((slug) => ({
    label: slug,
    value: slug,
  }))

  return config
}
