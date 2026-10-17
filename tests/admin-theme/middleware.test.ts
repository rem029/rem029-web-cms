// The admin opens dark the first time; after that the user's choice (Light, Dark or Automatic,
// which Payload stores by deleting its cookie) is never overridden.
import { describe, expect, it } from 'vitest'

describe('admin theme cookie', () => {
  it('sets dark and the marker on a first admin visit', () => {
    // arrange: an /admin request without cookies
    // act: middleware(request)
    // assert: payload-theme=dark and admin-theme-default are set
    expect.fail('not implemented')
  })

  it('keeps a saved light theme', () => {
    // arrange: an /admin request with payload-theme=light, no marker
    // act: middleware(request)
    // assert: payload-theme is not set again; the marker is set
    expect.fail('not implemented')
  })

  it('leaves automatic alone after the first visit', () => {
    // arrange: an /admin request with the marker and no payload-theme
    // act: middleware(request)
    // assert: neither cookie is set
    expect.fail('not implemented')
  })

  it('does not set it on public pages', () => {
    // arrange: a request to / without cookies
    // act: middleware(request)
    // assert: neither cookie is set
    expect.fail('not implemented')
  })
})
