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
  if (
    filters.allergens.length > 0 &&
    !item.allergens.some((allergen) => filters.allergens.includes(allergen.id))
  ) {
    return false
  }
  if (filters.period === 'all') return true
  if (item.availability.length === 0 || item.availability.includes('all_day')) return true
  return item.availability.includes(filters.period)
}

export const filterSections = (sections: MenuSection[], filters: MenuFilterState): MenuSection[] =>
  sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => matchesFilters(item, filters)),
    }))
    .filter((section) => section.items.length > 0)

/** The allergens on this menu's items, by title: the allergen filter's choices. */
export const allergensOf = (sections: MenuSection[]): { id: number; title: string }[] => {
  const byId = new Map<number, { id: number; title: string }>()
  for (const section of sections) {
    for (const item of section.items) {
      for (const allergen of item.allergens) byId.set(allergen.id, allergen)
    }
  }
  return [...byId.values()].sort((a, b) => a.title.localeCompare(b.title))
}
