// The /menu list (rem0017 phase 3 step 2, listMenus in `src/app/(frontend)/menu/_data/menuData.ts`):
// the host tenant's published menus only, fail closed without a tenant.
import { describe, expect, it } from 'vitest'

describe('menu list', () => {
  it('lists only the host tenant menus', async () => {
    // act: listMenus(payload, tenantA.id, { locale: 'en' })
    // assert: every menu belongs to test-a, test-b's same-slug menu is not there
    expect.fail('not implemented')
  })

  it('leaves out draft menus', async () => {
    // act: listMenus for test-a
    // assert: the TEST_MENU draft menu is not there
    expect.fail('not implemented')
  })

  it('sorts menus by title', async () => {
    // act: listMenus for test-a
    // assert: titles are in alphabetical order
    expect.fail('not implemented')
  })

  it('returns nothing without a tenant', async () => {
    // act: listMenus(payload, null, { locale: 'en' })
    // assert: []
    expect.fail('not implemented')
  })
})
