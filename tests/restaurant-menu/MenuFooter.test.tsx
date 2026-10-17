// @vitest-environment jsdom
// The menu pages' own footer (rem0017 phase 3, `src/app/(frontend)/menu/_components/MenuFooter.tsx`),
// in place of the site Footer.
import { describe, expect, it } from 'vitest'

describe('MenuFooter', () => {
  it('shows the business name, phone and address', () => {
    // arrange: settings with siteName, contact.phone, address.full_address
    // act: render <MenuFooter settings={…} locale="en" />
    // assert: the name, a tel: link with the phone, the address
    expect.fail('not implemented')
  })

  it('leaves out contact rows without a value', () => {
    // arrange: settings with only siteName
    // act: render
    // assert: the name, no tel: link
    expect.fail('not implemented')
  })

  it('links to all menus in arabic', () => {
    // arrange: a wrapper with dir="rtl"
    // act: render with locale "ar"
    // assert: a link to /menu named 'كل القوائم'
    expect.fail('not implemented')
  })
})
