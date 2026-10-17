'use client'

import { X } from 'lucide-react'
import type { TypedLocale } from 'payload'
import React, { useEffect, useRef, useState } from 'react'

import { searchMenuItemsAction } from '../_actions'
import type { GuestMenuItem } from '../_data/menuData'
import { useDebounce } from '../_hooks/useDebounce'
import { useModalDialog } from '../_hooks/useModalDialog'
import { menuStrings, type MenuStrings } from '../_i18n'
import { MenuItemCard } from './MenuItemCard'
import { MenuItemCardSkeleton } from './MenuItemCardSkeleton'

export type SearchOverlayProps = {
  menuId: number
  currency: string
  locale: TypedLocale
  onOpenItem: (item: GuestMenuItem) => void
  onClose: () => void
}

const SKELETONS = 3

const isStringKey = (strings: MenuStrings, key: string): key is keyof MenuStrings => key in strings

/**
 * Full screen search over the menu (sdq `search-overlay.tsx`): a search box focused on open,
 * results from `searchMenuItemsAction` 300ms after the guest stops typing, shown as item cards.
 * Skeleton cards while searching, "No results", or the search error in the guest's language.
 * Answers to an older query are dropped. A native modal <dialog> (`useModalDialog`): focus stays
 * in it, Escape or the close button closes it, and focus goes back to the search button.
 */
export const SearchOverlay: React.FC<SearchOverlayProps> = ({
  menuId,
  currency,
  locale,
  onOpenItem,
  onClose,
}) => {
  const t = menuStrings(locale)
  const { ref, close } = useModalDialog(onClose)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GuestMenuItem[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounced = useDebounce(query.trim(), 300)
  // the latest request: an older answer arriving late is dropped
  const requestRef = useRef(0)

  useEffect(() => {
    const request = ++requestRef.current
    setError(null)
    if (!debounced) {
      setResults(null)
      setLoading(false)
      return
    }
    setLoading(true)
    searchMenuItemsAction({ menuId, query: debounced, locale })
      .then((result) => {
        if (request !== requestRef.current) return
        if (result.ok) setResults(result.items)
        else setError(isStringKey(t, result.error) ? t[result.error] : t.searchFailed)
      })
      .catch(() => {
        // network or server failure: the action logs its own errors on the server
        if (request === requestRef.current) setError(t.searchFailed)
      })
      .finally(() => {
        if (request === requestRef.current) setLoading(false)
      })
  }, [debounced, menuId, locale, t])

  return (
    <dialog
      ref={ref}
      aria-label={t.search}
      className="menu-theme m-0 h-dvh max-h-none w-full max-w-none overflow-y-auto bg-menu-bg p-0 text-menu-text"
    >
      <div className="container py-4">
        <div className="flex items-center gap-2">
          <input
            type="search"
            aria-label={t.search}
            placeholder={t.searchHint}
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-w-0 flex-1 rounded border border-menu-border bg-menu-card px-3 py-2 text-base text-menu-text placeholder:text-menu-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-menu-primary"
          />
          <button
            type="button"
            aria-label={t.close}
            onClick={close}
            className="rounded-full p-2 hover:bg-menu-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-menu-primary"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2" aria-live="polite" aria-busy={loading}>
          {loading &&
            Array.from({ length: SKELETONS }, (_, index) => <MenuItemCardSkeleton key={index} />)}
          {!loading && error && <p className="text-menu-muted">{error}</p>}
          {!loading && !error && results?.length === 0 && (
            <p className="text-menu-muted">{t.noResults}</p>
          )}
          {!loading &&
            !error &&
            results?.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                currency={currency}
                locale={locale}
                onOpen={(picked) => {
                  // close first, so the item view opens on top and gives focus back to the
                  // search button when it closes
                  close()
                  onOpenItem(picked)
                }}
              />
            ))}
        </div>
      </div>
    </dialog>
  )
}
