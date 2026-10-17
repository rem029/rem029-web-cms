import type { CSSProperties } from 'react'

import type { Menu } from '@/payload-types'

/**
 * A menu's own colours (Page tab → Colours, `#RRGGBB` or empty) as the site theme's CSS
 * variables on the menu wrapper, so every themed class inside (`bg-primary`, `bg-card`, …) uses
 * them. The theme variables hold HSL triplets (`222 47% 11%`), so hex is converted. Empty
 * colours set nothing: the tenant theme applies. Pure.
 */
export const menuColorVars = (colors: Menu['colors']): CSSProperties => {
  // 1. for each of primary → --primary, background → --background, card → --card,
  //    text → --foreground and --card-foreground: when it's #RRGGBB, set the variable to
  //    hexToHsl(value)
  // 2. return the object (React accepts custom properties in style)
  void colors
  throw new Error('not implemented')
}

/** `#1d4ed8` → `224 76% 48%` (the theme's HSL triplet format). */
export const hexToHsl = (hex: string): string => {
  // standard rgb → hsl, rounded to whole numbers
  void hex
  throw new Error('not implemented')
}
