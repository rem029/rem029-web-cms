import { describe, expect, it } from 'vitest'

// findFrontendForm / isFormForTenant (src/common/utils/frontendForm.ts): which form a public page
// may show on a host. Forms built with ./forms (createForm, formData) in test-a and test-b; the
// tenant id stands in for the host (as getFrontendTenantId resolves it).
describe('findFrontendForm', () => {
  it('finds a form of the host tenant by slug', async () => {
    // arrange: an active form in test-a
    // act: findFrontendForm(payload, test-a, form.slug, { draft: false, locale: 'en' })
    // assert: the form (same id), its header image populated (depth 1)
    expect.fail('not implemented')
  })

  it('hides a form of another tenant', async () => {
    // arrange: an active form in test-b
    // act: findFrontendForm(payload, test-a, its slug, { draft: false, locale: 'en' })
    // assert: null
    expect.fail('not implemented')
  })

  it('hides an inactive form', async () => {
    // arrange: a form in test-a with isActive false
    // act: findFrontendForm(payload, test-a, its slug, { draft: false, locale: 'en' })
    // assert: null
    expect.fail('not implemented')
  })

  it('hides a form that was never published', async () => {
    // arrange: a form in test-a saved as a draft only (_status 'draft')
    // act: findFrontendForm(payload, test-a, its slug, { draft: false, locale: 'en' })
    // assert: null
    expect.fail('not implemented')
  })

  it('shows the latest draft while previewing', async () => {
    // arrange: a published form in test-a, then a draft save (autosave) with a new title
    // act: findFrontendForm with draft true, then with draft false
    // assert: the draft title while previewing; the published title otherwise
    expect.fail('not implemented')
  })

  it('finds nothing for an unknown host', async () => {
    // arrange: an active form in test-a
    // act: findFrontendForm(payload, null, its slug, { draft: false, locale: 'en' })
    // assert: null
    expect.fail('not implemented')
  })
})

describe('isFormForTenant', () => {
  it('accepts an active form of the host tenant', () => {
    // arrange: a form doc in memory with tenant test-a, isActive true
    // act: isFormForTenant(form, test-a)
    // assert: true
    expect.fail('not implemented')
  })

  it('refuses a form it cannot show', () => {
    // arrange (it.each): another tenant's form, an inactive form, an unpopulated id, no host
    // act: isFormForTenant(value, tenantId)
    // assert: false
    expect.fail('not implemented')
  })
})
