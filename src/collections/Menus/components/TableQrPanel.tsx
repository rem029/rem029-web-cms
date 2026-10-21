'use client'

import React, { useEffect, useState } from 'react'
import { useDocumentInfo } from '@payloadcms/ui'

import type { MenuTableRow, MenuTables } from '../utils/tables'
import { addTablesToMenuAction, listMenuTablesAction } from './actions'
import { callAction } from './callAction'
import './TableQrPanel.scss'

/** The QR image or download of one table (`/next/menu-qr`, same origin as the admin). */
export const tableQrSrc = (
  menuId: number,
  tableId: number,
  format: 'png' | 'svg',
  download = false,
): string => {
  const params = new URLSearchParams({
    menu: String(menuId),
    table: String(tableId),
    format,
  })
  if (download) {
    params.set('download', '1')
  }
  return `/next/menu-qr?${params.toString()}`
}

/**
 * QR codes of a menu's tables, on its Ordering tab (rem0018 phase 1 step 1b), under the tables
 * list (the join: "Add new" there creates a table already on this menu):
 * - "Add existing tables": a multi-select of the tenant's other tables + Add (re-checked on the
 *   server as the user), then the list reloads; Payload's join list above only loads once, so a
 *   note offers a page reload to show them there too
 * - one row per table: label, QR preview (svg), Download PNG, Download SVG; an inactive table
 *   says "Not taking orders"
 * - "Print all" opens `/next/menu-qr/sheet?menu=<id>` in a new tab
 * - before the first save: "Save the menu to get its QR codes"; no tables: "Pick the tables guests
 *   order from"; a failed load: the error and Try again
 * Payload field classes + admin tokens (rem0005), no colours of its own.
 */
export const TableQrPanel: React.FC = () => {
  const { id, savedDocumentData } = useDocumentInfo()
  const [data, setData] = useState<MenuTables | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [added, setAdded] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const reload = () => setReloadKey((prev) => prev + 1)

  useEffect(() => {
    if (!id) return
    let cancelled = false

    void callAction(() => listMenuTablesAction({ menuId: Number(id) })).then((result) => {
      if (cancelled) return
      if (result.ok) {
        setData(result)
        setError(null)
      } else {
        setData(null)
        setError(result.error)
      }
    })

    return () => {
      cancelled = true
    }
  }, [id, savedDocumentData?.updatedAt, reloadKey])

  const handleAdd = async () => {
    if (!id || selectedIds.length === 0) return
    setAdding(true)
    setAddError(null)
    setAdded(false)

    const result = await callAction(() =>
      addTablesToMenuAction({ menuId: Number(id), tableIds: selectedIds }),
    )
    setAdding(false)

    if (result.ok) {
      setSelectedIds([])
      setAdded(true)
      reload()
    } else {
      setAddError(result.error)
    }
  }

  return (
    <div className="field-type menu-table-qr">
      <span className="field-label">Table QR codes</span>
      {!id && <p className="field-description">Save the menu to get its QR codes.</p>}

      {id && error && (
        <div className="menu-table-qr__error">
          <p className="field-description" role="alert">
            {error}
          </p>
          <button
            type="button"
            className="btn btn--size-small btn--style-secondary"
            onClick={reload}
          >
            Try again
          </button>
        </div>
      )}

      {id && data && (
        <>
          {data.otherTables.length > 0 && (
            <div className="menu-table-qr__add">
              <span className="field-label">Add existing tables</span>
              <div className="menu-table-qr__add-controls">
                <select
                  multiple
                  aria-label="Tables to add"
                  className="menu-table-qr__select"
                  value={selectedIds.map(String)}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, (option) =>
                      Number(option.value),
                    )
                    setSelectedIds(selected)
                  }}
                >
                  {data.otherTables.map((table) => (
                    <option key={table.id} value={table.id}>
                      {table.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn--size-small btn--style-secondary"
                  disabled={adding || selectedIds.length === 0}
                  onClick={handleAdd}
                >
                  {adding ? 'Adding...' : 'Add'}
                </button>
              </div>
              {addError && (
                <p className="field-description" role="alert">
                  {addError}
                </p>
              )}
            </div>
          )}

          {added && (
            <div className="menu-table-qr__added" role="status">
              <p className="field-description">
                Added. Reload the page to see them in the Tables list above.
              </p>
              <button
                type="button"
                className="btn btn--size-small btn--style-secondary"
                onClick={() => window.location.reload()}
              >
                Reload
              </button>
            </div>
          )}

          {data.tables.length > 0 ? (
            <>
              <div className="menu-table-qr__header">
                <a
                  className="btn btn--size-small btn--style-secondary"
                  href={`/next/menu-qr/sheet?menu=${id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Print all
                </a>
              </div>
              <ul className="menu-table-qr__list">
                {data.tables.map((table) => (
                  <TableRow key={table.id} menuId={Number(id)} table={table} />
                ))}
              </ul>
            </>
          ) : (
            <p className="field-description">Pick the tables guests order from.</p>
          )}
        </>
      )}
    </div>
  )
}

const TableRow: React.FC<{ menuId: number; table: MenuTableRow }> = ({ menuId, table }) => {
  return (
    <li className="menu-table-qr__row">
      <div className="menu-table-qr__info">
        <span className="menu-table-qr__label">{table.label}</span>
        {!table.isActive && <span className="menu-table-qr__status">Not taking orders</span>}
      </div>
      <div className="menu-table-qr__preview">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={tableQrSrc(menuId, table.id, 'svg')}
          alt={`QR code for ${table.label}`}
          width={96}
          height={96}
        />
      </div>
      <div className="menu-table-qr__actions">
        <a
          download
          className="btn btn--size-small btn--style-secondary"
          href={tableQrSrc(menuId, table.id, 'png', true)}
        >
          Download PNG
        </a>
        <a
          download
          className="btn btn--size-small btn--style-secondary"
          href={tableQrSrc(menuId, table.id, 'svg', true)}
        >
          Download SVG
        </a>
      </div>
    </li>
  )
}
