'use client'

import { Button } from '@payloadcms/ui'
import React from 'react'

import type { BoardContext } from '@/collections/Orders/utils/board'
import { ORDER_STATUSES } from '@/collections/Orders/utils/statuses'
import type { StaffRole } from '@/common/utils/staffRoles'
import type { Order } from '@/payload-types'

import { AssistanceBadge } from './AssistanceBadge'
import { orderButtons, type OrderButton } from './orderButtons'
import { OrderDisplay } from './OrderDisplay'
import { formatSince } from './timeLabels'
import { useNow } from './useNow'

export const getTableLabel = (table: Order['table']): string | null => {
  if (!table) return null
  if (typeof table === 'object' && 'label' in table && table.label) {
    return table.label
  }
  return `Table ${table}`
}

/**
 * One order on a board (rem0018 phase 4 step 2a, sdq `OrderCard`): header "Order 23" (big),
 * the table label, guest name, status badge, minutes since placed; request badges
 * (`AssistanceBadge`); the lines (`OrderDisplay`); then one Payload `Button` per
 * `orderButtons({ order, role, context })` (forward as primary, the rest secondary; Cancel opens
 * the ConfirmDialog in the board). `busy` disables the buttons while an action runs.
 * Class names `order-board__card` (`--request` while a request waits).
 */
export const OrderCard: React.FC<{
  order: Order
  role: StaffRole
  context: BoardContext
  busy: boolean
  onButton: (order: Order, button: OrderButton) => void
}> = ({ order, role, context, busy, onButton }) => {
  const tableLabel = getTableLabel(order.table)
  const statusLabel = ORDER_STATUSES.find((s) => s.value === order.status)?.label ?? order.status
  const placedAt = formatSince(order.createdAt, useNow())
  const hasRequest = Boolean(order.assistanceRequestedAt || order.billRequestedAt)

  const buttons = orderButtons({ order, role, context })
  const actionButtons = buttons.filter((b) => b.kind !== 'clearStaff' && b.kind !== 'clearBill')

  return (
    <article
      className={`order-board__card ${hasRequest ? 'order-board__card--request' : ''}`}
      aria-label={`Order ${order.orderNumber ?? order.id}`}
    >
      <header className="order-board__card-header">
        <div className="order-board__card-primary">
          <h3 className="order-board__card-number">Order {order.orderNumber ?? order.id}</h3>
          {tableLabel && <span className="order-board__card-table">{tableLabel}</span>}
          {order.guestName && <span className="order-board__card-guest">{order.guestName}</span>}
        </div>
        <div className="order-board__card-meta">
          <span className="order-board__card-status">{statusLabel}</span>
          <time className="order-board__card-time" dateTime={order.createdAt}>
            {placedAt}
          </time>
        </div>
      </header>

      {hasRequest && (
        <div className="order-board__card-requests">
          {order.assistanceRequestedAt && (
            <AssistanceBadge
              kind="staff"
              at={order.assistanceRequestedAt}
              onDone={() => onButton(order, { kind: 'clearStaff', label: 'Done' })}
            />
          )}
          {order.billRequestedAt && (
            <AssistanceBadge
              kind="bill"
              at={order.billRequestedAt}
              onDone={() => onButton(order, { kind: 'clearBill', label: 'Done' })}
            />
          )}
        </div>
      )}

      <OrderDisplay order={order} />

      {actionButtons.length > 0 && (
        <footer className="order-board__card-actions">
          {actionButtons.map((btn) => (
            <Button
              key={`${btn.kind}-${'to' in btn ? btn.to : ''}`}
              buttonStyle={btn.kind === 'forward' ? 'primary' : 'secondary'}
              size="large"
              margin={false}
              disabled={busy}
              onClick={() => onButton(order, btn)}
            >
              {btn.label}
            </Button>
          ))}
        </footer>
      )}
    </article>
  )
}
