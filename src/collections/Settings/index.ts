import { createdUpdatedByFields } from '@/fields/createdUpdatedByFields'
import { setCreatedUpdatedByCollection } from '@/hooks/setCreatedUpdatedBy'
import {
  accessCheckResolver,
  hiddenResolver,
  isSuperUser,
  publicOrVisible,
} from '@/common/utils/access'
import { hiddenBannerField, hiddenFields } from '@/common/fields/hiddenFields'
import { validateTenantDocUniqueness } from '@/common/hooks/validateTenantDocUniqueness'
import type { CollectionConfig } from 'payload'
import { validateHomepageTenant } from './hooks/validateHomepageTenant'

export const Settings: CollectionConfig = {
  slug: 'settings',
  labels: { singular: 'Settings', plural: 'Settings' },
  access: {
    read: publicOrVisible('settings'),
    update: accessCheckResolver('settings', 'update', { hideable: true }),
    create: isSuperUser,
    delete: isSuperUser,
  },
  admin: {
    group: 'Admin',
    hidden: hiddenResolver('settings'),
  },
  fields: [
    hiddenBannerField,
    { type: 'upload', relationTo: 'media', name: 'favicon', label: 'Favicon', localized: true },
    { type: 'upload', relationTo: 'media', name: 'logo', label: 'Logo', localized: true },
    {
      type: 'group',
      name: 'localeSwitch',
      label: 'Locale Switch',
      fields: [
        { type: 'checkbox', name: 'enableLocaleHeader', label: 'Show on Header' },
        { type: 'checkbox', name: 'enableLocaleFooter', label: 'Show on Footer' },
      ],
    },
    {
      type: 'text',
      name: 'siteName',
      label: 'SiteName',
      defaultValue: 'CMS Website',
      localized: true,
    },
    {
      name: 'homepageNotice',
      type: 'ui',
      admin: {
        components: {
          Field: '@/collections/Settings/components/HomepageNotice#HomepageNotice',
        },
      },
    },
    {
      type: 'relationship',
      name: 'homepage',
      label: 'Homepage',
      hasMany: false,
      relationTo: 'pages',
      required: false,
      admin: { description: 'The page visitors see at your site address (/).' },
      filterOptions: ({ data }) => {
        const tenantId = typeof data?.tenant === 'object' ? data?.tenant?.id : data?.tenant
        return tenantId ? { tenant: { equals: tenantId } } : false
      },
      validate: validateHomepageTenant,
    },
    {
      type: 'group',
      name: 'contact',
      label: 'Contact Information',
      fields: [
        {
          type: 'text',
          name: 'email',
          label: 'Email Address',
        },
        {
          type: 'text',
          name: 'phone',
          label: 'Phone Number',
        },
        {
          type: 'text',
          name: 'fax',
          label: 'Fax Number',
        },
      ],
    },
    {
      type: 'group',
      name: 'address',
      label: 'Address Information',
      fields: [
        {
          type: 'textarea',
          name: 'full_address',
          label: 'Full Address',
        },
      ],
    },
    {
      type: 'group',
      name: 'socialMedia',
      label: 'Social Media',
      fields: [
        {
          type: 'text',
          name: 'facebook',
          label: 'Facebook URL',
        },
        {
          type: 'text',
          name: 'twitter',
          label: 'Twitter/X URL',
        },
        {
          type: 'text',
          name: 'instagram',
          label: 'Instagram URL',
        },
        {
          type: 'text',
          name: 'linkedin',
          label: 'LinkedIn URL',
        },
        {
          type: 'text',
          name: 'youtube',
          label: 'YouTube URL',
        },
        {
          type: 'text',
          name: 'pinterest',
          label: 'Pinterest URL',
        },
        {
          type: 'text',
          name: 'tiktok',
          label: 'TikTok URL',
        },
        {
          type: 'text',
          name: 'whatsapp',
          label: 'Whatsapp URL',
        },
      ],
    },
    ...hiddenFields({
      description: 'Hides it from other members in the admin only. The public site always uses it.',
    }),
    ...createdUpdatedByFields,
  ],
  hooks: {
    beforeValidate: [validateTenantDocUniqueness('settings', 'Settings')],
    beforeChange: [setCreatedUpdatedByCollection],
  },
}
