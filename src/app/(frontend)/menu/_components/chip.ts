import { cn } from '@/utilities/ui'

/** 44px tall on touch screens (coarse pointers), compact with a mouse: chips, bar buttons, links. */
export const touchTarget = '[@media(pointer:coarse)]:min-h-11'

/** A filter toggle chip (allergens, availability): primary fill while `aria-pressed`. */
export const chipClass = cn(
  touchTarget,
  'rounded-full border border-menu-border px-3 py-1.5 text-sm font-medium text-menu-text',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-menu-primary',
  'aria-pressed:border-menu-primary aria-pressed:bg-menu-primary aria-pressed:text-menu-primary-text',
)
