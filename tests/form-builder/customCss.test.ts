import { describe, expect, it } from 'vitest'

describe('scopeCustomCss', () => {
  it('scopes rules to the form', () => {
    // arrange: '.fb-label { color: red; }'
    // act: scopeCustomCss(css, 7)
    // assert: starts with '[data-form-id="7"] {' and contains the rule inside it
    expect.fail('not implemented')
  })

  it('strips a style breakout', () => {
    // arrange: '.a { color: red; }</style><script>alert(1)</script>'
    // act: scopeCustomCss(css, 7)
    // assert: no '<' in the result
    expect.fail('not implemented')
  })

  it('drops @import', () => {
    // arrange: '@import url("https://evil.test/x.css");\n.a { color: red; }'
    // act: scopeCustomCss(css, 7)
    // assert: no '@import'; '.a { color: red; }' kept
    expect.fail('not implemented')
  })

  // proposed addition
  it('drops css with unbalanced braces', () => {
    // arrange: '.a { color: red; } } body { display: none; }'
    // act: scopeCustomCss(css, 7)
    // assert: ''
    expect.fail('not implemented')
  })
})
