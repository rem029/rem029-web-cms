import { describe, expect, it } from 'vitest'

describe('form localization', () => {
  it('keeps a title per language', async () => {
    // arrange: a form created in en with title 'Contact us'
    // act: update with locale ar, title 'اتصل بنا'; read back in en and in ar
    // assert: en title 'Contact us', ar title 'اتصل بنا'
    expect.fail('not implemented')
  })

  it('keeps one email subject for every language', async () => {
    // arrange: a form with one email, subject 'New message', created in en
    // act: read back with locale ar
    // assert: subject is 'New message' in ar too (one value, not a per-language copy)
    expect.fail('not implemented')
  })
})
