import { payloadCloudPlugin } from '@payloadcms/payload-cloud'
import type { Plugin } from 'payload'

import { addAuditLog } from '@/plugins/auditLog'
import { addCreatedUpdatedBy } from '@/plugins/createdUpdatedBy'
import { formBuilder } from '@/plugins/formBuilder'
import { gatePluginCollections } from '@/plugins/gatePluginCollections'
import { multiTenant } from '@/plugins/multiTenant'
import { nestedDocs } from '@/plugins/nestedDocs'
import { redirects } from '@/plugins/redirects'
import { search } from '@/plugins/search'
import { seo } from '@/plugins/seo'
import { storage } from '@/plugins/storage'
import { addTenantMembershipCheck } from '@/plugins/tenantMembershipCheck'
import { showTenantsFieldToManagers } from '@/plugins/tenantsFieldForManagers'

// order matters: the multi-tenant plugin runs after the plugins that create collections
// (redirects, forms, search), and our own plugins run after it, so they see every collection
export const plugins: Plugin[] = [
  redirects,
  nestedDocs,
  seo,
  formBuilder,
  search,
  multiTenant,
  addTenantMembershipCheck,
  addCreatedUpdatedBy,
  addAuditLog,
  gatePluginCollections,
  showTenantsFieldToManagers,
  payloadCloudPlugin(),
  ...storage,
]
