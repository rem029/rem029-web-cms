import { createdUpdatedByFields } from '@/fields/createdUpdatedByFields'
import { setCreatedUpdatedByCollection } from '@/hooks/setCreatedUpdatedBy'
import { defaultThemeCSS } from '@/utilities/defaults'
import { generateThemePreviewPath } from '@/utilities/generatePreviewPath'
import { accessCheckResolver, isSuperUser } from '@/utilities/access'
import { validateTenantDocUniqueness } from '@/common/hooks/validateTenantDocUniqueness'

import type { CollectionConfig } from 'payload'
import type { ThemeConfig } from '@/payload-types'

export const Theme: CollectionConfig = {
  slug: 'theme',
  // one doc per business, so no plural in the admin nav
  labels: { singular: 'Theme', plural: 'Theme' },
  access: {
    read: () => true,
    update: accessCheckResolver('theme', 'canUpdate'),
    create: isSuperUser,
    delete: isSuperUser,
  },
  admin: {
    group: 'Admin',
    livePreview: {
      url: ({ data }) => {
        const tenantId = typeof data?.tenant === 'object' ? data?.tenant?.id : data?.tenant
        return generateThemePreviewPath(tenantId)
      },
    },
  },
  fields: [
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
    ...createdUpdatedByFields,
  ],
  hooks: {
    beforeValidate: [validateTenantDocUniqueness('theme', 'Theme')],
    beforeChange: [setCreatedUpdatedByCollection],
  },
}
