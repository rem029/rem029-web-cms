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

/** The style object React gets: css custom properties aren't among CSSProperties' own keys. */
export type FormCssVars = React.CSSProperties & Record<`--fb-${string}`, string>

export type AppearanceStyle = {
  /** `data-width="wide"`, `data-field-style="filled"`, … one per preset, defaults filled in. */
  dataAttrs: Record<`data-${string}`, string>
  cssVars: FormCssVars
}

type PresetKey =
  | 'width'
  | 'card'
  | 'density'
  | 'field_style'
  | 'label_position'
  | 'radius'
  | 'button_style'
  | 'step_indicator'
  | 'background_overlay'

type Presets = { [K in PresetKey]: NonNullable<FormAppearance[K]> }

/** The preset defaults, matching the field defaults in `formAppearance.ts`. */
export const APPEARANCE_DEFAULTS: Presets = {
  width: 'medium',
  card: 'card',
  density: 'comfortable',
  field_style: 'outlined',
  label_position: 'above',
  radius: 'medium',
  button_style: 'solid',
  step_indicator: 'progress',
  background_overlay: 'none',
}

const RADIUS = { none: '0', small: '0.25rem', medium: '0.5rem', large: '1rem', pill: '9999px' }
const MAX_WIDTH = { narrow: '32rem', medium: '42rem', wide: '56rem', full: '100%' }
const GAP = { comfortable: '1.25rem', compact: '0.75rem' }

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

/** Black or white text for a hex background, whichever reads (WCAG relative luminance). */
export const readableTextOn = (hex: string): '#000000' | '#ffffff' => {
  const digits = hex.slice(1)
  const full = digits.length === 3 ? [...digits].map((d) => d + d).join('') : digits
  const [r = 0, g = 0, b = 0] = [0, 2, 4].map((i) => {
    const channel = parseInt(full.slice(i, i + 2), 16) / 255
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  // contrast against white is 1.05 / (L + 0.05), against black (L + 0.05) / 0.05
  return 1.05 / (luminance + 0.05) >= (luminance + 0.05) / 0.05 ? '#ffffff' : '#000000'
}

/** A url as a css `url("…")`, with the characters that could end it escaped. */
const cssUrl = (url: string): string => `url("${url.replace(/["\\\n]/g, '')}")`

export const appearanceToStyle = (
  appearance: FormAppearance | null | undefined,
): AppearanceStyle => {
  const d = APPEARANCE_DEFAULTS
  const value: Presets = {
    width: appearance?.width || d.width,
    card: appearance?.card || d.card,
    density: appearance?.density || d.density,
    field_style: appearance?.field_style || d.field_style,
    label_position: appearance?.label_position || d.label_position,
    radius: appearance?.radius || d.radius,
    button_style: appearance?.button_style || d.button_style,
    step_indicator: appearance?.step_indicator || d.step_indicator,
    background_overlay: appearance?.background_overlay || d.background_overlay,
  }
  const accent =
    typeof appearance?.accent_color === 'string' && HEX.test(appearance.accent_color)
      ? appearance.accent_color
      : null
  const image = appearance?.background_image
  const imageUrl = typeof image === 'object' && image?.url ? image.url : null

  const dataAttrs: AppearanceStyle['dataAttrs'] = {
    'data-width': value.width,
    'data-card': value.card,
    'data-density': value.density,
    'data-field-style': value.field_style,
    'data-label-position': value.label_position,
    'data-radius': value.radius,
    'data-button-style': value.button_style,
    'data-step-indicator': value.step_indicator,
    'data-overlay': value.background_overlay,
  }
  if (appearance?.button_full_width) dataAttrs['data-button-full'] = 'true'
  if (imageUrl) dataAttrs['data-background'] = 'image'

  const cssVars: FormCssVars = {
    '--fb-accent': accent ?? 'hsl(var(--primary))',
    '--fb-accent-foreground': accent ? readableTextOn(accent) : 'hsl(var(--primary-foreground))',
    '--fb-radius': RADIUS[value.radius],
    '--fb-max-width': MAX_WIDTH[value.width],
    '--fb-gap': GAP[value.density],
  }
  if (imageUrl) cssVars['--fb-bg-image'] = cssUrl(imageUrl)

  return { dataAttrs, cssVars }
}
