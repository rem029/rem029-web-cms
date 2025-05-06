import { defaultThemeCSS } from '@/utilities/defaults'
import { generateThemePreviewPath } from '@/utilities/generatePreviewPath'
import { SUPPORTED_FONTS } from '@/utilities/getFont'
import type { GlobalConfig } from 'payload'

export const Theme: GlobalConfig = {
  slug: 'theme',
  access: {
    read: () => true,
  },
  admin: {
    group: 'Admin',
    livePreview: {
      url: () => {
        const path = generateThemePreviewPath()
        return path
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
      fields: [
        {
          name: 'active',
          label: 'Activate this theme?',
          type: 'checkbox',
          defaultValue: false,
          unique: true,
          required: true,
        },
        {
          name: 'name',
          type: 'text',
          required: true,
          unique: true,
        },
        {
          name: 'css',
          type: 'code',
          label: 'Custom CSS',
          _sanitized: true,
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
          admin: {
            language: 'javascript',
          },
        },
      ],
    },
  ],
}
