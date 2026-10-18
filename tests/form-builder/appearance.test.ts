import { describe, expect, it } from 'vitest'

import { appearanceToStyle } from '@/components/FormRenderer/appearance'

describe('appearanceToStyle', () => {
  it('maps presets to data attributes and css vars', () => {
    // arrange
    const appearance = {
      width: 'wide' as const,
      field_style: 'filled' as const,
      radius: 'pill' as const,
      density: 'compact' as const,
      button_full_width: true,
      accent_color: '#7c3aed',
    }

    // act
    const { dataAttrs, cssVars } = appearanceToStyle(appearance)

    // assert
    expect(dataAttrs).toMatchObject({
      'data-width': 'wide',
      'data-field-style': 'filled',
      'data-button-full': 'true',
    })
    expect(cssVars).toMatchObject({
      '--fb-radius': '9999px',
      '--fb-max-width': '56rem',
      '--fb-gap': '0.75rem',
      '--fb-accent': '#7c3aed',
      '--fb-accent-foreground': '#ffffff',
    })
  })

  it('falls back to theme tokens without an accent', () => {
    // arrange
    const appearance = null

    // act
    const { dataAttrs, cssVars } = appearanceToStyle(appearance)

    // assert: the theme css defines --primary as a full colour (#102721), not an hsl triplet
    expect(cssVars).toMatchObject({
      '--fb-accent': 'var(--primary)',
      '--fb-accent-foreground': 'var(--primary-foreground)',
    })
    expect(dataAttrs['data-width']).toBe('medium')
  })

  it('picks dark text on a light accent', () => {
    // arrange
    const appearance = { accent_color: '#fde68a' }

    // act
    const { cssVars } = appearanceToStyle(appearance)

    // assert
    expect(cssVars).toMatchObject({ '--fb-accent-foreground': '#000000' })
  })
})
