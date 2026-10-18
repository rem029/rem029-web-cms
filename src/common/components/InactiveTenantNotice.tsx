'use client'

import React from 'react'
import { useAuth } from '@payloadcms/ui'
import { useTenantSelection } from '@payloadcms/plugin-multi-tenant/client'

import { extractTenantId } from '@/common/utils/tenantCollections'
import type { User } from '@/payload-types'

const hasIsActive = (val: unknown): val is { isActive?: boolean | null } =>
  typeof val === 'object' && val !== null && 'isActive' in val

export const InactiveTenantNotice: React.FC = () => {
  const { user } = useAuth<User>()
  const { selectedTenantID } = useTenantSelection()

  // inline, not isActiveSuperUser: access.ts pulls server-only payload code into the client bundle
  if (!user || (user.super_user === true && user.is_disabled !== true)) {
    return null
  }

  const selectedId = extractTenantId(selectedTenantID)
  if (selectedId === null) {
    return null
  }

  if (!user.tenants || !Array.isArray(user.tenants)) {
    return null
  }

  const selectedRow = user.tenants.find((row) => extractTenantId(row?.tenant) === selectedId)
  if (!selectedRow) {
    return null
  }

  const tenant = selectedRow.tenant
  if (!hasIsActive(tenant) || tenant.isActive !== false) {
    return null
  }

  return (
    <div className="admin-notice admin-notice--page" role="status">
      This business is inactive, so its content is read-only. Contact support to reactivate it.
    </div>
  )
}
