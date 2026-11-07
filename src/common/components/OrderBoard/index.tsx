'use client'

import { Button } from '@payloadcms/ui'
import React, { useEffect, useMemo, useState } from 'react'

import type { BoardContext } from '@/collections/Orders/utils/board'
import { ORDER_STATUSES } from '@/collections/Orders/utils/statuses'
import { formatMinor } from '@/common/utils/money'
import type { StaffRole } from '@/common/utils/staffRoles'
import type { Order } from '@/payload-types'

import {
  clearAssistanceAction,
  getBoardContextAction,
  moveOrderAction,
  type BoardResult,
} from './actions'
import { ConfirmDialog } from './ConfirmDialog'
import type { OrderButton } from './orderButtons'
import { OrderCard } from './OrderCard'
import { UndoToast } from './UndoToast'
import { useBoardOrders } from './useBoardOrders'
import { useBoardSettings, type BoardTab } from './useBoardSettings'
import { useOrderStream } from './useOrderStream'

const TAB_OPTIONS: { id: BoardTab; label: string; roles: StaffRole[] }[] = [
  { id: 'active', label: 'Active', roles: ['waiter', 'kitchen', 'cashier'] },
  { id: 'history', label: 'History', roles: ['waiter', 'kitchen', 'cashier'] },
  { id: 'unpaid', label: 'Unpaid', roles: ['cashier'] },
  { id: 'earlier', label: 'Earlier days', roles: ['cashier'] },
  { id: 'refundDue', label: 'Refund due', roles: ['cashier'] },
]

const shiftDay = (dateStr: string, deltaDays: number): string => {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y ?? 2026, (m ?? 1) - 1, (d ?? 1) + deltaDays))
  return dt.toISOString().slice(0, 10)
}

/** "Fri 6 Nov" for a business day `YYYY-MM-DD` (read as UTC, so the device's zone can't shift it). */
const formatDay = (dateStr: string): string =>
  new Date(`${dateStr}T00:00:00Z`).toLocaleDateString('en', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })

const EMPTY_LABELS: Record<BoardTab, string> = {
  active: 'No orders waiting',
  history: 'No orders on this day',
  unpaid: 'No unpaid orders',
  earlier: 'No open orders from earlier days',
  refundDue: 'No refunds due',
}

const OrderBoardLoaded: React.FC<{ context: BoardContext; role: StaffRole }> = ({
  context,
  role,
}) => {
  const menuIds = useMemo(() => context.menus.map((m) => m.id), [context.menus])

  const { menuId, setMenuId, tab, setTab } = useBoardSettings({
    userId: context.userId,
    tenantId: context.tenantId,
    role,
    menuIds,
  })

  const {
    orders,
    payments,
    loading,
    error: loadError,
    page,
    totalPages,
    setPage,
    date,
    setDate,
    refetch,
    applyEvent,
    replaceOrder,
  } = useBoardOrders({ context, role, tab, menuId })

  const { live, reconnect } = useOrderStream({
    tenantId: context.tenantId,
    onEvent: applyEvent,
    onOpen: refetch,
  })

  const [busy, setBusy] = useState(false)
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null)
  const [alertMessage, setAlertMessage] = useState<string | null>(null)
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null)
  const [toast, setToast] = useState<{
    message: string
    orderId: number
    revertStatus: Order['status']
  } | null>(null)

  const allowedTabs = TAB_OPTIONS.filter((t) => t.roles.includes(role))

  /**
   * Runs one board action: busy while it runs; a saved order shows at once (`replaceOrder`), a
   * refusal shows its message and refetches, a throw (network) a plain message.
   */
  const runAction = async (
    name: string,
    call: () => Promise<BoardResult<Order>>,
  ): Promise<Order | null> => {
    setBusy(true)
    try {
      const res = await call()
      if (res.ok) {
        replaceOrder(res.data)
        return res.data
      }
      setAlertMessage(res.message)
      refetch()
    } catch (err) {
      console.warn(`board: ${name} failed`, err)
      setAlertMessage('Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
    return null
  }

  const handleButton = async (order: Order, button: OrderButton) => {
    setAlertMessage(null)
    setNoticeMessage(null)

    if (button.kind === 'cancel') {
      setCancellingOrder(order)
      return
    }
    if (button.kind === 'pay' || button.kind === 'close') {
      // step 2b: the payment and close order dialogs
      setNoticeMessage('Take payment comes in the next step.')
      return
    }
    if (button.kind === 'clearStaff' || button.kind === 'clearBill') {
      const kind = button.kind === 'clearStaff' ? 'staff' : 'bill'
      await runAction('clear request', () => clearAssistanceAction({ orderId: order.id, kind }))
      return
    }

    const saved = await runAction('move', () =>
      moveOrderAction({ orderId: order.id, status: button.to }),
    )
    if (saved) {
      const label = ORDER_STATUSES.find((st) => st.value === button.to)?.label ?? button.to
      setToast({
        message: `Order ${order.orderNumber ?? order.id} → ${label}`,
        orderId: order.id,
        revertStatus: order.status,
      })
    }
  }

  const handleUndo = async () => {
    if (!toast) return
    const { orderId, revertStatus } = toast
    setToast(null)
    await runAction('undo', () => moveOrderAction({ orderId, status: revertStatus }))
  }

  const handleCancelConfirm = async (reason: string) => {
    if (!cancellingOrder) return
    const orderId = cancellingOrder.id
    setCancellingOrder(null)
    await runAction('cancel', () =>
      moveOrderAction({ orderId, status: 'cancelled', cancelReason: reason }),
    )
  }

  return (
    <div className="order-board">
      <div className="order-board__toolbar">
        <div className="order-board__tabs" role="group" aria-label="Lists">
          {allowedTabs.map((t) => (
            <Button
              key={t.id}
              buttonStyle={tab === t.id ? 'primary' : 'secondary'}
              size="medium"
              aria-pressed={tab === t.id}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </Button>
          ))}
        </div>

        {context.menus.length > 1 && (
          <div className="order-board__menu-filter">
            <select
              aria-label="Menu"
              value={menuId ?? ''}
              onChange={(e) => setMenuId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">All menus</option>
              {context.menus.map((m) => (
                <option key={m.id} value={String(m.id)}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="order-board__stream-indicator">
          <span className="order-board__stream-status">{live ? 'Live' : 'Disconnected'}</span>
          {!live && (
            <Button buttonStyle="secondary" size="small" onClick={reconnect}>
              Force reconnect
            </Button>
          )}
        </div>
      </div>

      {tab === 'history' && (
        <div className="order-board__history-controls">
          <Button
            buttonStyle="secondary"
            size="small"
            aria-label="Previous day"
            onClick={() => setDate(shiftDay(date, -1))}
          >
            ‹
          </Button>
          <time className="order-board__history-date" dateTime={date}>
            {formatDay(date)}
          </time>
          <Button
            buttonStyle="secondary"
            size="small"
            aria-label="Next day"
            onClick={() => setDate(shiftDay(date, 1))}
          >
            ›
          </Button>

          {totalPages > 1 && (
            <div className="order-board__pagination">
              <Button
                buttonStyle="secondary"
                size="small"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous page
              </Button>
              <span>
                {page} / {totalPages}
              </span>
              <Button
                buttonStyle="secondary"
                size="small"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next page
              </Button>
            </div>
          )}
        </div>
      )}

      {alertMessage && (
        <div role="alert" className="order-board__alert">
          {alertMessage}
        </div>
      )}

      {noticeMessage && <div className="order-board__notice">{noticeMessage}</div>}

      {loadError && (
        <div role="alert" className="order-board__alert">
          {loadError}
        </div>
      )}

      {tab === 'refundDue' ? (
        <div className="order-board__payments">
          {payments.length === 0 && !loading && (
            <div className="order-board__empty">{EMPTY_LABELS.refundDue}</div>
          )}
          {payments.map((p) => (
            <div key={p.id} className="order-board__payment-row">
              <span>{formatMinor(p.amount ?? 0, p.currency ?? 'QAR', 'en')}</span>
              <span>{p.method}</span>
              <span>{p.createdAt ? new Date(p.createdAt).toLocaleDateString('en') : ''}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="order-board__grid">
          {orders.length === 0 && !loading && (
            <div className="order-board__empty">{EMPTY_LABELS[tab]}</div>
          )}
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              role={role}
              context={context}
              busy={busy}
              onButton={handleButton}
            />
          ))}
        </div>
      )}

      {toast && (
        <UndoToast message={toast.message} onUndo={handleUndo} onExpire={() => setToast(null)} />
      )}

      {cancellingOrder && (
        <ConfirmDialog
          order={cancellingOrder}
          busy={busy}
          onConfirm={handleCancelConfirm}
          onClose={() => setCancellingOrder(null)}
        />
      )}
    </div>
  )
}

/**
 * A staff board (rem0018 phase 4 step 2a; sdq `fnb-order-board/index.tsx`, split): rendered by
 * `OrderBoardView` for `{ role, tenantId }` once the server checked the role.
 * 1. `getBoardContextAction(tenantId)` on mount; a refusal → its message in `.admin-notice`
 * 2. `useBoardSettings` (menu filter, tab), `useBoardOrders`, `useOrderStream` (`onEvent` →
 *    `applyEvent`, `onOpen` → `refetch`)
 * 3. toolbar: tabs (Active, History; cashier also Unpaid, Earlier days, Refund due), the menu
 *    filter (select, "All menus" when more than one), "Live" / "Disconnected" with
 *    "Force reconnect" while disconnected; history: ‹ date › and the page buttons
 * 4. the cards (`OrderCard`) in a grid, an empty state per tab ("No orders waiting")
 * 5. a button: forward / back → `moveOrderAction`; on success `replaceOrder` and an
 *    `UndoToast` whose Undo moves it back to where it was (`moveOrderAction` with the old status);
 *    cancel → `ConfirmDialog` → `moveOrderAction({ status: 'cancelled', cancelReason })`;
 *    clearStaff / clearBill → `clearAssistanceAction`; pay / close → step 2b dialogs. A refusal
 *    shows its message above the grid (`role="alert"`) and refetches.
 * English only (admin rule); class names `order-board`, `order-board__toolbar`, `__grid`.
 */
export const OrderBoard: React.FC<{ role: StaffRole; tenantId: number }> = ({ role, tenantId }) => {
  const [context, setContext] = useState<BoardContext | null>(null)
  const [contextError, setContextError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getBoardContextAction(tenantId)
      .then((res) => {
        if (cancelled) return
        if (res.ok) {
          setContext(res.data)
        } else {
          setContextError(res.message)
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        console.warn('board: context failed', err)
        setContextError("Couldn't open the board. Reload the page.")
      })
    return () => {
      cancelled = true
    }
  }, [tenantId])

  if (contextError) {
    return <div className="admin-notice">{contextError}</div>
  }

  if (!context) {
    return <p className="order-board__loading">Loading…</p>
  }

  return <OrderBoardLoaded context={context} role={role} />
}
