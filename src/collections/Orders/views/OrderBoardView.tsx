import { notFound, redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'
import React from 'react'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'

import { BOARD_LABELS } from '@/common/components/OrderBoard/labels'
import { getSelectedTenant } from '@/common/utils/getSelectedTenant'
import { staffRolesFor, type StaffRole } from '@/common/utils/staffRoles'

const isStaffRole = (val: unknown): val is StaffRole =>
  val === 'waiter' || val === 'kitchen' || val === 'cashier'

/**
 * The staff boards (rem0018 phase 4 step 1): one admin view for the three paths
 * `/admin/orders/waiter|kitchen|cashier` (`admin.components.views.orderBoard`, path
 * `/orders/:role`).
 * 1. role = the `role` segment (`params.segments[1]`); not waiter / kitchen / cashier → Payload's
 *    `notFound()`
 * 2. no user → redirect to the login (Payload's default for custom views does not)
 * 3. tenant = `getSelectedTenant(initPageResult.req)`; none → "Pick a business in the tenant
 *    selector" notice (`.admin-notice`)
 * 4. `staffRolesFor(user, tenant)` lacks the role → "You don't work on the <role> board of this
 *    business" notice (no board, the stream would 403 anyway)
 * 5. render inside `DefaultTemplate` (Payload's nav and header) the board for `{ role, tenantId }`
 *    (step 2: `<OrderBoard role tenantId />`; step 1 renders a heading only)
 */
export const OrderBoardView: React.FC<AdminViewServerProps> = (props) => {
  const rawSegments = props.params?.segments
  const segments = Array.isArray(rawSegments) ? rawSegments : []
  const role = segments[1]
  if (!isStaffRole(role)) {
    notFound()
  }

  const { req } = props.initPageResult
  const user = req.user
  if (!user) {
    redirect('/admin/login')
  }

  const tenantId = getSelectedTenant(req)

  let body: React.ReactNode
  if (!tenantId) {
    req.payload.logger.warn({
      msg: 'order board: no tenant selected',
      userId: user.id,
      tenantId: null,
      role,
    })
    body = (
      <div className="admin-notice">Pick a business in the tenant selector to open its board.</div>
    )
  } else if (!staffRolesFor(user, tenantId).includes(role)) {
    req.payload.logger.warn({
      msg: 'order board: missing role',
      userId: user.id,
      tenantId,
      role,
    })
    body = (
      <div className="admin-notice">You don&apos;t work on the {role} board of this business.</div>
    )
  } else {
    body = <p>The board comes in the next step.</p>
  }

  return (
    <DefaultTemplate
      i18n={props.i18n}
      locale={props.locale ?? props.initPageResult.locale}
      params={props.params}
      payload={props.payload}
      permissions={props.permissions ?? props.initPageResult.permissions}
      req={req}
      searchParams={props.searchParams}
      user={props.user ?? user}
      visibleEntities={props.visibleEntities ?? props.initPageResult.visibleEntities}
    >
      <Gutter>
        <h1>{BOARD_LABELS[role]}</h1>
        {body}
      </Gutter>
    </DefaultTemplate>
  )
}

export default OrderBoardView
