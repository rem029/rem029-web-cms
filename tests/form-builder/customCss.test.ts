import { describe, expect, it } from 'vitest'

import { scopeCustomCss } from '@/components/FormRenderer/customCss'

describe('scopeCustomCss', () => {
  it('scopes rules to the form', () => {
    // arrange
    const css = '.fb-label { color: red; }'

    // act
    const scoped = scopeCustomCss(css, 7)

    // assert
    expect(scoped.startsWith('[data-form-id="7"] {')).toBe(true)
    expect(scoped).toContain('.fb-label { color: red; }')
    expect(scoped.trimEnd().endsWith('}')).toBe(true)
  })

  it('strips a style breakout', () => {
    // arrange
    const css = '.a { color: red; }</style><script>alert(1)</script>'

    // act
    const scoped = scopeCustomCss(css, 7)

    // assert
    expect(scoped).not.toContain('<')
  })

  it('drops @import', () => {
    // arrange
    const css = '@import url("https://evil.test/x.css");\n.a { color: red; }'

    // act
    const scoped = scopeCustomCss(css, 7)

    // assert
    expect(scoped).not.toContain('@import')
    expect(scoped).toContain('.a { color: red; }')
  })

  it('drops css with unbalanced braces', () => {
    // arrange
    const css = '.a { color: red; } } body { display: none; }'

    // act
    const scoped = scopeCustomCss(css, 7)

    // assert
    expect(scoped).toBe('')
  })
})
