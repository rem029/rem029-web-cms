'use client'

import { X } from 'lucide-react'
import type { TypedLocale } from 'payload'
import React, { useEffect, useState } from 'react'

import type { OrderTable } from '@/common/utils/orderTables'

import { listMenuTablesAction } from '../../_actions/orders'
import { useModalDialog } from '../../_hooks/useModalDialog'
import { menuStrings } from '../../_i18n'
import { touchTarget } from '../chip'

export type TablePickerProps = {
  menuSlug: string
  locale: TypedLocale
  /** the table the guest has now, marked in the list */
  current: OrderTable | null
  /** `?table=` named a table that isn't on this menu: "This table isn't on this menu, pick yours" */
  refused: boolean
  onPick: (table: OrderTable) => void
  onClose: () => void
}

/**
 * The menu's tables to pick from (sdq `table-picker.tsx`, no seat picker): a native <dialog>
 * (`useModalDialog`, as ItemView) that loads the list once with `listMenuTablesAction`, then shows
 * one button per table. Loading, empty ("No tables to pick from. Ask a member of staff.") and
 * failed states in the guest's language. Classes `menu-table-picker`, `menu-table-option`.
 */
export const TablePicker: React.FC<TablePickerProps> = ({
  menuSlug,
  locale,
  current,
  refused,
  onPick,
  onClose,
}) => {
  const t = menuStrings(locale)
  const { ref, close } = useModalDialog(onClose)
  const [tables, setTables] = useState<OrderTable[] | null | 'failed'>(null)

  useEffect(() => {
    let active = true
    listMenuTablesAction({ menuSlug, locale })
      .then((res) => {
        if (!active) return
        if (res.ok) {
          setTables(res.tables)
        } else {
          setTables('failed')
        }
      })
      .catch(() => {
        if (active) setTables('failed')
      })
    return () => {
      active = false
    }
  }, [menuSlug, locale])

  return (
    <dialog
      ref={ref}
      aria-labelledby="table-picker-title"
      onClick={(event) => event.target === event.currentTarget && close()}
      className="menu-table-picker menu-theme m-0 mt-auto w-full max-w-none rounded-t-lg bg-menu-bg p-0 text-menu-text backdrop:bg-black/50 sm:m-auto sm:max-w-md sm:rounded-lg"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 id="table-picker-title" className="text-xl font-semibold">
            {t.pickTable}
          </h2>
          <button
            type="button"
            aria-label={t.close}
            onClick={close}
            className="menu-btn rounded-full p-1.5 hover:bg-menu-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-menu-primary"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        {refused && <p className="mt-2 text-sm text-menu-muted">{t.tableNotOnMenu}</p>}

        <div className="mt-4">
          {tables === null && (
            <p className="py-4 text-center text-sm text-menu-muted" aria-busy="true">
              …
            </p>
          )}

          {tables === 'failed' && (
            <p className="py-4 text-center text-sm text-menu-muted">{t.tablesFailed}</p>
          )}

          {Array.isArray(tables) && tables.length === 0 && (
            <p className="py-4 text-center text-sm text-menu-muted">{t.noTables}</p>
          )}

          {Array.isArray(tables) && tables.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {tables.map((table) => {
                const isSelected = current?.id === table.id
                return (
                  <button
                    key={table.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => {
                      onPick(table)
                      close()
                    }}
                    className={`menu-btn menu-table-option ${touchTarget} flex items-center justify-center rounded border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-menu-primary ${
                      isSelected
                        ? 'border-menu-primary bg-menu-primary text-menu-primary-text'
                        : 'border-menu-border bg-menu-card text-menu-text hover:bg-menu-card/80'
                    }`}
                  >
                    {table.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </dialog>
  )
}
