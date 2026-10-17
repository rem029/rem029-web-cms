/**
 * Shapes the menu builder passes between its server functions (`../utils/builder.ts`), the server
 * actions (`./actions.ts`) and the client panels. Types only: no `payload` import, client-safe.
 */
import type { Availability } from '@/common/fields/menuFields'

/** A refused or failed builder call, with what went wrong in plain words. */
export type BuilderRefusal = { ok: false; error: string }

/** What every builder call returns. */
export type BuilderResult<T extends object = object> = ({ ok: true } & T) | BuilderRefusal

/** The tenant and admin locale every call works in (the tenant comes from the menu's form). */
export type BuilderScope = {
  tenantId: number
  locale?: string
}

/** One row of the items panel. */
export type BuilderItem = {
  id: number
  title: string
  slug: string
  price: number
  categoryId: number | null
  categoryTitle: string | null
  imageUrl: string | null
  inStock: boolean
  isActive: boolean
}

/** One row of the categories panel. */
export type BuilderCategory = {
  id: number
  title: string
  sortOrder: number
  itemCount: number
}

/** An allergen or tag, for the item form's pickers. */
export type BuilderLookup = {
  id: number
  title: string
}

/** The inline edits of the items panel. */
export type QuickItemUpdate = {
  price?: number
  inStock?: boolean
  isActive?: boolean
  category?: number | null
}

export type ModifierGroupInput = {
  name: string
  inputType: 'checkbox' | 'radio'
  required: boolean
  options: { label: string }[]
}

/** The full item form (`ItemFormModal`), in the admin locale. */
export type ItemFormData = {
  title: string
  price: number
  category: number | null
  description: string
  image: number | null
  allergens: number[]
  tags: number[]
  availability: Availability[]
  inStock: boolean
  isActive: boolean
  modifierGroups: ModifierGroupInput[]
}

export type CategoryFormData = {
  title: string
}
