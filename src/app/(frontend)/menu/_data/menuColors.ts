import type { CSSProperties } from 'react'

import type { Menu } from '@/payload-types'

/**
 * A menu's own colours (Page tab → Colours, `#RRGGBB` or empty) as the menu colour tokens
 * (`menu.css`) on the menu page's `menu-theme` wrapper. Empty colours set nothing: the tenant
 * theme applies. Pure.
 */

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

// each menu colour and the token it sets
const TOKENS: [keyof NonNullable<Menu['colors']>, string][] = [
  ['primary', '--menu-primary'],
  ['background', '--menu-bg'],
  ['card', '--menu-card'],
  ['text', '--menu-text'],
]

export const menuColorVars = (colors: Menu['colors']): CSSProperties => {
  const vars: Record<string, string> = {}
  for (const [key, token] of TOKENS) {
    const value = colors?.[key]
    if (value && HEX_COLOR.test(value)) vars[token] = value
  }
  // React takes custom properties in style; CSSProperties doesn't list them
  return vars as CSSProperties
}
