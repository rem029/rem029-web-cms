// Guest menu items and sections for the menu component tests (rem0017 phase 3 step 3).
import type { GuestMenuItem, MenuSection } from '@/app/(frontend)/menu/_data/menuData'

let nextId = 1

export const guestItem = (data: Partial<GuestMenuItem> = {}): GuestMenuItem => {
  const id = nextId++
  return {
    id,
    slug: `item-${id}`,
    title: `Item ${id}`,
    description: null,
    price: 10,
    imageUrl: null,
    thumbnailUrl: null,
    inStock: true,
    allergens: [],
    tags: [],
    availability: [],
    modifierGroups: [],
    ...data,
  }
}

export const section = (
  slug: string,
  title: string,
  items: GuestMenuItem[],
  id = nextId++,
): MenuSection => ({ category: { id, slug, title }, items })
