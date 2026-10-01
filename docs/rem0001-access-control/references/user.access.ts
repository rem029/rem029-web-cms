import CreatedByField from '@/common/fields/created-by'
import UpdatedByField from '@/common/fields/updated-by'
import { setUserCreatedOrUpdatedByCollection } from '@/common/hooks/user-update'
import { User, UsersAccess as UsersAccessType } from '@/payload-types'
import {
  accessCheckResolver,
  accessCheck,
  AccessAdmin,
  accessHiddenBySlug,
} from '@/utilities/access'
import { validateAccessSlugs } from '@/utilities/validations/user-access'
import { CollectionConfig, DefaultValue } from 'payload'
import { auditLogAfterChange, auditLogAfterDelete } from '@/common/hooks/audit-log'

const defValueSlugs: DefaultValue = async (args) => {
  const { req } = args

  const GLOBAL_SLUGS = req.payload.config.globals.map((g) => g.slug)
  const COLLECTION_SLUGS = req.payload.config.collections.map((c) => c.slug)

  try {
    const collections = COLLECTION_SLUGS.map((slug) => {
      return {
        slug: slug,
        hidden: true,
      }
    })

    const globals = GLOBAL_SLUGS.map((slug) => {
      return {
        slug: slug,
        hidden: true,
      }
    })

    return [...collections, ...globals]
  } catch {
    return undefined
  }
}

const SLUG = 'users-access'
const UsersAccess: CollectionConfig = {
  slug: SLUG,
  labels: {
    plural: 'Access',
    singular: 'Access',
  },
  admin: {
    useAsTitle: 'name',
    group: 'Admin',
    hidden: (u) => accessHiddenBySlug(u.user as unknown as User, SLUG) as boolean,
  },
  access: {
    read: accessCheckResolver(SLUG, 'read', {
      fallbackAccess: true,
      refineAccess: async (hasAccess, _, req) => {
        const { user, payload, pathname } = req
        const { logger } = payload
        const userAccess = (user as User).access as UsersAccessType

        if (!hasAccess) return false
        const accessSuper = await accessCheck(SLUG, 'super_user', { reqOverride: req })
        if (accessSuper) return true

        return { id: { equals: userAccess.id } }
      },
    }),
    admin: accessCheckResolver(SLUG, 'admin', { fallbackAccess: false }) as AccessAdmin,
    create: accessCheckResolver(SLUG, 'create', { fallbackAccess: false }),
    update: accessCheckResolver(SLUG, 'update', { fallbackAccess: false }),
    delete: accessCheckResolver(SLUG, 'delete', { fallbackAccess: false }),
  },
  timestamps: true,
  fields: [
    { name: 'name', label: 'Name', type: 'text', unique: true },
    {
      type: 'array',
      name: 'access',
      label: 'Access',
      validate: validateAccessSlugs,
      defaultValue: defValueSlugs,
      admin: {
        components: {
          RowLabel: {
            path: 'src/common/components/array-row-label.tsx',
            clientProps: { path: 'slug' },
          },
        },
      },
      fields: [
        { name: 'slug', label: 'Slug', type: 'text', required: true },
        {
          type: 'row',
          fields: [
            { type: 'checkbox', name: 'hidden' },
            { type: 'checkbox', name: 'read' },
            { type: 'checkbox', name: 'create' },
            { type: 'checkbox', name: 'update' },
            { type: 'checkbox', name: 'admin' },
            { type: 'checkbox', name: 'delete' },
            { type: 'checkbox', name: 'super_user', label: 'Super User' },
            { type: 'checkbox', name: 'access', label: 'API Access' },
          ],
        },
      ],
    },
    {
      label: 'Old ID',
      name: 'old_id',
      type: 'text',
      defaultValue: '',
      admin: { description: 'For migration purposes only', readOnly: true },
    },
    CreatedByField,
    UpdatedByField,
  ],
  hooks: {
    beforeChange: [setUserCreatedOrUpdatedByCollection],
    afterChange: [auditLogAfterChange(SLUG)],
    afterDelete: [auditLogAfterDelete(SLUG)],
  },
}

export default UsersAccess