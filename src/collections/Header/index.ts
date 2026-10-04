import type { CollectionConfig } from 'payload'

import { link } from '@/fields/link'
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
import { revalidateHeader } from './hooks/revalidateHeader'

export const Header: CollectionConfig = {
  slug: 'header',
  // one doc per business, so no plural in the admin nav
  labels: { singular: 'Header', plural: 'Header' },
  admin: {
    hidden: hiddenResolver('header'),
    livePreview: {
      url: async ({ data, req }) => {
        return (
          (await previewURL({
            collection: 'header',
            tenant: data?.tenant,
            req,
          })) ?? ''
        )
      },
    },
  },
  access: {
    read: publicOrVisible('header'),
    update: accessCheckResolver('header', 'update', { hideable: true }),
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
          RowLabel: '@/collections/Header/RowLabel#RowLabel',
        },
      },
    },
    ...hiddenFields({
      description: 'Hides it from other members in the admin only. The public site always uses it.',
    }),
    ...createdUpdatedByFields,
  ],
  hooks: {
    beforeValidate: [validateTenantDocUniqueness('header', 'Header')],
    beforeChange: [setCreatedUpdatedByCollection],
    afterChange: [revalidateHeader],
  },
}
