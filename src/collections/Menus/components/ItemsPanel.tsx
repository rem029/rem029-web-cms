'use client'

/**
 * Items panel of the menu builder: every item of the menu's tenant in one table, the ones on the
 * menu first and in menu order. Tick, photo, title, category, price (edit in place), in stock,
 * edit. Stateless apart from the price being typed: `MenuBuilder` owns the data and saves.
 */
import React, { useEffect, useState } from 'react'

import type { BuilderCategory, BuilderItem, QuickItemUpdate } from './builderTypes'

export type RowStatus = { saved: true } | { error: string }

export type ItemsPanelProps = {
  items: BuilderItem[]
  /** false until the first list came back (no empty state flash) */
  loaded: boolean
  picked: number[]
  categories: BuilderCategory[]
  currency: string
  locale: string
  search: string
  categoryFilter: number | null
  /** item id → 'Saved' or the error of its last quick edit */
  rowStatus: Record<number, RowStatus>
  onSearch: (search: string) => void
  onCategoryFilter: (categoryId: number | null) => void
  onToggle: (itemId: number) => void
  onMove: (itemId: number, direction: -1 | 1) => void
  onQuickUpdate: (itemId: number, data: QuickItemUpdate) => void
  onEdit: (itemId: number | 'new') => void
}

const NewItemButton: React.FC<{ onEdit: ItemsPanelProps['onEdit'] }> = ({ onEdit }) => (
  <button
    type="button"
    className="btn btn--style-primary btn--size-small"
    onClick={() => onEdit('new')}
  >
    New item
  </button>
)

/** The price as typed; saved on blur when it changed, reset when the saved price changes. */
const PriceInput: React.FC<{
  item: BuilderItem
  currency: string
  status: RowStatus | undefined
  onSave: (price: number) => void
}> = ({ item, currency, status, onSave }) => {
  const [draft, setDraft] = useState(String(item.price))
  useEffect(() => setDraft(String(item.price)), [item.price, status])

  const save = () => {
    const price = Number(draft)
    if (draft.trim() === '' || !Number.isFinite(price) || price < 0) {
      setDraft(String(item.price))
      return
    }
    if (price !== item.price) onSave(price)
  }

  return (
    <label className="menu-builder__price">
      <span className="menu-builder__currency">{currency}</span>
      <input
        type="number"
        min={0}
        step={0.01}
        aria-label={`Price: ${item.title}`}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={save}
      />
    </label>
  )
}

const ItemRow: React.FC<{
  item: BuilderItem
  isPicked: boolean
  position: number
  pickedCount: number
  props: ItemsPanelProps
}> = ({ item, isPicked, position, pickedCount, props }) => {
  const status = props.rowStatus[item.id]
  return (
    <tr className={item.isActive ? undefined : 'menu-builder__row--inactive'}>
      <td>
        <input
          type="checkbox"
          aria-label={`On this menu: ${item.title}`}
          checked={isPicked}
          onChange={() => props.onToggle(item.id)}
        />
      </td>
      <td className="menu-builder__order">
        {isPicked && (
          <>
            <button
              type="button"
              aria-label={`Move ${item.title} up`}
              disabled={position === 0}
              onClick={() => props.onMove(item.id, -1)}
            >
              ↑
            </button>
            <button
              type="button"
              aria-label={`Move ${item.title} down`}
              disabled={position === pickedCount - 1}
              onClick={() => props.onMove(item.id, 1)}
            >
              ↓
            </button>
          </>
        )}
      </td>
      <td>
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- small admin thumbnail
          <img className="menu-builder__thumb" src={item.imageUrl} alt="" />
        ) : (
          <span className="menu-builder__thumb menu-builder__thumb--empty" />
        )}
      </td>
      <td>
        <span className="menu-builder__title">{item.title}</span>
        {!item.isActive && <span className="menu-builder__badge">Hidden from menus</span>}
      </td>
      <td>{item.categoryTitle ?? 'Other'}</td>
      <td>
        <PriceInput
          item={item}
          currency={props.currency}
          status={status}
          onSave={(price) => props.onQuickUpdate(item.id, { price })}
        />
      </td>
      <td>
        <input
          type="checkbox"
          aria-label={`In stock: ${item.title}`}
          checked={item.inStock}
          onChange={() => props.onQuickUpdate(item.id, { inStock: !item.inStock })}
        />
      </td>
      <td>
        <button
          type="button"
          className="btn btn--style-secondary btn--size-small"
          onClick={() => props.onEdit(item.id)}
        >
          Edit
        </button>
      </td>
      <td className="menu-builder__status">
        {status && 'saved' in status && <span role="status">Saved</span>}
        {status && 'error' in status && (
          <span role="alert" className="menu-builder__error">
            {status.error}
          </span>
        )}
      </td>
    </tr>
  )
}

export const ItemsPanel: React.FC<ItemsPanelProps> = (props) => {
  const { items, picked, categories, search, categoryFilter } = props
  const filtering = search.trim() !== '' || categoryFilter !== null

  const pickedRows = picked
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is BuilderItem => item !== undefined)
  const otherRows = items.filter((item) => !picked.includes(item.id))

  return (
    <section className="menu-builder__panel" aria-label="Items">
      <div className="menu-builder__toolbar">
        <input
          type="search"
          aria-label="Search items"
          placeholder="Search items"
          value={search}
          onChange={(event) => props.onSearch(event.target.value)}
        />
        <select
          aria-label="Category"
          value={categoryFilter ?? ''}
          onChange={(event) =>
            props.onCategoryFilter(event.target.value ? Number(event.target.value) : null)
          }
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.title}
            </option>
          ))}
        </select>
        <NewItemButton onEdit={props.onEdit} />
      </div>

      {props.loaded && items.length === 0 && !filtering && (
        <div className="menu-builder__empty">
          <p>Add your first item</p>
          <NewItemButton onEdit={props.onEdit} />
        </div>
      )}
      {props.loaded && items.length === 0 && filtering && (
        <p className="menu-builder__empty">No items match.</p>
      )}

      {items.length > 0 && (
        <table className="menu-builder__table">
          <thead>
            <tr>
              <th>On menu</th>
              <th>
                <span className="menu-builder__sr-only">Order</span>
              </th>
              <th>
                <span className="menu-builder__sr-only">Photo</span>
              </th>
              <th>Item</th>
              <th>Category</th>
              <th>Price</th>
              <th>In stock</th>
              <th>
                <span className="menu-builder__sr-only">Edit</span>
              </th>
              <th>
                <span className="menu-builder__sr-only">Status</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {pickedRows.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                isPicked
                position={picked.indexOf(item.id)}
                pickedCount={picked.length}
                props={props}
              />
            ))}
            {otherRows.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                isPicked={false}
                position={-1}
                pickedCount={picked.length}
                props={props}
              />
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
