// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup } from '@testing-library/react'

describe('FormRenderer', () => {
  afterEach(() => {
    cleanup()
    // and localStorage.clear()
  })

  it('renders every stock field', () => {
    // arrange: formDoc(stockFields())
    // act: render <FormRenderer form locale="en" submit upload />
    // assert: a labelled control per field (getByLabelText), the message text, a "Send" button
    expect.fail('not implemented')
  })

  it('shows a conditional field only when matched', async () => {
    // arrange: formDoc(conditionalFields()), rendered
    // act: pick "Alone", then "Family"
    // assert: no "Family note" after Alone; "Family note" shows after Family
    expect.fail('not implemented')
  })

  it('skips required checks on hidden fields', async () => {
    // arrange: formDoc(conditionalFields()), rendered, "Alone" picked (family_note hidden)
    // act: click "Send"
    // assert: submit called once, no "required" error
    expect.fail('not implemented')
  })

  it('adds list rows up to max_items', async () => {
    // arrange: formDoc(listFields()), rendered (one row)
    // act: click "Add Family" once
    // assert: two "Name" inputs; the add button is disabled
    expect.fail('not implemented')
  })

  it('walks a multi-step form to the review screen', async () => {
    // arrange: formDoc(twoStepFields()), rendered
    // act: Next with full_name empty; fill it, Next; Review
    // assert: required error on step 1 and still on it; then step 2; then the review lists
    //         "Full name" with the typed value and an Edit per step
    expect.fail('not implemented')
  })

  it('renders right-to-left in arabic', () => {
    // arrange: formDoc(twoStepFields())
    // act: render with locale="ar"
    // assert: the .fb-form root has dir="rtl" and lang="ar"; the Next button reads "التالي"
    expect.fail('not implemented')
  })

  // proposed additions (raised at the skeleton review; dropped if not agreed)
  it('submits flattened answers and shows the confirmation', async () => {
    // arrange: formDoc(listFields()), rendered
    // act: type "Sara" in the first Name, click "Send"
    // assert: submit called with [{ field: 'family.0.name', value: 'Sara' }]; "Thanks!" shows
    expect.fail('not implemented')
  })

  it('restores a saved draft', async () => {
    // arrange: render, type "Sara", unmount
    // act: render the same form again
    // assert: the Name input holds "Sara"
    expect.fail('not implemented')
  })
})
