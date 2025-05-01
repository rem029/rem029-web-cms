import { BlockquoteStyles } from '@/fields/styles/blockquoteStyles'
import { ButtonStyles } from '@/fields/styles/buttonStyles'
import { CardStyles } from '@/fields/styles/cardStyles'
import { CodeStyles } from '@/fields/styles/codeStyles'
import { CustomCSS } from '@/fields/styles/customCss'
import { InputStyles } from '@/fields/styles/inputStyles'
import { LinkStyles } from '@/fields/styles/linkStyles'
import { ListStyles } from '@/fields/styles/listStyles'
import { TableStyles } from '@/fields/styles/tableStyles'
import { TextStyles } from '@/fields/styles/textStyles'
import type { GlobalConfig, Option } from 'payload'

export const fontOptions: Option[] = [
  { label: 'Inter', value: 'inter' },
  { label: 'Lora', value: 'lora' },
  { label: 'Roboto', value: 'roboto' },
  { label: 'Arial', value: 'arial' },
  { label: 'Georgia', value: 'georgia' },
]

export const Theme: GlobalConfig = {
  slug: 'theme',
  access: {
    read: () => true,
  },
  admin: {
    group: 'Settings',
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
          name: 'name',
          type: 'text',
          required: true,
        },
        {
          name: 'isDefault',
          type: 'checkbox',
          admin: {
            description: 'Make this the default theme',
          },
        },
        {
          name: 'colors',
          type: 'group',
          fields: [
            { name: 'primary', type: 'text', required: true },
            { name: 'secondary', type: 'text', required: true },
            { name: 'background', type: 'text', required: true },
            { name: 'text', type: 'text', required: true },
            { name: 'accent', type: 'text', required: true },
            { name: 'success', type: 'text', required: true },
            { name: 'info', type: 'text', required: true },
            { name: 'warning', type: 'text', required: true },
          ],
        },
        {
          name: 'fonts',
          type: 'group',
          fields: [
            {
              name: 'body',
              type: 'select',
              options: fontOptions,
              required: true,
            },
            {
              name: 'heading',
              type: 'select',
              options: fontOptions,
              required: true,
            },
            {
              name: 'monospace',
              type: 'select',
              options: fontOptions,
              required: true,
            },
            {
              label: 'Elements',
              type: 'collapsible',
              admin: {
                description: 'Style for common HTML elements',
              },
              fields: [
                {
                  name: 'headings',
                  type: 'group',
                  fields: [
                    {
                      name: 'h1',
                      type: 'group',
                      fields: [
                        {
                          type: 'tabs',
                          tabs: [
                            { label: 'Mobile', name: 'mobile', fields: [...TextStyles] },
                            { label: 'Desktop', name: 'desktop', fields: [...TextStyles] },
                          ],
                        },
                        ...CustomCSS,
                      ],
                    },
                    {
                      name: 'h2',
                      type: 'group',
                      fields: [
                        {
                          type: 'tabs',
                          tabs: [
                            { label: 'Mobile', name: 'mobile', fields: [...TextStyles] },
                            { label: 'Desktop', name: 'desktop', fields: [...TextStyles] },
                          ],
                        },
                        ...CustomCSS,
                      ],
                    },
                    {
                      name: 'h3',
                      type: 'group',
                      fields: [
                        {
                          type: 'tabs',
                          tabs: [
                            { label: 'Mobile', name: 'mobile', fields: [...TextStyles] },
                            { label: 'Desktop', name: 'desktop', fields: [...TextStyles] },
                          ],
                        },
                        ...CustomCSS,
                      ],
                    },
                  ],
                },
                {
                  name: 'paragraph',
                  type: 'group',
                  fields: [
                    {
                      type: 'tabs',
                      tabs: [
                        { label: 'Mobile', name: 'mobile', fields: [...TextStyles] },
                        { label: 'Desktop', name: 'desktop', fields: [...TextStyles] },
                      ],
                    },
                    ...CustomCSS,
                  ],
                },
                {
                  name: 'button',
                  type: 'group',
                  fields: [...ButtonStyles, ...CustomCSS],
                },
                {
                  name: 'input',
                  type: 'group',
                  fields: [...InputStyles, ...CustomCSS],
                },
                {
                  name: 'link',
                  type: 'group',
                  fields: [...LinkStyles, ...CustomCSS],
                },
                {
                  name: 'card',
                  type: 'group',
                  fields: [...CardStyles, ...CustomCSS],
                },
                {
                  name: 'table',
                  type: 'group',
                  fields: [...TableStyles, ...CustomCSS],
                },
                {
                  name: 'list',
                  type: 'group',
                  fields: [...ListStyles, ...CustomCSS],
                },
                {
                  name: 'blockquote',
                  type: 'group',
                  fields: [...BlockquoteStyles, ...CustomCSS],
                },
                {
                  name: 'code',
                  type: 'group',
                  fields: [...CodeStyles, ...CustomCSS],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
