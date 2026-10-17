import type { CollectionConfig } from 'payload'
import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields'

import { hiddenBannerField, hiddenFields } from '@/common/fields/hiddenFields'
import { menuTitleField, sameTenantFilter } from '@/common/fields/menuFields'
import { syncHiddenToDoc } from '@/common/hooks/syncHiddenToDoc'
import { validateSameTenant, type SameTenantField } from '@/common/hooks/validateSameTenant'
import { validateTenantSlugUniqueness } from '@/common/hooks/validateTenantSlugUniqueness'
import {
  accessCheckResolver,
  hiddenResolver,
  publishedOrPermission,
  versionsAccess,
} from '@/common/utils/access'
import { previewURL } from '@/common/utils/preview'
import { slugField } from '@/fields/slug'

import { pageFields } from './fields/pageFields'
import { revalidateMenus, revalidateMenusDelete } from '@/common/hooks/revalidateMenus'

const SAME_TENANT: SameTenantField[] = [{ path: 'items', collection: 'menu-items', label: 'item' }]

const menuPreviewURL = async (
  data: Record<string, unknown> | undefined,
  req: Parameters<typeof previewURL>[0]['req'],
): Promise<string> =>
  (await previewURL({
    collection: 'menus',
    slug: typeof data?.slug === 'string' ? data.slug : '',
    tenant: data?.tenant,
    req,
  })) ?? ''

/**
 * Menus (rem0017 phase 2): a menu is the guest page at `/menu/<slug>` on its tenant's site. It
 * picks items from the tenant's catalog (the order is kept; the page groups them by category)
 * and sets its look with simple fields. Drafts, live preview and hidden documents like Pages.
 */
export const Menus: CollectionConfig<'menus'> = {
  slug: 'menus',
  labels: { singular: 'Menu', plural: 'Menus' },
  access: {
    create: accessCheckResolver('menus', 'create'),
    read: publishedOrPermission('menus', { hideable: true }),
    readVersions: versionsAccess('menus'),
    update: accessCheckResolver('menus', 'update', { hideable: true }),
    delete: accessCheckResolver('menus', 'delete', { hideable: true }),
  },
  admin: {
    group: 'Menu',
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', '_status', 'updatedAt'],
    hidden: hiddenResolver('menus'),
    livePreview: { url: ({ data, req }) => menuPreviewURL(data, req) },
    preview: (data, { req }) => menuPreviewURL(data, req),
  },
  defaultPopulate: { title: true, slug: true },
  indexes: [{ fields: ['tenant', 'slug'], unique: true }],
  hooks: {
    beforeValidate: [
      validateTenantSlugUniqueness('menus', 'menu'),
      validateSameTenant(SAME_TENANT),
    ],
    afterChange: [syncHiddenToDoc, revalidateMenus],
    afterDelete: [revalidateMenusDelete],
  },
  versions: {
    drafts: {
      autosave: { interval: 100 },
    },
    maxPerDoc: 50,
  },
  fields: [
    hiddenBannerField,
    menuTitleField,
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Items',
          description: 'Pick the items this menu shows. Guests see them grouped by category.',
          fields: [
            {
              name: 'builder',
              type: 'ui',
              admin: {
                components: { Field: '@/collections/Menus/components/MenuBuilder#MenuBuilder' },
              },
            },
            // implementation: `admin.hidden: true` here once the builder works (it edits this
            // field through useField; the raw picker stays visible until then)
            {
              name: 'items',
              type: 'relationship',
              relationTo: 'menu-items',
              hasMany: true,
              label: 'Items on this menu',
              filterOptions: sameTenantFilter,
            },
          ],
        },
        { label: 'Page', fields: pageFields },
        {
          name: 'meta',
          label: 'SEO',
          fields: [
            OverviewField({
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
              imagePath: 'meta.image',
            }),
            MetaTitleField({ hasGenerateFn: true }),
            MetaImageField({ relationTo: 'media' }),
            MetaDescriptionField({}),
            PreviewField({
              hasGenerateFn: true,
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
            }),
          ],
        },
      ],
    },
    ...slugField(),
    ...hiddenFields(),
  ],
}
