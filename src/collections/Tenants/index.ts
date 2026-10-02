import type { CollectionConfig, TextFieldValidation } from 'payload'
import { accessCheckResolver } from '@/utilities/access'
import { createdUpdatedByFields } from '@/fields/createdUpdatedByFields'
import { setCreatedUpdatedByCollection } from '@/hooks/setCreatedUpdatedBy'
import { formatTenantSlugHook, validateTenantSlug } from './hooks/validateTenantSlug'
import { createTenantDocs } from './hooks/createTenantDocs'

const HOSTNAME_REGEX =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/

const validateDomain: TextFieldValidation = (value) => {
  if (!value || typeof value !== 'string') {
    return 'Domain is required.'
  }

  const normalized = value.trim().toLowerCase()

  if (normalized.includes('://')) {
    return 'Domain must not include a URL scheme (e.g., http:// or https://).'
  }

  if (normalized.includes('/')) {
    return 'Domain must not include a URL path.'
  }

  if (normalized.includes(':')) {
    return 'Domain must not include a port number.'
  }

  if (!HOSTNAME_REGEX.test(normalized)) {
    return 'Domain must be a valid hostname (e.g., "example.com" or "sub.example.com").'
  }

  return true
}

export const Tenants: CollectionConfig = {
  slug: 'tenants',
  access: {
    create: ({ req }) => Boolean(req.user?.super_user),
    delete: ({ req }) => Boolean(req.user?.super_user),
    // any signed-in user; the multi-tenant plugin narrows this to the user's own tenants
    // (super users see all). needed so the tenant selector works for every member.
    read: ({ req }) => Boolean(req.user),
    update: accessCheckResolver('tenants', 'canUpdate'),
  },
  admin: {
    group: 'Admin',
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'isActive', 'updatedAt'],
  },
  timestamps: true,
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        position: 'sidebar',
      },
      hooks: {
        beforeValidate: [formatTenantSlugHook],
      },
      validate: validateTenantSlug,
    },
    {
      name: 'domains',
      type: 'array',
      label: 'Domains',
      fields: [
        {
          name: 'domain',
          type: 'text',
          required: true,
          unique: true,
          hooks: {
            beforeValidate: [
              ({ value }) => {
                if (typeof value === 'string') {
                  return value.trim().toLowerCase()
                }
                return value
              },
            ],
          },
          validate: validateDomain,
        },
      ],
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description:
          'Controls whether the tenant is active. Inactive tenants are not accessible to public users.',
      },
    },
    ...createdUpdatedByFields,
  ],
  hooks: {
    beforeChange: [setCreatedUpdatedByCollection],
    afterChange: [createTenantDocs],
  },
}
