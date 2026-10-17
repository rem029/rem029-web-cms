import { describe, expect, it } from 'vitest'

// uploadFile (src/components/FormRenderer/submissions.ts): what uploadFileAction does once the
// request is read. The form in test-a has a File field `receipt`; files are `File` objects as
// the browser sends them (a 1x1 png, a text file, an 11 MB buffer).
describe('uploadFile', () => {
  it('stores an allowed file under the form tenant', async () => {
    // arrange: open form in test-a with a file field `receipt`; context tenantId test-a
    // act: uploadFile(context, { formId, locale: 'en', fieldName: 'receipt', file: png })
    // assert: { ok: true, id }; the form-uploads doc has tenant test-a, form, field_name receipt,
    //         mimeType image/png
    expect.fail('not implemented')
  })

  it('refuses a disallowed mime type', async () => {
    // arrange: a text/plain File
    // act: uploadFile
    // assert: { ok: false, error: formText('en').wrongType }; no form-uploads doc for the form
    expect.fail('not implemented')
  })

  it('refuses a file over the size limit', async () => {
    // arrange: an image/png File of FORM_UPLOAD_MAX_BYTES + 1
    // act: uploadFile
    // assert: { ok: false, error: tooLarge }; nothing stored
    expect.fail('not implemented')
  })

  // proposed addition
  it('refuses a field the form does not have', async () => {
    // arrange: fieldName 'nope' (and 'name', a text field: it.each)
    // act: uploadFile with a png
    // assert: { ok: false }; nothing stored
    expect.fail('not implemented')
  })
})
