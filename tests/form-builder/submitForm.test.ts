import { describe, expect, it } from 'vitest'

// submitForm (src/components/FormRenderer/submissions.ts): what submitFormAction does once the
// request is read. context = { payload, tenantId: the host's tenant, user, ip: a unique one per
// test (the rate limit is per ip and form) }; forms built with ./forms (createForm, formData).
describe('submitForm', () => {
  it('saves a submission under the form tenant', async () => {
    // arrange: an open form in test-a with a required text field `name`; context tenantId test-a
    // act: submitForm(context, { formId, locale: 'en', submissionData: [{ field: 'name', value }] })
    // assert: { ok: true }; one form-submissions doc for the form, tenant test-a, data as sent
    expect.fail('not implemented')
  })

  it('refuses a form of another tenant host', async () => {
    // arrange: a form in test-a; context tenantId test-b
    // act: submitForm
    // assert: { ok: false } with somethingWrong; no submission saved for the form
    expect.fail('not implemented')
  })

  it('refuses an inactive form', async () => {
    // arrange: a form in test-a with isActive false
    // act: submitForm
    // assert: { ok: false, error: formText('en').formClosed }; nothing saved
    expect.fail('not implemented')
  })

  it('refuses outside the active window', async () => {
    // arrange: a form with activeFrom tomorrow and one with activeTo yesterday (it.each)
    // act: submitForm with now = today
    // assert: notOpenYet / formClosed; nothing saved
    expect.fail('not implemented')
  })

  it('refuses an auth form without a member session', async () => {
    // arrange: a requires_auth form in test-a; users: none, otherTenant (test-b only) (it.each)
    // act: submitForm
    // assert: { ok: false, error: membersOnly }; nothing saved
    expect.fail('not implemented')
  })

  it('drops a submission that fills the honeypot', async () => {
    // arrange: an open form in test-a
    // act: submitForm with honeypot 'https://spam.example'
    // assert: { ok: true } (the bot sees success); no submission saved
    expect.fail('not implemented')
  })

  it('rate limits repeated submissions', async () => {
    // arrange: an open form; one ip
    // act: SUBMIT_LIMIT + 1 submissions from that ip, then one from another ip
    // assert: the last over-limit one { ok: false, error: tooMany }; the other ip { ok: true };
    //         SUBMIT_LIMIT submissions saved from the first ip
    expect.fail('not implemented')
  })

  // proposed addition
  it('refuses without accepting the terms', async () => {
    // arrange: a form with has_terms true
    // act: submitForm without termsAccepted, then with termsAccepted true
    // assert: first { ok: false, error: termsRequired }, second { ok: true }
    expect.fail('not implemented')
  })
})
