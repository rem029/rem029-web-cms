import type { CollectionConfig, TextFieldValidation } from 'payload'
import {
  accessCheckResolver,
  hiddenResolver,
  isSuperUser,
  isSuperUserField,
} from '@/common/utils/access'
import { createdUpdatedByFields } from '@/fields/createdUpdatedByFields'
import { setCreatedUpdatedByCollection } from '@/hooks/setCreatedUpdatedBy'
import { formatTenantSlugHook, validateTenantSlug } from './hooks/validateTenantSlug'
import { createTenantDocs } from './hooks/createTenantDocs'
import { guardTenantFields } from './hooks/guardTenantFields'

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
    create: isSuperUser,
    delete: isSuperUser,
    // any signed-in user; the multi-tenant plugin narrows this to the user's own tenants
    // (super users see all). needed so the tenant selector works for every member.
    read: ({ req }) => Boolean(req.user),
    update: accessCheckResolver('tenants', 'update'),
  },
  admin: {
    group: 'Admin',
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'isActive', 'updatedAt'],
    hidden: hiddenResolver('tenants'),
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
      access: {
        update: isSuperUserField,
      },
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
      access: {
        update: isSuperUserField,
      },
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
      access: {
        update: isSuperUserField,
      },
      admin: {
        description:
          'Inactive businesses are read-only for their members (super users can still edit). Their public site is unaffected for now.',
      },
    },
    ...createdUpdatedByFields,
  ],
  hooks: {
    beforeOperation: [guardTenantFields],
    beforeChange: [setCreatedUpdatedByCollection],
    afterChange: [createTenantDocs],
  },
}
