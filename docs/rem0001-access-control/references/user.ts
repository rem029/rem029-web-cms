import { User } from '@/payload-types'
import {
  accessCheckResolver,
  accessCheck,
  AccessAdmin,
  accessHiddenBySlug,
} from '@/utilities/access'

import type { CollectionConfig, FilterOptions } from 'payload'
import { APIError } from 'payload'
import firstUserHook from './hooks/firstUser'
import CreatedByField from '@/common/fields/created-by'
import UpdatedByField from '@/common/fields/updated-by'
import { setUserCreatedOrUpdatedByCollection } from '@/common/hooks/user-update'
import { BACKEND_URL_WITH_BASE } from '@/utilities/constant'
import {
  auditLogAfterChange,
  auditLogAfterDelete,
  auditLogAfterLogin,
  auditLogAfterLogout,
} from '@/common/hooks/audit-log'

/**
 * Debt here. need to create migration to delete employee fields, keep only employee. But for now, keep both to avoid breaking changes.
 * Verify email not working
 */

const SLUG = 'users'

const filterByOperator: FilterOptions = ({ data }) => {
  const operator = data?.operator
  if (operator) {
    return {
      operator: {
        equals: typeof operator === 'object' ? operator.id : operator,
      },
    }
  }
  return false
}

export const Users: CollectionConfig = {
  slug: SLUG,
  labels: { singular: 'User', plural: 'Users' },
  admin: {
    useAsTitle: 'email',
    group: 'Admin',
    hidden: (u) => accessHiddenBySlug(u.user as unknown as User, SLUG) as boolean,
    defaultColumns: [
      'email',
      'full_name',
      'designation',
      'super_user',
      'h2a_oasys_emp_id',
      'access',
    ],
  },
  auth: {
    useAPIKey: true,
    tokenExpiration: 28800, // 8 hours
    verify: {
      generateEmailHTML: ({ token }) => {
        return `
        A new account has just been created for you to access ${BACKEND_URL_WITH_BASE}.
        
        Please click on the following link or paste the URL below into your browser to verify your email: ${BACKEND_URL_WITH_BASE}/admin/users/verify/${token}
        After verifying your email, you will be able to log in successfully.
        `
      },
    },
    forgotPassword: {
      generateEmailHTML: (args) => {
        return `
        You are receiving this because you (or someone else) have requested the reset of the password for your account.
        
        Please click on the following link, or paste this into your browser to complete the process: ${BACKEND_URL_WITH_BASE}/admin/reset/${args?.token || ''}
        
        If you did not request this, please ignore this email and your password will remain unchanged.
        `
      },
    },
  },
  fields: [
    {
      label: 'Full Name',
      name: 'full_name',
      type: 'text',
      defaultValue: '',
      admin: { description: 'eq. John Doe, Jane Doe' },
    },
    {
      label: 'Designation',
      name: 'designation',
      type: 'text',
      defaultValue: '',
      admin: { description: 'eq. Manager, Developer, Analyst, Senior Security' },
    },
    {
      label: 'Employee ID',
      name: 'h2a_oasys_emp_id',
      type: 'text',
      defaultValue: '',
      admin: { description: 'H2a Oasys Employee ID', readOnly: true },
    },
    {
      label: 'Date of Joining',
      name: 'doj',
      type: 'date',
      admin: { description: 'Employee Date of Joining', readOnly: true },
    },
    {
      label: 'Is super user?',
      name: 'super_user',
      type: 'checkbox',
      defaultValue: false,
      access: {
        read: async ({ req }) => {
          const hasAccess = await accessCheck(SLUG, 'super_user', { reqOverride: req })
          return hasAccess as boolean
        },
        create: async ({ req }) => {
          const hasAccess = await accessCheck(SLUG, 'super_user', { reqOverride: req })
          return hasAccess as boolean
        },
        update: async ({ req }) => {
          const hasAccess = await accessCheck(SLUG, 'super_user', { reqOverride: req })
          return hasAccess as boolean
        },
      },
      admin: { description: 'A super user has full access to all operators and settings.' },
    },
    {
      label: 'Access',
      name: 'access',
      type: 'relationship',
      relationTo: 'users-access',
      admin: {
        condition: (_, { super_user }) => !super_user,
        description: 'The access roles assigned to this user',
      },
      access: {
        read: async ({ req }) => {
          const hasAccess = await accessCheck('users-access', 'super_user', { reqOverride: req })
          return hasAccess as boolean
        },
        create: async ({ req }) => {
          const hasAccess = await accessCheck('users-access', 'super_user', { reqOverride: req })
          return hasAccess as boolean
        },
        update: async ({ req }) => {
          const hasAccess = await accessCheck('users-access', 'super_user', { reqOverride: req })
          return hasAccess as boolean
        },
      },
    },
    {
      label: 'Operator',
      name: 'operator',
      type: 'relationship',
      relationTo: 'operators',
      access: {
        read: async ({ req }) => {
          const hasAccess = await accessCheck('operators', 'read', { reqOverride: req })
          return hasAccess as boolean
        },
        create: async ({ req }) => {
          const hasAccess = await accessCheck('operators', 'create', { reqOverride: req })
          return hasAccess as boolean
        },
        update: async ({ req }) => {
          const hasAccess = await accessCheck('operators', 'update', { reqOverride: req })
          return hasAccess as boolean
        },
      },
      admin: {
        description:
          'The operator this user belongs to. Will restrict access to data within that operator.',
      },
    },
    {
      label: 'Department',
      name: 'department',
      type: 'relationship',
      relationTo: 'departments',
      filterOptions: filterByOperator,
      access: {
        read: async ({ req }) => {
          const hasAccess = await accessCheck('departments', 'read', { reqOverride: req })
          return hasAccess as boolean
        },
        create: async ({ req }) => {
          const hasAccess = await accessCheck('departments', 'create', { reqOverride: req })
          return hasAccess as boolean
        },
        update: async ({ req }) => {
          const hasAccess = await accessCheck('departments', 'update', { reqOverride: req })
          return hasAccess as boolean
        },
      },
      admin: {
        description: 'The department this user belongs to',
      },
    },
    {
      label: 'Restaurant',
      name: 'restaurant',
      type: 'relationship',
      relationTo: 'restaurants',
      admin: {
        appearance: 'drawer',
        description: 'The restaurant this user belongs to (if applicable).',
      },
      access: {
        read: async ({ req }) => {
          const hasAccess = await accessCheck('restaurants', 'read', { reqOverride: req })
          return hasAccess as boolean
        },
        create: async ({ req }) => {
          const hasAccess = await accessCheck('restaurants', 'create', { reqOverride: req })
          return hasAccess as boolean
        },
        update: async ({ req }) => {
          const hasAccess = await accessCheck('restaurants', 'update', { reqOverride: req })
          return hasAccess as boolean
        },
      },
      filterOptions: ({ data, user }) => {
        if ((user as unknown as User)?.super_user) return true
        const operatorId = typeof data?.operator === 'object' ? data?.operator?.id : data?.operator
        if (operatorId) {
          return {
            operator: { equals: operatorId },
          }
        }
        return false
      },
    },
    {
      label: 'Is Disabled?',
      name: 'is_disabled',
      type: 'checkbox',
      admin: {
        description: 'Whether the user is disabled',
      },
      access: {
        read: async ({ req }) => {
          const hasAccess = await accessCheck('users-access', 'super_user', { reqOverride: req })
          return hasAccess as boolean
        },
        create: async ({ req }) => {
          const hasAccess = await accessCheck('users-access', 'super_user', { reqOverride: req })
          return hasAccess as boolean
        },
        update: async ({ req }) => {
          const hasAccess = await accessCheck('users-access', 'super_user', { reqOverride: req })
          return hasAccess as boolean
        },
      },
    },
    {
      label: 'Authentication Method',
      name: 'auth_method',
      type: 'select',
      options: [
        { label: 'Credentials', value: 'credentials' },
        { label: 'Microsoft', value: 'microsoft' },
      ],
      admin: {
        description: 'The authentication method used for this user',
      },
      access: {
        read: ({ req }) => req?.user?.super_user || false,
        update: ({ req }) => req?.user?.super_user || false,
        create: ({ req }) => req?.user?.super_user || false,
      },
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
  access: {
    read: accessCheckResolver(SLUG, 'read', {
      fallbackAccess: false,
      refineAccess: async (hasAccess, _, req) => {
        const accessSuper = await accessCheck(SLUG, 'super_user', { reqOverride: req })
        if (accessSuper) return true
        if (!hasAccess) return false

        return { id: { equals: (req.user as User).id } }
      },
    }),
    admin: accessCheckResolver(SLUG, 'admin', { fallbackAccess: false }) as AccessAdmin,
    create: accessCheckResolver(SLUG, 'create', { fallbackAccess: false }),
    update: accessCheckResolver(SLUG, 'update', { fallbackAccess: false }),
    delete: accessCheckResolver(SLUG, 'delete', { fallbackAccess: false }),
  },
  hooks: {
    beforeChange: [firstUserHook, setUserCreatedOrUpdatedByCollection],
    beforeLogin: [
      async ({ req, user }) => {
        if (user && (user as User)?.is_disabled) {
          throw new APIError(
            'This account has been disabled. Please contact an administrator.',
            401,
          )
        }

        if (user && user.auth_method === 'microsoft' && !req.context.isMicrosoftLogin) {
          throw new APIError(
            'This account is configured for Microsoft SSO only. Please use the Microsoft login button.',
            401,
          )
        }

        if (user && user.auth_method === 'credentials' && req.context.isMicrosoftLogin) {
          throw new APIError('This account is configured for username/password login only.', 401)
        }
      },
    ],
    afterLogin: [auditLogAfterLogin],
    afterLogout: [auditLogAfterLogout],
    afterChange: [auditLogAfterChange(SLUG)],
    afterDelete: [auditLogAfterDelete(SLUG)],
  },
}