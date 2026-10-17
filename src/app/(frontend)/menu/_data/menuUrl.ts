import type { Period } from './filterItems'
import type { MenuState } from '../_store/store'

/**
 * The shareable part of the menu's state in its url (rem0017 phase 3 step 3), so a link opens an
 * item, a category or a filtered menu: `?item=<slug>`, `?category=<slug>`, `?allergens=3,7`,
 * `?period=lunch`. `lang` and other params are kept as they are. Pure: the page passes the
 * searchParams in, `useMenuUrl` writes the result back.
 */

export type MenuUrlState = Pick<MenuState, 'allergens' | 'period' | 'category' | 'itemSlug'>

const PERIODS: Period[] = ['all', 'breakfast', 'lunch', 'dinner']
// a sane cap on what a pasted url can ask for
const MAX_ALLERGENS = 20

const SLUG = /^[a-z0-9-]{1,100}$/
const CATEGORY_PREFIX = 'category-'

const isPeriod = (value: string | null): value is Period =>
  PERIODS.some((period) => period === value)

/** The state a url asks for; unknown or malformed values are ignored (left at the default). */
export const parseMenuUrl = (params: URLSearchParams): Partial<MenuUrlState> => {
  const state: Partial<MenuUrlState> = {}

  const item = params.get('item')
  if (item && SLUG.test(item)) state.itemSlug = item

  const category = params.get('category')
  if (category && SLUG.test(category)) state.category = `${CATEGORY_PREFIX}${category}`

  const allergens = (params.get('allergens') ?? '')
    .split(',')
    .filter((value) => /^\d+$/.test(value))
    .map(Number)
    .filter((id) => id > 0)
  if (allergens.length > 0) state.allergens = [...new Set(allergens)].slice(0, MAX_ALLERGENS)

  const period = params.get('period')
  if (isPeriod(period) && period !== 'all') state.period = period

  return state
}

/** `params` with the menu's state written in: defaults remove their param. */
export const menuUrlParams = (params: URLSearchParams, state: MenuUrlState): URLSearchParams => {
  const next = new URLSearchParams(params)
  const write = (key: string, value: string | null) =>
    value ? next.set(key, value) : next.delete(key)

  write('item', state.itemSlug)
  write('category', state.category?.replace(CATEGORY_PREFIX, '') ?? null)
  write('allergens', state.allergens.length > 0 ? state.allergens.join(',') : null)
  write('period', state.period === 'all' ? null : state.period)
  return next
}
