import type { GuestMenuItem, MenuSection } from './menuData'

/**
 * The guest menu's filters (rem0017 phase 3 step 3): show only the items containing one of the
 * picked allergens (none picked = no filter), and one meal period. Items without an availability, or served all day, match every
 * period. Sections left empty by the filters are dropped. Pure: the whole menu is on the client.
 */

export type Period = 'all' | 'breakfast' | 'lunch' | 'dinner'

export type MenuFilterState = {
  allergens: number[]
  period: Period
}

export const matchesFilters = (item: GuestMenuItem, filters: MenuFilterState): boolean => {
  // 1. allergens picked and none of item.allergens among them → false
  // 2. period 'all' → true
  // 3. no availability, or it has 'all_day' → true
  // 4. else availability includes the period
  void item
  void filters
  throw new Error('not implemented')
}

export const filterSections = (
  sections: MenuSection[],
  filters: MenuFilterState,
): MenuSection[] => {
  // 1. each section keeps its items matching the filters
  // 2. drop sections without items
  void sections
  void filters
  throw new Error('not implemented')
}

/** The allergens on this menu's items, by title: the allergen filter's choices. */
export const allergensOf = (sections: MenuSection[]): { id: number; title: string }[] => {
  // 1. every item's allergens, unique by id
  // 2. sorted by title (localeCompare)
  void sections
  throw new Error('not implemented')
}
