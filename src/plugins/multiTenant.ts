import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import type { Where } from 'payload'

import { TEMPLATE_WHERE } from '@/collections/UsersAccess/utils/access'
import { canManageTenantRows, isActiveSuperUser, showToTenantManagers } from '@/common/utils/access'
import {
  extractTenantId,
  tenantGlobalCollections,
  tenantScopedCollections,
} from '@/common/utils/tenantCollections'
import type { Config } from '@/payload-types'

const isRecord = (val: unknown): val is Record<string, unknown> =>
  typeof val === 'object' && val !== null

export const multiTenant = multiTenantPlugin<Config>({
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
            showToTenantManagers(data, siblingData, ctx) && !data?.super_user,
          description:
            'What this user can see and do in this business. Tenant admins: only its Audit Logs access counts. Super users bypass it.',
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
})
