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

import { deleteMenuTables } from './hooks/deleteMenuTables'
import { validateMenuStaff } from './hooks/validateMenuStaff'
import { orderingTab } from './fields/ordering'
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
      // staff of this business only, also on drafts (rem0018 step 2)
      validateMenuStaff,
    ],
    afterChange: [syncHiddenToDoc, revalidateMenus],
    // a table belongs to one menu (rem0018 step 1c)
    beforeDelete: [deleteMenuTables],
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
    // in the main form, not the sidebar: editors need the address to share it (and for QR codes)
    {
      name: 'publicURL',
      type: 'ui',
      admin: {
        components: { Field: '@/collections/Menus/components/PublicURL#PublicURL' },
      },
    },
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
            // edited through the builder above (useField), so the raw picker is hidden
            {
              name: 'items',
              type: 'relationship',
              relationTo: 'menu-items',
              hasMany: true,
              label: 'Items on this menu',
              filterOptions: sameTenantFilter,
              admin: { hidden: true },
            },
          ],
        },
        { label: 'Page', fields: pageFields },
        orderingTab,
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
