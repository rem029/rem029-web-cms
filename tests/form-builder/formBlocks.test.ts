import { describe, expect, it } from 'vitest'

describe('form blocks', () => {
  it('saves a form with every custom block', async () => {
    // arrange: super user, tenant a, a media doc; formData(a, unique title, everyBlockFields(media))
    // act: createForm as super user, then findByID depth 0
    // assert: the saved blockTypes equal the sent ones, rating labels and list max_items kept
    expect.fail('not implemented')
  })

  it('turns on radio and date', async () => {
    // arrange: a form with a radio (direction 'row', two options) and a date field
    // act: create it
    // assert: both saved, radio direction is 'row'
    expect.fail('not implemented')
  })

  it('saves a multi-step form with nested groups and lists', async () => {
    // arrange: formData(a, unique title, multiStepFields(media))
    // act: create, then read back
    // assert: two steps; step 1 has the group with its fields; step 2 the conditional → list → fields
    expect.fail('not implemented')
  })

  it('saves content blocks inside steps and groups', async () => {
    // arrange: a multi-step form with an image + message block in a step and an image in a group
    // act: create, read back
    // assert: the image and message blocks are there with their media and caption
    expect.fail('not implemented')
  })

  it('saves css classes on fields and steps', async () => {
    // arrange: a multi-step form, css_class on a step, a stock text field and a custom rating
    // act: create, read back
    // assert: each css_class is saved as sent
    expect.fail('not implemented')
  })

  it('refuses a multi-step form with other top-level fields', async () => {
    // arrange: a multi-step block plus a text field at the top level
    // act: create as super user
    // assert: rejects; rejectionText mentions moving the fields into a step
    expect.fail('not implemented')
  })

  it('keeps forms of other tenants out of reach', async () => {
    // arrange: a form in tenant b (created as super user); member of tenant a
    // act: find forms by that title as member, overrideAccess false
    // assert: no docs
    expect.fail('not implemented')
  })
})
