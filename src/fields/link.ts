import type { Field, GroupField } from 'payload'

import { extractTenantId } from '@/common/utils/tenantCollections'
import deepMerge from '@/utilities/deepMerge'

export type LinkAppearances = 'default' | 'outline'

export const appearanceOptions: Record<LinkAppearances, { label: string; value: string }> = {
  default: {
    label: 'Default',
    value: 'default',
  },
  outline: {
    label: 'Outline',
    value: 'outline',
  },
}

type LinkType = (options?: {
  appearances?: LinkAppearances[] | false
  disableLabel?: boolean
  enableGrouping?: boolean
  overrides?: Partial<GroupField>
}) => Field

export const link: LinkType = ({
  appearances,
  disableLabel = false,
  enableGrouping = false,
  overrides = {},
} = {}) => {
  const linkResult: GroupField = {
    name: 'link',
    type: 'group',
    admin: {
      hideGutter: true,
    },
    fields: [
      {
        type: 'row',
        fields: [
          {
            name: 'type',
            type: 'radio',
            admin: {
              layout: 'horizontal',
              width: '50%',
            },
            defaultValue: 'reference',
            options: [
              {
                label: 'Internal link',
                value: 'reference',
              },
              {
                label: 'Custom URL',
                value: 'custom',
              },
              // the business's list of menus, `/menu` (rem0017)
              {
                label: 'Our menus',
                value: 'menus',
              },
              ...(enableGrouping
                ? [
                    {
                      label: 'Group',
                      value: 'group',
                    },
                  ]
                : []),
            ],
          },
          {
            name: 'newTab',
            type: 'checkbox',
            admin: {
              style: {
                alignSelf: 'flex-end',
              },
              width: '50%',
            },
            label: 'Open in new tab',
          },
        ],
      },
    ],
  }

  const linkTypes: Field[] = [
    {
      name: 'reference',
      type: 'relationship',
      admin: {
        condition: (_, siblingData) => siblingData?.type === 'reference',
        width: '50%',
      },
      label: 'Document to link to',
      // a menu opens at /menu/<slug> (rem0017); only menus of the doc's own business: the
      // multi-tenant plugin adds no tenant filter to a relationship to several collections
      relationTo: ['pages', 'posts', 'menus'],
      filterOptions: ({ relationTo, data }) => {
        if (relationTo !== 'menus') return true
        const tenantId = extractTenantId(data?.tenant)
        return tenantId !== null ? { tenant: { equals: tenantId } } : false
      },
      required: true,
    },
    {
      name: 'url',
      type: 'text',
      admin: {
        condition: (_, siblingData) => siblingData?.type === 'custom',
        width: '50%',
      },
      label: 'Custom URL',
      required: true,
    },
    {
      name: 'items',
      type: 'array',
      required: true,
      admin: {
        condition: (_, siblingData) => siblingData?.type === 'group',
        width: '50%',
      },
      fields: [
        { type: 'text', name: 'URL', label: 'URL' },
        { type: 'text', name: 'label', label: 'Label', localized: true },
      ],
    },
  ]

  if (!disableLabel) {
    linkTypes.map((linkType) => ({
      ...linkType,
      admin: {
        ...linkType.admin,
        width: '50%',
      },
    }))

    linkResult.fields.push({
      type: 'row',
      fields: [
        ...linkTypes,
        {
          name: 'label',
          type: 'text',
          label: 'Label',
          admin: { width: '50%' },
          required: true,
          localized: true,
        },
      ],
    })
  } else {
    linkResult.fields = [...linkResult.fields, ...linkTypes]
  }

  if (appearances !== false) {
    let appearanceOptionsToUse = [appearanceOptions.default, appearanceOptions.outline]

    if (appearances) {
      appearanceOptionsToUse = appearances.map((appearance) => appearanceOptions[appearance])
    }

    linkResult.fields.push({
      name: 'appearance',
      type: 'select',
      admin: {
        description: 'Choose how the link should be rendered.',
      },
      defaultValue: 'default',
      options: appearanceOptionsToUse,
    })
  }

  return deepMerge(linkResult, overrides)
}
