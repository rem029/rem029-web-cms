// A menu's own colours as the menu colour tokens (menu.css) (rem0017 phase 3 step 1,
// `src/app/(frontend)/menu/_data/menuColors.ts`). Pure, no db.
import { describe, expect, it } from 'vitest'

import { menuColorVars } from '@/app/(frontend)/menu/_data/menuColors'

describe('menuColorVars', () => {
  it('turns hex colours into theme variables', () => {
    // act
    const vars = menuColorVars({ primary: '#1d4ed8', text: '#000000' })

    // assert
    expect(vars).toEqual({ '--menu-primary': '#1d4ed8', '--menu-text': '#000000' })
  })

  it('leaves empty colours to the theme', () => {
    // act
    const empty = menuColorVars({ primary: '', background: null })
    const none = menuColorVars(undefined)

    // assert
    expect(empty).toEqual({})
    expect(none).toEqual({})
  })
})
