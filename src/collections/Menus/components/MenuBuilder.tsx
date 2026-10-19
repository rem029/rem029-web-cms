'use client'

/**
 * The menu builder (rem0017 phase 2 step 2): the Items tab of a menu (a `ui` field in
 * `../index.ts`). The items panel ticks what the menu shows (the form's `items` field, saved
 * with the menu, so drafts and live preview work as usual); quick edits and new items/categories
 * save to the catalog right away through `./actions.ts`. Works before the first save: the tenant
 * comes from the form's `tenant` field.
 */
import { useForm, useFormFields, useLocale } from '@payloadcms/ui'
import React, { useCallback, useEffect, useState } from 'react'

import {
  listBuilderCategoriesAction,
  listBuilderItemsAction,
  listItemsOfCategoryAction,
  quickUpdateItemAction,
  reorderCategoriesAction,
  saveCategoryAction,
} from './actions'
import type { BuilderCategory, BuilderItem, QuickItemUpdate } from './builderTypes'
import { callAction } from './callAction'
import { CategoriesPanel } from './CategoriesPanel'
import { ItemFormModal } from './ItemFormModal'
import { ItemsPanel, type RowStatus } from './ItemsPanel'
import './MenuBuilder.scss'

const SEARCH_DELAY_MS = 250
const SAVED_VISIBLE_MS = 3000

// the field holds ids, or populated docs right after a load with depth
const toIds = (value: unknown): number[] =>
  Array.isArray(value)
    ? value
        .map((entry) =>
          typeof entry === 'number'
            ? entry
            : entry && typeof entry === 'object' && 'id' in entry && typeof entry.id === 'number'
              ? entry.id
              : null,
        )
        .filter((id): id is number => id !== null)
    : []

// the multi-tenant plugin's field holds the selected tenant id, a string ("2") after it syncs
const toTenantId = (value: unknown): number | null => {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value)
  if (value && typeof value === 'object' && 'id' in value && typeof value.id === 'number') {
    return value.id
  }
  return null
}

/** The list with the entry at `from` moved one step (`direction`), or null at either end. */
const moved = <T,>(list: T[], from: number, direction: -1 | 1): T[] | null => {
  const to = from + direction
  const a = list[from]
  const b = list[to]
  if (from < 0 || a === undefined || b === undefined) return null
  const next = [...list]
  next[from] = b
  next[to] = a
  return next
}

export const MenuBuilder: React.FC = () => {
  // useField inside a ui field reads the ui field's own path, so the form's fields are read and
  // written through the form itself
  const itemsValue = useFormFields(([fields]) => fields.items?.value)
  // the multi-tenant plugin's field can clear `value` on load (Payload 3.44): fall back to the
  // tenant the doc was loaded with
  const tenantValue = useFormFields(
    ([fields]) => fields.tenant?.value ?? fields.tenant?.initialValue,
  )
  const dispatchFields = useFormFields(([, dispatch]) => dispatch)
  const { setModified } = useForm()
  const { code: locale } = useLocale()
  const tenantId = toTenantId(tenantValue)
  const picked = toIds(itemsValue)

  // marks the form modified, so autosave and live preview pick the change up
  const setItems = (ids: number[]) => {
    dispatchFields({ type: 'UPDATE', path: 'items', value: ids })
    setModified(true)
  }

  const [rows, setRows] = useState<BuilderItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [currency, setCurrency] = useState('USD')
  const [categories, setCategories] = useState<BuilderCategory[]>([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null)
  const [rowStatus, setRowStatus] = useState<Record<number, RowStatus>>({})
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [categoryError, setCategoryError] = useState<string | null>(null)

  useEffect(() => {
    if (tenantId === null) return
    let current = true
    const load = async () => {
      const result = await callAction(() =>
        listBuilderItemsAction({
          tenantId,
          locale,
          search,
          categoryId: categoryFilter,
        }),
      )
      if (!current) return
      setLoaded(true)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setError(null)
      setRows(result.items)
      setCurrency(result.currency)
    }
    const timer = setTimeout(() => void load(), search ? SEARCH_DELAY_MS : 0)
    return () => {
      current = false
      clearTimeout(timer)
    }
  }, [tenantId, locale, search, categoryFilter])

  const loadCategories = useCallback(async () => {
    if (tenantId === null) return
    const result = await callAction(() => listBuilderCategoriesAction({ tenantId, locale }))
    if (!result.ok) {
      setCategoryError(result.error)
      return
    }
    setCategoryError(null)
    setCategories(result.categories)
  }, [tenantId, locale])

  useEffect(() => {
    void loadCategories()
  }, [loadCategories])

  if (tenantId === null) {
    return <p className="menu-builder__notice">Pick a business first.</p>
  }

  const toggle = (itemId: number) =>
    setItems(picked.includes(itemId) ? picked.filter((id) => id !== itemId) : [...picked, itemId])

  const move = (itemId: number, direction: -1 | 1) => {
    const next = moved(picked, picked.indexOf(itemId), direction)
    if (next) setItems(next)
  }

  const addAll = async (categoryId: number) => {
    const result = await callAction(() =>
      listItemsOfCategoryAction({ tenantId, locale, categoryId }),
    )
    if (!result.ok) {
      setCategoryError(result.error)
      return
    }
    setItems([...picked, ...result.itemIds.filter((id) => !picked.includes(id))])
  }

  const quickUpdate = async (itemId: number, data: QuickItemUpdate) => {
    const result = await callAction(() => quickUpdateItemAction({ tenantId, locale, itemId, data }))
    if (!result.ok) {
      setRowStatus((status) => ({ ...status, [itemId]: { error: result.error } }))
      return
    }
    setRows((current) => current.map((row) => (row.id === itemId ? result.item : row)))
    setRowStatus((status) => ({ ...status, [itemId]: { saved: true } }))
    // "Saved" is a confirmation, not a state: it goes after a few seconds
    setTimeout(
      () =>
        setRowStatus((status) => {
          const { [itemId]: current, ...rest } = status
          return current && 'saved' in current ? rest : status
        }),
      SAVED_VISIBLE_MS,
    )
  }

  const itemSaved = (item: BuilderItem, created: boolean) => {
    setRows((current) =>
      created ? [...current, item] : current.map((row) => (row.id === item.id ? item : row)),
    )
    if (created) setItems([...picked, item.id])
    void loadCategories()
  }

  const createCategory = async (title: string) => {
    const result = await callAction(() => saveCategoryAction({ tenantId, locale, data: { title } }))
    if (!result.ok) {
      setCategoryError(result.error)
      return
    }
    setCategoryError(null)
    setCategories((current) => [...current, result.category])
  }

  const renameCategory = async (categoryId: number, title: string) => {
    const result = await callAction(() =>
      saveCategoryAction({ tenantId, locale, categoryId, data: { title } }),
    )
    if (!result.ok) {
      setCategoryError(result.error)
      return
    }
    setCategoryError(null)
    setCategories((current) =>
      current.map((category) => (category.id === categoryId ? result.category : category)),
    )
  }

  const moveCategory = async (categoryId: number, direction: -1 | 1) => {
    const next = moved(
      categories,
      categories.findIndex((category) => category.id === categoryId),
      direction,
    )
    if (!next) return
    setCategories(next)
    const result = await callAction(() =>
      reorderCategoriesAction({
        tenantId,
        locale,
        ids: next.map((category) => category.id),
      }),
    )
    if (!result.ok) {
      setCategoryError(result.error)
      void loadCategories()
    }
  }

  return (
    // Enter in a builder input must not submit the menu (Payload's document form)
    <div
      className="menu-builder"
      onKeyDown={(event) => {
        if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
          event.preventDefault()
        }
      }}
    >
      {error && (
        <p className="menu-builder__error" role="alert">
          {error}
        </p>
      )}
      <CategoriesPanel
        categories={categories}
        error={categoryError}
        onAddAll={(categoryId) => void addAll(categoryId)}
        onCreate={(title) => void createCategory(title)}
        onRename={(categoryId, title) => void renameCategory(categoryId, title)}
        onMove={(categoryId, direction) => void moveCategory(categoryId, direction)}
      />
      <ItemsPanel
        items={rows}
        loaded={loaded}
        picked={picked}
        categories={categories}
        currency={currency}
        locale={locale}
        search={search}
        categoryFilter={categoryFilter}
        rowStatus={rowStatus}
        onSearch={setSearch}
        onCategoryFilter={setCategoryFilter}
        onToggle={toggle}
        onMove={move}
        onQuickUpdate={(itemId, data) => void quickUpdate(itemId, data)}
        onEdit={setEditing}
      />
      {editing !== null && (
        <ItemFormModal
          tenantId={tenantId}
          locale={locale}
          itemId={editing}
          categories={categories}
          defaultCategory={categoryFilter}
          onClose={() => setEditing(null)}
          onSaved={itemSaved}
        />
      )}
    </div>
  )
}
