// A menu's own colours as theme variables (rem0017 phase 3 step 1,
// `src/app/(frontend)/menu/_data/menuColors.ts`). Pure, no db.
import { describe, expect, it } from 'vitest'

describe('menuColorVars', () => {
  it('turns hex colours into theme variables', () => {
    // act: menuColorVars({ primary: '#1d4ed8', text: '#000000' })
    // assert: { '--primary': '224 76% 48%', '--foreground': '0 0% 0%', '--card-foreground': '0 0% 0%' }
    expect.fail('not implemented')
  })

  it('leaves empty colours to the theme', () => {
    // act: menuColorVars({ primary: '', background: null }) and menuColorVars(undefined)
    // assert: {} both times
    expect.fail('not implemented')
  })
})
