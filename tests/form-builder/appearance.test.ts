import { describe, expect, it } from 'vitest'

describe('appearanceToStyle', () => {
  it('maps presets to data attributes and css vars', () => {
    // arrange: { width: 'wide', field_style: 'filled', radius: 'pill', density: 'compact',
    //            button_full_width: true, accent_color: '#7c3aed' }
    // act: appearanceToStyle(appearance)
    // assert: data-width wide, data-field-style filled, data-button-full true;
    //         --fb-radius 9999px, --fb-max-width 56rem, --fb-gap 0.75rem,
    //         --fb-accent #7c3aed, --fb-accent-foreground #ffffff
    expect.fail('not implemented')
  })

  it('falls back to theme tokens without an accent', () => {
    // arrange: no appearance (null)
    // act: appearanceToStyle(null)
    // assert: --fb-accent hsl(var(--primary)), --fb-accent-foreground
    //         hsl(var(--primary-foreground)); data-width medium (the defaults)
    expect.fail('not implemented')
  })

  // proposed addition
  it('picks dark text on a light accent', () => {
    // arrange: accent_color '#fde68a' (light yellow)
    // act: appearanceToStyle({ accent_color })
    // assert: --fb-accent-foreground #000000
    expect.fail('not implemented')
  })
})
