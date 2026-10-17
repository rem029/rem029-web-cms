import { describe, expect, it } from 'vitest'

// validateSubmission (src/plugins/hooks/validateSubmission.ts): the form's rules on every new
// form-submissions doc, checked through the plugin's public create as anonymous (overrideAccess
// false, no user): what `POST /api/form-submissions` runs.
describe('validateSubmission', () => {
  it('applies the same checks to the rest api', async () => {
    // arrange: an inactive form, a requires_auth form, and an open form with a required field
    //          (it.each)
    // act: payload.create form-submissions as anonymous, missing the required answer
    // assert: rejects (403 for the first two, a validation error naming the field for the third)
    expect.fail('not implemented')
  })

  // proposed addition
  it('drops answers the form does not ask for', async () => {
    // arrange: an open form with `name`; submissionData name + an unknown `admin_note` + a
    //          hidden conditional answer
    // act: create as anonymous
    // assert: the saved submissionData is only [{ field: 'name', value }]
    expect.fail('not implemented')
  })

  // proposed addition
  it('refuses an upload id of another form', async () => {
    // arrange: a form-uploads doc of another form (test-b); a form in test-a with a file field
    // act: create with { field: 'receipt', value: <that id> }
    // assert: rejects with a validation error; nothing saved
    expect.fail('not implemented')
  })
})
