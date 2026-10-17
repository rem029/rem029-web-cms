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

/** The state a url asks for; unknown or malformed values are ignored (left at the default). */
export const parseMenuUrl = (params: URLSearchParams): Partial<MenuUrlState> => {
  // 1. item: a slug-shaped string (/^[a-z0-9-]{1,100}$/) → itemSlug
  // 2. category: same check → category `category-<slug>`
  // 3. allergens: comma list → positive integers only, unique, at most MAX_ALLERGENS
  // 4. period: one of PERIODS other than 'all'
  void params
  void PERIODS
  void MAX_ALLERGENS
  throw new Error('not implemented')
}

/** `params` with the menu's state written in: defaults remove their param. */
export const menuUrlParams = (params: URLSearchParams, state: MenuUrlState): URLSearchParams => {
  // 1. copy params
  // 2. set or delete item, category (without the `category-` prefix), allergens (joined),
  //    period ('all' → delete)
  void params
  void state
  throw new Error('not implemented')
}
