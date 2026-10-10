import { payloadCloudPlugin } from '@payloadcms/payload-cloud'
import { s3Storage } from '@payloadcms/storage-s3'
import { formBuilderPlugin, fields } from '@payloadcms/plugin-form-builder'
import { nestedDocsPlugin } from '@payloadcms/plugin-nested-docs'
import { redirectsPlugin } from '@payloadcms/plugin-redirects'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { searchPlugin } from '@payloadcms/plugin-search'
import type { Block, CollectionSlug, Field, Plugin, Where } from 'payload'
import { revalidateRedirects } from '@/hooks/revalidateRedirects'
import { GenerateTitle, GenerateURL } from '@payloadcms/plugin-seo/types'
import { FixedToolbarFeature, HeadingFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import { searchFields } from '@/search/fieldOverrides'
import { beforeSyncWithSearch } from '@/search/beforeSync'

import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import { setFormSubmissionTenant } from '@/plugins/hooks/setFormSubmissionTenant'
import { enforceTenantMembership } from '@/common/hooks/enforceTenantMembership'
import {
  accessCheckResolver,
  canManageTenantRows,
  hiddenResolver,
  isActiveSuperUser,
  showToTenantManagers,
} from '@/common/utils/access'
import {
  extractTenantId,
  tenantGlobalCollections,
  tenantScopedCollections,
} from '@/common/utils/tenantCollections'
import { TEMPLATE_WHERE } from '@/collections/UsersAccess/utils/access'
import { filterTenantRowsForReader } from '@/collections/Users/hooks/filterTenantRowsForReader'
import { createdUpdatedByFields } from '@/common/fields/createdUpdatedBy'
import { setCreatedUpdatedBy } from '@/common/hooks/setCreatedUpdatedBy'
import { createdUpdatedByCollections } from '@/common/utils/createdUpdatedByCollections'

import { Config, Page, Post } from '@/payload-types'
import { getServerSideURL, getTenantURL } from '@/utilities/getURL'
import { iconField } from '@/fields/icon'

const generateTitle: GenerateTitle<Post | Page> = ({ doc }) => {
  return doc?.title ? `${doc.title} | CMS Website` : 'CMS Website'
}

// the doc's own tenant url, so previews and canonical urls point at the tenant's site
const generateURL: GenerateURL<Post | Page> = async ({ doc, req }) => {
  const path = !doc?.slug || doc.slug === 'home' ? '' : doc.slug
  const tenantId = extractTenantId(doc?.tenant)
  const { docs } = tenantId
    ? await req.payload.find({
        collection: 'tenants',
        where: { id: { equals: tenantId } },
        limit: 1,
        depth: 0,
        req,
      })
    : { docs: [] }
  if (!docs[0]) {
    req.payload.logger.warn({ msg: 'seo generateURL: no tenant', tenantId, docId: doc?.id })
    return `${getServerSideURL()}/${path}`
  }
  return `${getTenantURL(docs[0])}/${path}`
}

const isRecord = (val: unknown): val is Record<string, unknown> =>
  typeof val === 'object' && val !== null

const addFormmBuilderField = (fieldName: string, newFields: Field[]) => {
  return { ...fields[fieldName], fields: [...(fields[fieldName] as Block).fields, ...newFields] }
}

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

// createdBy / updatedBy on every listed collection, plugin collections included. runs after the
// plugins that create collections (forms, redirects), so they get them too
const addCreatedUpdatedBy: Plugin = (config) => ({
  ...config,
  collections: config.collections?.map((collection) => {
    if (!createdUpdatedByCollections.includes(collection.slug as CollectionSlug)) return collection
    return {
      ...collection,
      fields: [...collection.fields, ...createdUpdatedByFields],
      hooks: {
        ...collection.hooks,
        beforeChange: [...(collection.hooks?.beforeChange ?? []), setCreatedUpdatedBy],
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

// the multi-tenant plugin's `tenants` array on users: super users and tenant admins of any tenant see it in the admin
const showTenantsFieldToManagers: Plugin = (config) => ({
  ...config,
  collections: config.collections?.map((collection) => {
    if (collection.slug !== 'users') return collection
    return {
      ...collection,
      fields: collection.fields.map((field) =>
        field.type === 'array' && field.name === 'tenants'
          ? {
              ...field,
              admin: { ...field.admin, condition: showToTenantManagers },
              hooks: {
                ...field.hooks,
                afterRead: [filterTenantRowsForReader, ...(field.hooks?.afterRead ?? [])],
              },
            }
          : field,
      ),
    }
  }),
})

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
      fields: ({ defaultFields }) => {
        return defaultFields.map((field) => {
          if (field.type === 'text' && field.name === 'from') {
            return {
              ...field,
              admin: {
                ...field.admin,
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
      // users-access uses our own access control; the plugin's wrapper would AND
      // `tenant in <my tenants>` and hide the platform `default` profile (on the `admin` tenant)
      // from tenant admins of other tenants.
      'users-access': { useTenantAccess: false },
    },
    tenantsArrayField: {
      includeDefaultField: true,
      arrayFieldAccess: { create: canManageTenantRows, update: canManageTenantRows },
      rowFields: [
        {
          name: 'isTenantAdmin',
          type: 'checkbox',
          label: 'Tenant admin',
          defaultValue: false,
          access: { create: canManageTenantRows, update: canManageTenantRows },
          admin: {
            condition: (data, _sibling, ctx) =>
              showToTenantManagers(data, _sibling, ctx) && !data?.super_user,
            description: 'Manages this business: its content, members and access profiles.',
          },
        },
        {
          name: 'access',
          type: 'relationship',
          relationTo: 'users-access',
          access: { create: canManageTenantRows, update: canManageTenantRows },
          admin: {
            condition: (data, siblingData, ctx) =>
              showToTenantManagers(data, siblingData, ctx) &&
              !data?.super_user &&
              !siblingData?.isTenantAdmin,
            description:
              'What this user can see and do in this business. Tenant admins and super users bypass it.',
          },
          // Payload validates the saved value against filterOptions server-side:
          // own tenant or any template. Including the row's current access ID
          // prevents rejecting untouched rows (e.g. platform profiles assigned
          // earlier by super users) when a tenant admin saves.
          // The strict assignment rule is enforced in guardTenantRows for added/changed rows only.
          filterOptions: ({ siblingData, user }) => {
            if (isActiveSuperUser(user)) return true
            const rowTenant =
              isRecord(siblingData) && 'tenant' in siblingData
                ? extractTenantId(siblingData.tenant)
                : null
            const currentAccessId =
              isRecord(siblingData) && 'access' in siblingData
                ? extractTenantId(siblingData.access)
                : null

            const orConditions: Where[] = [TEMPLATE_WHERE]
            if (rowTenant !== null) {
              orConditions.unshift({ tenant: { equals: rowTenant } })
            }
            if (currentAccessId !== null) {
              orConditions.push({ id: { equals: currentAccessId } })
            }

            return { or: orConditions }
          },
        },
      ],
    },
    userHasAccessToAllTenants: (user) => isActiveSuperUser(user),
    tenantSelectorLabel: { en: 'Business', ar: 'النشاط التجاري' },
    // deleting a tenant must never hard-delete its documents; deactivate it with `isActive`
    cleanupAfterTenantDelete: false,
  }),
  addTenantMembershipCheck,
  addCreatedUpdatedBy,
  gatePluginCollections,
  showTenantsFieldToManagers,
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
