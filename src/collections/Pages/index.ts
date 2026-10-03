import type { CollectionConfig } from 'payload'

import {
  accessCheckResolver,
  hiddenResolver,
  publishedOrPermission,
  versionsAccess,
} from '@/common/utils/access'
import { hiddenBannerField, hiddenFields } from '@/common/fields/hiddenFields'
import { syncHiddenToDoc } from '@/common/hooks/syncHiddenToDoc'

import { hero } from '@/heros/config'
import { slugField } from '@/fields/slug'
import { populatePublishedAt } from '../../hooks/populatePublishedAt'
import { generatePreviewPath } from '../../utilities/generatePreviewPath'
import { revalidateDelete, revalidatePage } from './hooks/revalidatePage'

import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields'
import { CallToAction } from '@/blocks/old/CallToAction/config'
import { FormBlock } from '@/blocks/old/Form/config'
import { MediaBlock } from '@/blocks/old/MediaBlock/config'
import { Content } from '@/blocks/old/Content/config'
import { Archive } from '@/blocks/old/ArchiveBlock/config'
import { SectionBlock } from '@/blocks/Section/config'
import { CSSNameWithCustomFiled } from '@/fields/css'
import { createdUpdatedByFields } from '@/fields/createdUpdatedByFields'
import { setCreatedUpdatedByCollection } from '@/hooks/setCreatedUpdatedBy'
import { populateFullSlug } from './hooks/populateFullSlug'
import { validateTenantSlugUniqueness } from '@/common/hooks/validateTenantSlugUniqueness'

export const Pages: CollectionConfig<'pages'> = {
  slug: 'pages',
  access: {
    create: accessCheckResolver('pages', 'create'),
    delete: accessCheckResolver('pages', 'delete', { hideable: true }),
    read: publishedOrPermission('pages', { hideable: true }),
    readVersions: versionsAccess('pages'),
    update: accessCheckResolver('pages', 'update', { hideable: true }),
  },
  // This config controls what's populated by default when a page is referenced
  // https://payloadcms.com/docs/queries/select#defaultpopulate-collection-config-property
  // Type safe if the collection slug generic is passed to `CollectionConfig` - `CollectionConfig<'pages'>
  defaultPopulate: {
    title: true,
    slug: true,
    category: true,
  },
  admin: {
    hidden: hiddenResolver('pages'),
    defaultColumns: ['title', 'slug', 'updatedAt'],
    livePreview: {
      url: ({ data, req }) => {
        const path = generatePreviewPath({
          slug: typeof data?.slug === 'string' ? data.slug : '',
          collection: 'pages',
          req,
        })

        return path
      },
    },
    preview: (data, { req }) =>
      generatePreviewPath({
        slug: typeof data?.slug === 'string' ? data.slug : '',
        collection: 'pages',
        req,
      }),
    useAsTitle: 'title',
  },
  fields: [
    hiddenBannerField,
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
    },
    {
      type: 'tabs',
      tabs: [
        {
          fields: [hero],
          label: 'Hero',
        },
        {
          fields: [
            {
              name: 'layout',
              type: 'blocks',
              blocks: [CallToAction, Content, MediaBlock, Archive, FormBlock, SectionBlock],
              required: true,
              admin: {
                initCollapsed: true,
              },
            },
          ],
          label: 'Content',
        },
        {
          fields: [...CSSNameWithCustomFiled],
          label: 'Advanced',
        },
        {
          name: 'meta',
          label: 'SEO',
          fields: [
            OverviewField({
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
              imagePath: 'meta.image',
            }),
            MetaTitleField({
              hasGenerateFn: true,
            }),
            MetaImageField({
              relationTo: 'media',
            }),

            MetaDescriptionField({}),
            PreviewField({
              // if the `generateUrl` function is configured
              hasGenerateFn: true,

              // field paths to match the target field for data
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
            }),
          ],
        },
      ],
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
      },
    },
    ...slugField(),
    {
      name: 'fullSlug',
      type: 'text',
      label: 'Full Slug',
      admin: {
        position: 'sidebar',
        readOnly: true,
        condition: (_, siblingData) => {
          return !!siblingData?.category
        },
        description:
          'This is the full slug of the page, including the category slug. It is used for SEO purposes and should not be changed.',
      },
    },
    {
      name: 'category',
      type: 'relationship',
      admin: {
        position: 'sidebar',
      },
      hasMany: false,
      relationTo: 'categories',
    },

    ...hiddenFields(),
    ...createdUpdatedByFields,
  ],
  indexes: [
    {
      fields: ['tenant', 'slug'],
      unique: true,
    },
  ],
  hooks: {
    afterChange: [syncHiddenToDoc, revalidatePage],
    beforeChange: [populatePublishedAt, setCreatedUpdatedByCollection, populateFullSlug],
    beforeValidate: [validateTenantSlugUniqueness('pages', 'page')],
    afterDelete: [revalidateDelete],
  },
  versions: {
    drafts: {
      autosave: {
        interval: 100, // We set this interval for optimal live preview
      },
      schedulePublish: true,
    },
    maxPerDoc: 50,
  },
}
