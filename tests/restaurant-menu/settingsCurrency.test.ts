// The tenant's menu currency on Settings (rem0017 phase 1 step 1): prices on every menu of the
// tenant are shown in it.
import { describe, expect, it } from 'vitest'

describe('settings currency', () => {
  it('defaults the currency to USD', async () => {
    // arrange: test-c's Settings doc (created with the tenant, never edited)
    // act: read it
    // assert: currency is 'USD'
    expect.fail('not implemented')
  })

  it('lets a tenant admin change the currency', async () => {
    // arrange: the tenant admin of test-a (TEST_USERS.tenantAdmin), test-a's Settings doc
    // act: update currency to 'QAR' with overrideAccess: false (restore it afterwards)
    // assert: currency reads back 'QAR'
    expect.fail('not implemented')
  })
})
