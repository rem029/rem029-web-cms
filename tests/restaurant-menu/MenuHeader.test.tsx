// @vitest-environment jsdom
// The menu pages' header (rem0017 phase 3, `src/app/(frontend)/menu/_components/MenuHeader.tsx`):
// the menu pages don't use the site Header (they sit outside the `(site)` route group).
import { describe, expect, it } from 'vitest'

describe('MenuHeader', () => {
  it('shows the title linking home', () => {
    // act: render <MenuHeader title="Dinner" logo={null} homeHref="/menu" showLanguageSwitch={false} />
    // assert: a link to /menu named 'Dinner'
    expect.fail('not implemented')
  })

  it('shows the language switch when the menu enables it', () => {
    // act: render with showLanguageSwitch true (LocaleSwitch's next/navigation mocked)
    // assert: links EN and AR are shown; with false they aren't
    expect.fail('not implemented')
  })
})
