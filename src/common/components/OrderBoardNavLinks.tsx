'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { useTenantSelection } from '@payloadcms/plugin-multi-tenant/client'

import { getBoardRolesAction } from '@/common/components/OrderBoard/actions'
import { BOARD_LABELS } from '@/common/components/OrderBoard/labels'
import type { StaffRole } from '@/common/utils/staffRoles'
import { extractTenantId } from '@/common/utils/tenantCollections'

/**
 * Links to the staff boards in the admin nav (rem0018 phase 4 step 1, `admin.components.
 * afterNavLinks`): one per role the user holds in the selected tenant, "Waiter board",
 * "Kitchen board", "Cashier board" → `/admin/orders/<role>`. None → renders nothing.
 * Client side because the tenant selector changes without a reload:
 * 1. `useTenantSelection().selectedTenantID` (as `InactiveTenantNotice`); none → null
 * 2. on change, `getBoardRolesAction(tenantId)` (server: `staffRolesFor`, so no access code in
 *    the browser bundle); a failed call → no links, `console.warn` once
 * 3. links with Payload's nav classes (`nav__link`), the current path marked active
 *    (`usePathname`)
 */
export const OrderBoardNavLinks: React.FC = () => {
  const { selectedTenantID } = useTenantSelection()
  const pathname = usePathname()
  const [roles, setRoles] = useState<StaffRole[]>([])

  const tenantId = extractTenantId(selectedTenantID)

  useEffect(() => {
    let cancelled = false

    if (tenantId === null) {
      setRoles([])
      return
    }

    void getBoardRolesAction(tenantId)
      .then((result) => {
        if (cancelled) return
        if (result.ok) {
          setRoles(result.data)
        } else {
          console.warn('order board: failed to load roles', result.message)
          setRoles([])
        }
      })
      .catch((err) => {
        if (cancelled) return
        console.warn('order board: failed to load roles', err)
        setRoles([])
      })

    return () => {
      cancelled = true
    }
  }, [tenantId])

  if (roles.length === 0) {
    return null
  }

  return (
    <>
      {roles.map((role) => {
        const href = `/admin/orders/${role}`
        const isActive = pathname === href
        return (
          <Link
            aria-current={isActive ? 'page' : undefined}
            className="nav__link"
            href={href}
            key={role}
          >
            {BOARD_LABELS[role]}
          </Link>
        )
      })}
    </>
  )
}
