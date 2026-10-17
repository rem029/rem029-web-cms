import { cn } from '@/utilities/ui'

/** A filter toggle chip (allergens, availability): primary fill while `aria-pressed`. */
export const chipClass = cn(
  'rounded-full border border-menu-border px-3 py-1.5 text-sm font-medium text-menu-text',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-menu-primary',
  'aria-pressed:border-menu-primary aria-pressed:bg-menu-primary aria-pressed:text-menu-primary-text',
)
