// The admin opens dark the first time; after that the user's choice (Light, Dark or Automatic,
// which Payload stores by deleting its cookie) is never overridden.
import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'

import { ADMIN_THEME_COOKIE, ADMIN_THEME_DEFAULT_MARKER, middleware } from '@/middleware'

// the server url's own host, so the admin isn't redirected to it
const origin = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

const requestTo = (path: string, cookie?: string) =>
  new NextRequest(new URL(path, origin), { headers: cookie ? { cookie } : {} })

describe('admin theme cookie', () => {
  it('sets dark and the marker on a first admin visit', () => {
    // arrange
    const request = requestTo('/admin')

    // act
    const response = middleware(request)

    // assert
    expect(response.cookies.get(ADMIN_THEME_COOKIE)?.value).toBe('dark')
    expect(response.cookies.get(ADMIN_THEME_DEFAULT_MARKER)).toBeDefined()
  })

  it('keeps a saved light theme', () => {
    // arrange
    const request = requestTo('/admin/collections/pages', `${ADMIN_THEME_COOKIE}=light`)

    // act
    const response = middleware(request)

    // assert
    expect(response.cookies.get(ADMIN_THEME_COOKIE)).toBeUndefined()
    expect(response.cookies.get(ADMIN_THEME_DEFAULT_MARKER)).toBeDefined()
  })

  it('leaves automatic alone after the first visit', () => {
    // arrange
    const request = requestTo('/admin', `${ADMIN_THEME_DEFAULT_MARKER}=1`)

    // act
    const response = middleware(request)

    // assert
    expect(response.cookies.get(ADMIN_THEME_COOKIE)).toBeUndefined()
    expect(response.cookies.get(ADMIN_THEME_DEFAULT_MARKER)).toBeUndefined()
  })

  it('does not set it on public pages', () => {
    // arrange
    const request = requestTo('/')

    // act
    const response = middleware(request)

    // assert
    expect(response.cookies.get(ADMIN_THEME_COOKIE)).toBeUndefined()
    expect(response.cookies.get(ADMIN_THEME_DEFAULT_MARKER)).toBeUndefined()
  })
})
