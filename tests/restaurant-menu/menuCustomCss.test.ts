// A menu's own Custom CSS (rem0017 phase 3 step 6, menuCustomCss in
// `src/app/(frontend)/menu/_data/menuCustomCss.ts`): CSS for that menu's page only, kept CSS.
import { describe, expect, it } from 'vitest'

import { menuCustomCss } from '@/app/(frontend)/menu/_data/menuCustomCss'

describe('menuCustomCss', () => {
  it('keeps plain css as it is', () => {
    // arrange: '.menu-card-title { font-size: 2rem; }'
    const css = '.menu-card-title { font-size: 2rem; }'

    // act: menuCustomCss(css)
    const result = menuCustomCss(css)

    // assert: the same text
    expect(result).toBe(css)
  })

  it('escapes < so the css cannot close its style tag', () => {
    // arrange: 'a{} </style><script>alert(1)</script>'
    const css = 'a{} </style><script>alert(1)</script>'

    // act: menuCustomCss(css)
    const result = menuCustomCss(css)

    // assert: no '<' left in the result ('\3c ' instead)
    expect(result).not.toContain('<')
    expect(result).toBe('a{} \\3c /style>\\3c script>alert(1)\\3c /script>')
  })

  it('removes imports from untrusted hosts', () => {
    // arrange: "@import url('https://evil.example/x.css'); @import url('https://fonts.googleapis.com/css2?family=Inter');"
    const css =
      "@import url('https://evil.example/x.css'); @import url('https://fonts.googleapis.com/css2?family=Inter');"

    // act: menuCustomCss(css)
    const result = menuCustomCss(css)

    // assert: the evil import gone, the google fonts import kept
    expect(result).not.toContain('evil.example')
    expect(result).toContain('fonts.googleapis.com')
  })

  it('returns nothing for empty css', () => {
    // arrange: null, '' and '   '
    // act: menuCustomCss for each (it.each)
    // assert: ''
    expect(menuCustomCss(null)).toBe('')
    expect(menuCustomCss('')).toBe('')
    expect(menuCustomCss('   ')).toBe('')
  })
})
