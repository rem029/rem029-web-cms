/**
 * Turns a form's Appearance tab (phase 1 `appearanceField`) into what the renderer root carries:
 * `data-*` attributes for the presets (the default design in `formRenderer.css` is keyed off
 * them) and CSS variables for the values (`--fb-accent`, `--fb-radius`, `--fb-gap`,
 * `--fb-max-width`, `--fb-bg-image`). With no accent the variables point at the tenant theme
 * tokens (`hsl(var(--primary))`), so a form follows the site's branding by default.
 * Used by `FormRenderer` (index.tsx); pure, unit tested in `tests/form-builder/appearance.test.ts`.
 */
import type React from 'react'

import type { Form } from '@/payload-types'

export type FormAppearance = NonNullable<Form['appearance']>

export type AppearanceStyle = {
  /** `data-width="wide"`, `data-field-style="filled"`, … one per preset, defaults filled in. */
  dataAttrs: Record<`data-${string}`, string>
  cssVars: React.CSSProperties
}

/** The preset defaults, matching the field defaults in `formAppearance.ts`. */
export const APPEARANCE_DEFAULTS = {
  width: 'medium',
  card: 'card',
  density: 'comfortable',
  field_style: 'outlined',
  label_position: 'above',
  radius: 'medium',
  button_style: 'solid',
  step_indicator: 'progress',
  background_overlay: 'none',
} as const

/** Black or white text for a hex background, whichever reads (WCAG relative luminance). */
export const readableTextOn = (hex: string): '#000000' | '#ffffff' => {
  // 1. expand #rgb to #rrggbb, channels to 0–1, linearise (sRGB)
  // 2. luminance = 0.2126 r + 0.7152 g + 0.0722 b
  // 3. contrast with white vs black: pick the higher
  throw new Error('not implemented')
}

export const appearanceToStyle = (
  appearance: FormAppearance | null | undefined,
): AppearanceStyle => {
  // 1. each preset: appearance value ?? APPEARANCE_DEFAULTS → data-width, data-card, data-density,
  //    data-field-style, data-label-position, data-radius, data-button-style, data-step-indicator,
  //    data-overlay; data-button-full="true" only when button_full_width
  // 2. --fb-accent: accent_color (validated hex) else 'hsl(var(--primary))';
  //    --fb-accent-foreground: readableTextOn(accent) else 'hsl(var(--primary-foreground))'
  // 3. --fb-radius from radius: none 0, small 0.25rem, medium 0.5rem, large 1rem, pill 9999px
  // 4. --fb-max-width from width: narrow 32rem, medium 42rem, wide 56rem, full 100%
  // 5. --fb-gap from density: comfortable 1.25rem, compact 0.75rem
  // 6. background_image populated with a url → --fb-bg-image: url("<url>") (quotes escaped)
  throw new Error('not implemented')
}
