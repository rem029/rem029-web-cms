'use client'

import React, { useEffect, useState } from 'react'
import { useDocumentInfo } from '@payloadcms/ui'

import type { MenuTableRow, MenuTables } from '../utils/tables'
import { listMenuTablesAction } from './actions'
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
 * QR codes of a menu's tables, on its Ordering tab (rem0018 phase 1 steps 1b and 1c), under the
 * tables list (the join: "Add new" there creates a table on this menu):
 * - one row per table: label, QR preview (svg), Download PNG, Download SVG; an inactive table
 *   says "Not taking orders"
 * - "Print all" opens `/next/menu-qr/sheet?menu=<id>` in a new tab
 * - before the first save: "Save the menu to get its QR codes"; no tables: "Add the tables guests
 *   order from with Add new above."; a failed load: the error and Try again
 * - it loads on open and on the menu's save, not after "Add new" in the tables drawer, so a note
 *   says new tables show after a save or a reload
 * Payload field classes + admin tokens (rem0005), no colours of its own.
 */
export const TableQrPanel: React.FC = () => {
  const { id, savedDocumentData } = useDocumentInfo()
  const [data, setData] = useState<MenuTables | null>(null)
  const [error, setError] = useState<string | null>(null)
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

  return (
    <div className="field-type menu-table-qr">
      <span className="field-label">Table QR codes</span>
      {!id && <p className="field-description">Save the menu to get its QR codes.</p>}
      {id && (
        <p className="field-description">
          New or changed tables show here after you save the menu or reload the page.
        </p>
      )}

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
            <p className="field-description">
              Add the tables guests order from with Add new above.
            </p>
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
