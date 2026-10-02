import type { CollectionConfig } from 'payload'

import { link } from '@/fields/link'
import { accessCheckResolver, isSuperUser } from '@/utilities/access'
import { validateTenantDocUniqueness } from '@/common/hooks/validateTenantDocUniqueness'
import { revalidateHeader } from './hooks/revalidateHeader'

export const Header: CollectionConfig = {
  slug: 'header',
  // one doc per business, so no plural in the admin nav
  labels: { singular: 'Header', plural: 'Header' },
  access: {
    read: () => true,
    update: accessCheckResolver('header', 'canUpdate'),
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
          RowLabel: '@/collections/Header/RowLabel#RowLabel',
        },
      },
    },
  ],
  hooks: {
    beforeValidate: [validateTenantDocUniqueness('header', 'Header')],
    afterChange: [revalidateHeader],
  },
}
