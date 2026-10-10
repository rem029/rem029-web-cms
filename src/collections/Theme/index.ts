import { defaultThemeCSS } from '@/utilities/defaults'
import { previewURL } from '@/common/utils/preview'
import {
  accessCheckResolver,
  hiddenResolver,
  isSuperUser,
  publicOrVisible,
} from '@/common/utils/access'
import { hiddenBannerField, hiddenFields } from '@/common/fields/hiddenFields'
import { validateTenantDocUniqueness } from '@/common/hooks/validateTenantDocUniqueness'

import type { CollectionConfig } from 'payload'
import type { ThemeConfig } from '@/payload-types'

export const Theme: CollectionConfig = {
  slug: 'theme',
  // one doc per business, so no plural in the admin nav
  labels: { singular: 'Theme', plural: 'Theme' },
  access: {
    read: publicOrVisible('theme'),
    update: accessCheckResolver('theme', 'update', { hideable: true }),
    create: isSuperUser,
    delete: isSuperUser,
  },
  admin: {
    group: 'Admin',
    hidden: hiddenResolver('theme'),
    livePreview: {
      url: async ({ data, req }) => {
        return (
          (await previewURL({
            collection: 'theme',
            tenant: data?.tenant,
            req,
          })) ?? ''
        )
      },
    },
  },
  fields: [
    hiddenBannerField,
    {
      name: 'themes',
      type: 'array',
      interfaceName: 'ThemeConfig',
      admin: {
        description: 'Define different themes for your website',
      },
      // themes used to be unique table-wide; now unique within each tenant's doc
      validate: (value) => {
        const themes = (value ?? []) as NonNullable<ThemeConfig>
        if (themes.filter((theme) => theme.active).length > 1) {
          return 'Only one theme can be active at a time.'
        }
        const names = themes.map((theme) => theme.name?.trim().toLowerCase())
        if (new Set(names).size !== names.length) return 'Theme names must be unique.'
        return true
      },
      fields: [
        {
          name: 'active',
          label: 'Activate this theme?',
          type: 'checkbox',
          defaultValue: false,
          required: true,
        },
        {
          name: 'name',
          type: 'text',
          required: true,
        },
        {
          name: 'css',
          type: 'code',
          label: 'Custom CSS',
          _sanitized: true,
          localized: true,
          admin: {
            language: 'css',
          },
          defaultValue: defaultThemeCSS,
        },
        {
          name: 'js',
          type: 'code',
          label: 'Custom JS',
          _sanitized: true,
          localized: true,
          admin: {
            language: 'javascript',
          },
        },
      ],
    },
    ...hiddenFields({
      description: 'Hides it from other members in the admin only. The public site always uses it.',
    }),
  ],
  hooks: {
    beforeValidate: [validateTenantDocUniqueness('theme', 'Theme')],
  },
}
