// accentFromThemeCSS: the admin accent colour from a theme's `--primary`, hex only. Pure, no db.
import { describe, expect, it } from 'vitest'

import { accentFromThemeCSS } from '@/common/utils/tenantBranding'

describe('accentFromThemeCSS', () => {
  it('reads a 6-digit hex', () => {
    // act
    const result = accentFromThemeCSS(':root { --primary: #1D4ED8; }')

    // assert
    expect(result).toBe('#1D4ED8')
  })

  it('reads a 3-digit hex', () => {
    // act
    const result = accentFromThemeCSS('--primary:#abc;')

    // assert
    expect(result).toBe('#abc')
  })

  it('ignores a named colour', () => {
    // act
    const result = accentFromThemeCSS('--primary: red;')

    // assert
    expect(result).toBe(null)
  })

  it('ignores url()', () => {
    // act
    const result = accentFromThemeCSS('--primary: url(x);')

    // assert
    expect(result).toBe(null)
  })

  it('stops at the end of the declaration', () => {
    // act
    const result = accentFromThemeCSS('--primary: #1d4ed8; } body { color: red }')

    // assert
    expect(result).toBe('#1d4ed8')
  })

  it('ignores an injection attempt', () => {
    // act
    const result = accentFromThemeCSS('--primary: #1d4ed8 ") ; x')

    // assert
    expect(result).toBe(null)
  })

  it('returns null without css', () => {
    // act
    const result = accentFromThemeCSS(undefined)

    // assert
    expect(result).toBe(null)
  })
})
