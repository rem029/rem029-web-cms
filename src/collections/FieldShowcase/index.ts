import type { CollectionConfig } from 'payload'

import { showcaseFields } from '@/common/fields/showcaseFields'
import { accessCheckResolver, hiddenResolver } from '@/common/utils/access'

import { sameTenant } from './utils/sameTenant'

const SLUG = 'field-showcase'

/**
 * The field showcase (rem0005): every field type in one doc per tenant, to check the admin theme
 * (`showcaseFields`). Its Relations tab keeps every picker in the doc's own tenant and has the
 * join; the `field-showcase-global` global shows the global edit view.
 */
export const FieldShowcase: CollectionConfig = {
  slug: SLUG,
  labels: { singular: 'Field showcase', plural: 'Field showcase' },
  admin: {
    group: 'Dev',
    useAsTitle: 'title',
    defaultColumns: ['title', 'stage', 'selectSingle', 'updatedAt'],
    hidden: hiddenResolver(SLUG),
  },
  versions: {
    drafts: true,
  },
  // read too: published showcase docs are not public (publishedOrPermission would make them so)
  access: {
    read: accessCheckResolver(SLUG, 'read'),
    create: accessCheckResolver(SLUG, 'create'),
    update: accessCheckResolver(SLUG, 'update'),
    delete: accessCheckResolver(SLUG, 'delete'),
  },
  fields: showcaseFields([
    {
      name: 'parent',
      type: 'relationship',
      relationTo: SLUG,
      filterOptions: sameTenant,
      admin: { description: 'Children of a doc show in its Children list below.' },
    },
    { name: 'people', type: 'relationship', relationTo: 'users', hasMany: true },
    {
      name: 'related',
      label: 'Page or post',
      type: 'relationship',
      relationTo: ['pages', 'posts'],
      filterOptions: sameTenant,
    },
    { name: 'image', type: 'upload', relationTo: 'media', filterOptions: sameTenant },
    {
      name: 'gallery',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      filterOptions: sameTenant,
    },
    { name: 'children', type: 'join', collection: SLUG, on: 'parent' },
    {
      name: 'pageDrawer',
      label: 'Relationship (drawer)',
      type: 'relationship',
      relationTo: 'pages',
      filterOptions: sameTenant,
      admin: { appearance: 'drawer', description: 'Picks from a list in a side drawer.' },
    },
    {
      name: 'pagesDrawer',
      label: 'Relationship (drawer, has many)',
      type: 'relationship',
      relationTo: 'pages',
      hasMany: true,
      filterOptions: sameTenant,
      admin: { appearance: 'drawer' },
    },
  ]),
}
