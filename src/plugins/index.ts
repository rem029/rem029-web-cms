import { payloadCloudPlugin } from '@payloadcms/payload-cloud'
import { s3Storage } from '@payloadcms/storage-s3'
import { formBuilderPlugin, fields } from '@payloadcms/plugin-form-builder'
import { nestedDocsPlugin } from '@payloadcms/plugin-nested-docs'
import { redirectsPlugin } from '@payloadcms/plugin-redirects'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { searchPlugin } from '@payloadcms/plugin-search'
import type { Block, CollectionSlug, Field, FieldAccess, Plugin } from 'payload'
import { revalidateRedirects } from '@/hooks/revalidateRedirects'
import { GenerateTitle, GenerateURL } from '@payloadcms/plugin-seo/types'
import { FixedToolbarFeature, HeadingFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import { searchFields } from '@/search/fieldOverrides'
import { beforeSyncWithSearch } from '@/search/beforeSync'

import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import { setFormSubmissionTenant } from '@/plugins/hooks/setFormSubmissionTenant'
import { enforceTenantMembership } from '@/common/hooks/enforceTenantMembership'
import { accessCheckResolver, hiddenResolver } from '@/common/utils/access'

import { Config, Page, Post } from '@/payload-types'
import { getServerSideURL } from '@/utilities/getURL'
import { iconField } from '@/fields/icon'

const generateTitle: GenerateTitle<Post | Page> = ({ doc }) => {
  return doc?.title ? `${doc.title} | CMS Website` : 'CMS Website'
}

const generateURL: GenerateURL<Post | Page> = ({ doc }) => {
  const url = getServerSideURL()

  return doc?.slug ? `${url}/${doc.slug}` : url
}

const addFormmBuilderField = (fieldName: string, newFields: Field[]) => {
  return { ...fields[fieldName], fields: [...(fields[fieldName] as Block).fields, ...newFields] }
}

const tenantScopedCollections: CollectionSlug[] = [
  'pages',
  'posts',
  'media',
  'categories',
  'analytics',
  'redirects',
  'forms',
  'form-submissions',
  'search',
]

// one doc per tenant (were globals before multi-tenancy)
const tenantGlobalCollections: CollectionSlug[] = ['header', 'footer', 'theme', 'settings']

const isSuperUser: FieldAccess = ({ req }) => Boolean(req.user?.super_user)

// form submissions take their tenant from the form (setFormSubmissionTenant), so anyone,
// signed in or not, can submit any tenant's public form
const membershipCheckedCollections: CollectionSlug[] = [
  ...tenantScopedCollections.filter((slug) => slug !== 'form-submissions'),
  ...tenantGlobalCollections,
]

// runs after multiTenantPlugin so plugin-created collections (redirects, forms, search) exist
const addTenantMembershipCheck: Plugin = (config) => ({
  ...config,
  collections: config.collections?.map((collection) => {
    if (!membershipCheckedCollections.includes(collection.slug as CollectionSlug)) return collection
    return {
      ...collection,
      hooks: {
        ...collection.hooks,
        beforeChange: [enforceTenantMembership, ...(collection.hooks?.beforeChange ?? [])],
      },
    }
  }),
})

// plugin collections: the ops a plugin leaves open to any signed-in user come from the profile
// instead, and so does the nav. public ops stay as the plugins set them (forms/redirects/search
// read, form-submissions create); form-submissions update stays off.
const profileGatedOps: Partial<
  Record<CollectionSlug, ('read' | 'create' | 'update' | 'delete')[]>
> = {
  forms: ['create', 'update', 'delete'],
  'form-submissions': ['read', 'delete'],
  redirects: ['create', 'update', 'delete'],
  search: ['update', 'delete'],
}

const gatePluginCollections: Plugin = (config) => ({
  ...config,
  collections: config.collections?.map((collection) => {
    const slug = collection.slug as CollectionSlug
    const ops = profileGatedOps[slug]
    if (!ops) return collection
    return {
      ...collection,
      access: {
        ...collection.access,
        ...Object.fromEntries(ops.map((op) => [op, accessCheckResolver(slug, op)])),
      },
      admin: { ...collection.admin, hidden: hiddenResolver(slug) },
    }
  }),
})

export const plugins: Plugin[] = [
  redirectsPlugin({
    collections: ['pages', 'posts'],
    overrides: {
      indexes: [
        {
          fields: ['tenant', 'from'],
          unique: true,
        },
      ],
      // @ts-expect-error - This is a valid override, mapped fields don't resolve to the same type
      fields: ({ defaultFields }) => {
        return defaultFields.map((field) => {
          if ('name' in field && field.name === 'from') {
            return {
              ...field,
              admin: {
                description: 'You will need to rebuild the website when changing this field.',
              },
            }
          }
          return field
        })
      },
      hooks: {
        afterChange: [revalidateRedirects],
      },
    },
  }),
  nestedDocsPlugin({
    collections: ['categories'],
    generateURL: (docs) => docs.reduce((url, doc) => `${url}/${doc.slug}`, ''),
  }),
  seoPlugin({
    generateTitle,
    generateURL,
  }),
  formBuilderPlugin({
    fields: {
      payment: false,
      text: addFormmBuilderField('text', [iconField]),
      select: addFormmBuilderField('select', [iconField]),
      email: addFormmBuilderField('email', [iconField]),
      number: addFormmBuilderField('number', [iconField]),
      country: addFormmBuilderField('country', [iconField]),
      state: addFormmBuilderField('state', [iconField]),
    },
    formOverrides: {
      fields: ({ defaultFields }) => {
        return defaultFields.map((field) => {
          if ('name' in field && field.name === 'confirmationMessage') {
            return {
              ...field,
              editor: lexicalEditor({
                features: ({ rootFeatures }) => {
                  return [
                    ...rootFeatures,
                    FixedToolbarFeature(),
                    HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
                  ]
                },
              }),
            }
          }
          return field
        })
      },
    },
    formSubmissionOverrides: {
      hooks: {
        beforeValidate: [setFormSubmissionTenant],
      },
    },
  }),
  searchPlugin({
    collections: ['posts'],
    beforeSync: beforeSyncWithSearch,
    searchOverrides: {
      fields: ({ defaultFields }) => {
        return [...defaultFields, ...searchFields]
      },
    },
  }),
  multiTenantPlugin<Config>({
    collections: {
      ...Object.fromEntries(tenantScopedCollections.map((slug) => [slug, {}])),
      ...Object.fromEntries(tenantGlobalCollections.map((slug) => [slug, { isGlobal: true }])),
    },
    tenantsArrayField: {
      includeDefaultField: true,
      // only super users manage memberships for now; tenant admins come in phase 3
      arrayFieldAccess: { create: isSuperUser, update: isSuperUser },
    },
    userHasAccessToAllTenants: (user) => Boolean(user?.super_user),
    tenantSelectorLabel: { en: 'Business', ar: 'النشاط التجاري' },
    // deleting a tenant must never hard-delete its documents; deactivate it with `isActive`
    cleanupAfterTenantDelete: false,
  }),
  addTenantMembershipCheck,
  gatePluginCollections,
  payloadCloudPlugin(),
  ...(process.env.S3_ENDPOINT
    ? [
        s3Storage({
          collections: {
            media: true,
          },
          bucket: process.env.S3_BUCKET || '',
          config: {
            forcePathStyle: true,
            endpoint: process.env.S3_ENDPOINT,
            credentials: {
              accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
              secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
            },
            region: process.env.S3_REGION,
          },
        }),
      ]
    : []),
]
