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
import {
  accessCheckResolver,
  hiddenResolver,
  isSuperUser,
  publicOrVisible,
} from '@/common/utils/access'
import { hiddenBannerField, hiddenFields } from '@/common/fields/hiddenFields'
import { createdUpdatedByFields } from '@/fields/createdUpdatedByFields'
import { setCreatedUpdatedByCollection } from '@/hooks/setCreatedUpdatedBy'
import { validateTenantDocUniqueness } from '@/common/hooks/validateTenantDocUniqueness'
import { previewURL } from '@/common/utils/preview'

export const Footer: CollectionConfig = {
  slug: 'footer',
  // one doc per business, so no plural in the admin nav
  labels: { singular: 'Footer', plural: 'Footer' },
  admin: {
    hidden: hiddenResolver('footer'),
    livePreview: {
      url: async ({ data, req }) => {
        return (
          (await previewURL({
            collection: 'footer',
            tenant: data?.tenant,
            req,
          })) ?? ''
        )
      },
    },
  },
  access: {
    read: publicOrVisible('footer'),
    update: accessCheckResolver('footer', 'update', { hideable: true }),
    create: isSuperUser,
    delete: isSuperUser,
  },
  fields: [
    hiddenBannerField,
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
    ...hiddenFields({
      description: 'Hides it from other members in the admin only. The public site always uses it.',
    }),
    ...createdUpdatedByFields,
  ],
  hooks: {
    beforeValidate: [validateTenantDocUniqueness('footer', 'Footer')],
    beforeChange: [setCreatedUpdatedByCollection],
    afterChange: [revalidateFooter],
  },
}
