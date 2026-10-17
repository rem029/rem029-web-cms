import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isAdminAliasHost, requestHost } from './common/utils/resolveTenantHost'
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY } from './utilities/constant'

// the admin panel lives only on the server url (the base domain): tenant and custom-domain
// hosts redirect there, so there's one admin origin and one login. skipped when
// NEXT_PUBLIC_SERVER_URL isn't set, to avoid redirecting a real host to a localhost default.
const redirectAdminToServerURL = (request: NextRequest): NextResponse => {
  const serverURL = process.env.NEXT_PUBLIC_SERVER_URL
  const host = requestHost((n) => request.headers.get(n))?.toLowerCase()
  if (!serverURL || !host || host === new URL(serverURL).host) return NextResponse.next()

  const { pathname, search } = request.nextUrl
  return NextResponse.redirect(new URL(pathname + search, serverURL), 307)
}

// Payload 3.44 keeps Light/Dark in `payload-theme` and stores Automatic by deleting it, so a missing
// cookie can't tell a first visit from a chosen Automatic: a one-time marker says we already set
// the dark default, after which nothing is touched again. Re-check on the Payload upgrade (rem0013).
export const ADMIN_THEME_COOKIE = 'payload-theme'
export const ADMIN_THEME_DEFAULT_MARKER = 'admin-theme-default'

const ONE_YEAR = 60 * 60 * 24 * 365

const defaultAdminTheme = (request: NextRequest, response: NextResponse): NextResponse => {
  // a redirect to the admin's own host: the theme is set there
  if (response.headers.has('location')) return response
  if (request.cookies.has(ADMIN_THEME_DEFAULT_MARKER)) return response

  // not httpOnly: Payload's client reads and rewrites the theme cookie
  const options = { path: '/', maxAge: ONE_YEAR, httpOnly: false, sameSite: 'lax' as const }
  let result = response
  if (!request.cookies.has(ADMIN_THEME_COOKIE)) {
    // Payload's server picks the theme from the request's cookies: hand it `dark` now too, so the
    // first page doesn't render light and then flip
    request.cookies.set(ADMIN_THEME_COOKIE, 'dark')
    result = NextResponse.next({ request: { headers: request.headers } })
    result.cookies.set({ name: ADMIN_THEME_COOKIE, value: 'dark', ...options })
  }
  result.cookies.set({ name: ADMIN_THEME_DEFAULT_MARKER, value: '1', ...options })
  return result
}

export function middleware(request: NextRequest) {
  const host = requestHost((n) => request.headers.get(n))
  const serverURL = process.env.NEXT_PUBLIC_SERVER_URL

  if (serverURL && isAdminAliasHost(host, process.env.TENANT_BASE_DOMAIN)) {
    const { pathname, search } = request.nextUrl
    return NextResponse.redirect(new URL(pathname + search, serverURL), 307)
  }

  if (/^\/admin(\/|$)/.test(request.nextUrl.pathname)) {
    return defaultAdminTheme(request, redirectAdminToServerURL(request))
  }

  const { searchParams } = new URL(request.url)
  const langParam = searchParams.get('lang')

  // Get current locale from cookie if it exists
  const currentLocale = request.cookies.get(LOCALE_STORAGE_KEY)?.value

  // Create response object
  const response = NextResponse.next()

  // Case 1: If lang param is provided and valid, use it and update cookie
  if (langParam) {
    // Only update if different from current cookie
    if (langParam !== currentLocale) {
      response.cookies.set({
        name: LOCALE_STORAGE_KEY,
        value: langParam,
        path: '/',
        maxAge: 60 * 60 * 24 * 365, // 1 year
        httpOnly: false,
        sameSite: 'lax',
      })
    }
  }
  // Case 2: No lang param, but no saved locale either - set default
  else if (!currentLocale) {
    response.cookies.set({
      name: LOCALE_STORAGE_KEY,
      value: DEFAULT_LOCALE,
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      httpOnly: false,
      sameSite: 'lax',
    })
  }

  return response
}

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/((?!api|admin|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}
