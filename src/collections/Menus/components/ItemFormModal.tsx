'use client'

/**
 * The full item form of the menu builder, for a new item or an existing one: details, photo,
 * allergens, tags, availability, options. Loads the item with `getItemFormAction`, the allergen
 * and tag choices with `listLookupsAction`, and saves with `saveItemAction` (photo upload with
 * `uploadItemImageAction`). A plain dialog over the builder; what was typed stays on an error.
 */
import React, { useEffect, useRef, useState } from 'react'

import type { Availability } from '@/common/fields/menuFields'

import {
  getItemFormAction,
  listLookupsAction,
  saveItemAction,
  uploadItemImageAction,
} from './actions'
import type { BuilderCategory, BuilderItem, BuilderLookup, ItemFormData } from './builderTypes'
import { ModifierGroupsEditor } from './ModifierGroupsEditor'

export type ItemFormModalProps = {
  tenantId: number
  locale: string
  /** 'new' for a new item */
  itemId: number | 'new'
  categories: BuilderCategory[]
  /** category picked in the items panel filter: preselected on a new item */
  defaultCategory: number | null
  onClose: () => void
  onSaved: (item: BuilderItem, created: boolean) => void
}

// labels as on the item's own form (`availabilityField`); the values are the same
const AVAILABILITY: { value: Availability; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'all_day', label: 'All day' },
]

const newItem = (category: number | null): ItemFormData => ({
  title: '',
  price: 0,
  category,
  description: '',
  image: null,
  allergens: [],
  tags: [],
  availability: ['all_day'],
  inStock: true,
  isActive: true,
  modifierGroups: [],
})

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Tab and Shift+Tab stay inside the dialog: from the last control back to the first. */
const keepFocusInside = (event: React.KeyboardEvent<HTMLDivElement>) => {
  if (event.key !== 'Tab') return
  const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE))
  const first = controls[0]
  const last = controls[controls.length - 1]
  if (!first || !last) return
  // the title holds focus on open but isn't in the tab order: Shift+Tab from it goes to the last
  const atStart =
    document.activeElement === first ||
    !controls.some((control) => control === document.activeElement)
  if (event.shiftKey && atStart) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

const toggleId = <T,>(list: T[], value: T): T[] =>
  list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value]

const LookupChecks: React.FC<{
  legend: string
  options: BuilderLookup[]
  value: number[]
  onChange: (value: number[]) => void
}> = ({ legend, options, value, onChange }) => (
  <fieldset className="menu-builder__checks">
    <legend>{legend}</legend>
    {options.length === 0 && <span className="menu-builder__empty">None yet.</span>}
    {options.map((option) => (
      <label key={option.id}>
        <input
          type="checkbox"
          checked={value.includes(option.id)}
          onChange={() => onChange(toggleId(value, option.id))}
        />{' '}
        {option.title}
      </label>
    ))}
  </fieldset>
)

export const ItemFormModal: React.FC<ItemFormModalProps> = (props) => {
  const { tenantId, locale, itemId, categories } = props
  const [data, setData] = useState<ItemFormData | null>(
    itemId === 'new' ? newItem(props.defaultCategory) : null,
  )
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [allergens, setAllergens] = useState<BuilderLookup[]>([])
  const [tags, setTags] = useState<BuilderLookup[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  // the latest onClose without re-running the focus effect (the parent passes a new function
  // on every render)
  const onCloseRef = useRef(props.onClose)
  onCloseRef.current = props.onClose

  // focus moves into the dialog on open and back to what opened it (the Edit / New item button)
  // on close; Escape closes it from anywhere on the page
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    titleRef.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      opener?.focus()
    }
  }, [])

  useEffect(() => {
    let current = true
    void listLookupsAction({ tenantId, locale }).then((result) => {
      if (!current || !result.ok) return
      setAllergens(result.allergens)
      setTags(result.tags)
    })
    if (itemId !== 'new') {
      void getItemFormAction({ tenantId, locale, itemId }).then((result) => {
        if (!current) return
        if (!result.ok) {
          setError(result.error)
          return
        }
        setData(result.data)
        setImageUrl(result.imageUrl)
      })
    }
    return () => {
      current = false
    }
  }, [tenantId, locale, itemId])

  const set = (patch: Partial<ItemFormData>) =>
    setData((current) => (current ? { ...current, ...patch } : current))

  const upload = async (file: File) => {
    const form = new FormData()
    form.set('file', file)
    form.set('tenantId', String(tenantId))
    setBusy(true)
    const result = await uploadItemImageAction(form)
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError(null)
    set({ image: result.imageId })
    setImageUrl(result.imageUrl)
  }

  const save = async () => {
    if (!data) return
    setBusy(true)
    const result = await saveItemAction({
      tenantId,
      locale,
      ...(itemId === 'new' ? {} : { itemId }),
      data,
    })
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    props.onSaved(result.item, itemId === 'new')
    props.onClose()
  }

  return (
    <div className="menu-builder__overlay">
      <div
        className="menu-builder__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="menu-builder-dialog-title"
        onKeyDown={keepFocusInside}
      >
        <h3 id="menu-builder-dialog-title" ref={titleRef} tabIndex={-1}>
          {itemId === 'new' ? 'New item' : 'Edit item'}
        </h3>
        {error && (
          <p className="menu-builder__error" role="alert">
            {error}
          </p>
        )}
        {!data ? (
          !error && <p>Loading…</p>
        ) : (
          // not a <form>: the builder sits inside Payload's document form, and forms can't nest
          <div className="menu-builder__form">
            <div className="menu-builder__toolbar">
              <label className="menu-builder__field">
                Title *
                <input
                  required
                  value={data.title}
                  onChange={(e) => set({ title: e.target.value })}
                />
              </label>
              <label className="menu-builder__field">
                Price *
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={data.price}
                  onChange={(e) => set({ price: Number(e.target.value) })}
                />
              </label>
              <label className="menu-builder__field">
                Category
                <select
                  value={data.category ?? ''}
                  onChange={(e) =>
                    set({ category: e.target.value ? Number(e.target.value) : null })
                  }
                >
                  <option value="">No category (shows under &quot;Other&quot;)</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="menu-builder__field">
              Description
              <textarea
                rows={3}
                value={data.description}
                onChange={(e) => set({ description: e.target.value })}
              />
            </label>
            <div className="menu-builder__field">
              Photo
              <div className="menu-builder__toolbar">
                {imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- small admin preview
                  <img className="menu-builder__thumb" src={imageUrl} alt="Item photo" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  aria-label="Upload photo"
                  disabled={busy}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void upload(file)
                  }}
                />
                {data.image !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      set({ image: null })
                      setImageUrl(null)
                    }}
                  >
                    Remove photo
                  </button>
                )}
              </div>
            </div>
            <LookupChecks
              legend="Allergens"
              options={allergens}
              value={data.allergens}
              onChange={(value) => set({ allergens: value })}
            />
            <LookupChecks
              legend="Tags"
              options={tags}
              value={data.tags}
              onChange={(value) => set({ tags: value })}
            />
            <fieldset className="menu-builder__checks">
              <legend>Served</legend>
              {AVAILABILITY.map((option) => (
                <label key={option.value}>
                  <input
                    type="checkbox"
                    checked={data.availability.includes(option.value)}
                    onChange={() =>
                      set({ availability: toggleId(data.availability, option.value) })
                    }
                  />{' '}
                  {option.label}
                </label>
              ))}
            </fieldset>
            <div className="menu-builder__checks">
              <label>
                <input
                  type="checkbox"
                  checked={data.inStock}
                  onChange={(e) => set({ inStock: e.target.checked })}
                />{' '}
                In stock
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={data.isActive}
                  onChange={(e) => set({ isActive: e.target.checked })}
                />{' '}
                Show on menus
              </label>
            </div>
            <ModifierGroupsEditor
              value={data.modifierGroups}
              onChange={(modifierGroups) => set({ modifierGroups })}
            />
            <div className="menu-builder__actions">
              <button
                type="button"
                className="btn btn--style-secondary btn--size-small"
                onClick={props.onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--style-primary btn--size-small"
                disabled={busy}
                onClick={() => void save()}
              >
                {busy ? 'Saving…' : 'Save item'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
