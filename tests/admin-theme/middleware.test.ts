// The admin opens on Automatic (the device's colour scheme): the middleware never sets a theme, so
// Payload's own default and the header toggle decide.
import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'

import { middleware } from '@/middleware'

describe('admin theme cookie', () => {
  it('leaves the theme to the device on a first visit', () => {
    // arrange: a request to /admin on the server url's host, no cookies
    const origin = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
    const request = new NextRequest(new URL('/admin', origin))

    // act: middleware(request)
    const response = middleware(request)

    // assert: no `payload-theme` cookie on the response
    expect(response.cookies.get('payload-theme')).toBeUndefined()
  })
})
