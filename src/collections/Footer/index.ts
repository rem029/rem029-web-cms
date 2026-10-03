import type { CollectionConfig } from 'payload'

import { link } from '@/fields/link'
import { revalidateFooter } from './hooks/revalidateFooter'
import {
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import { defaultFooterCopyRight } from '@/utilities/defaults'
import { accessCheckResolver, hiddenResolver, isSuperUser } from '@/common/utils/access'
import { validateTenantDocUniqueness } from '@/common/hooks/validateTenantDocUniqueness'

export const Footer: CollectionConfig = {
  slug: 'footer',
  // one doc per business, so no plural in the admin nav
  labels: { singular: 'Footer', plural: 'Footer' },
  admin: {
    hidden: hiddenResolver('footer'),
  },
  access: {
    read: () => true,
    update: accessCheckResolver('footer', 'update'),
    create: isSuperUser,
    delete: isSuperUser,
  },
  fields: [
    {
      name: 'navItems',
      type: 'array',
      fields: [
        link({
          appearances: false,
          enableGrouping: true,
        }),
      ],
      maxRows: 6,
      admin: {
        initCollapsed: true,
        components: {
          RowLabel: '@/collections/Footer/RowLabel#RowLabel',
        },
      },
    },
    {
      label: 'Copyright',
      name: 'copyright',
      type: 'richText',
      localized: true,
      editor: lexicalEditor({
        features: ({ rootFeatures }) => {
          return [
            ...rootFeatures,
            HeadingFeature({ enabledHeadingSizes: ['h2', 'h3', 'h4'] }),
            FixedToolbarFeature(),
            InlineToolbarFeature(),
          ]
        },
      }),
      defaultValue: defaultFooterCopyRight,
      admin: {
        description: 'Copyright text to be dispalyed at the bottom of the footer',
      },
    },
  ],
  hooks: {
    beforeValidate: [validateTenantDocUniqueness('footer', 'Footer')],
    afterChange: [revalidateFooter],
  },
}
