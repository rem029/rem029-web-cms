import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { LOCALE_STORAGE_KEY, DEFAULT_LOCALE } from './utilities/constant'

// the admin panel lives only on the server url (the base domain): tenant and custom-domain
// hosts redirect there, so there's one admin origin and one login. skipped when
// NEXT_PUBLIC_SERVER_URL isn't set, to avoid redirecting a real host to a localhost default.
const redirectAdminToServerURL = (request: NextRequest): NextResponse => {
  const serverURL = process.env.NEXT_PUBLIC_SERVER_URL
  const host = request.headers.get('host')?.toLowerCase()
  if (!serverURL || !host || host === new URL(serverURL).host) return NextResponse.next()

  const { pathname, search } = request.nextUrl
  return NextResponse.redirect(new URL(pathname + search, serverURL), 307)
}

export function middleware(request: NextRequest) {
  if (/^\/admin(\/|$)/.test(request.nextUrl.pathname)) {
    return redirectAdminToServerURL(request)
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
      console.log(
        `middleware: Updating locale from URL param: ${langParam} (was ${currentLocale || 'not set'})`,
      )
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
    console.log(`middleware: No locale cookie found, setting default: ${DEFAULT_LOCALE}`)
    response.cookies.set({
      name: LOCALE_STORAGE_KEY,
      value: DEFAULT_LOCALE,
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      httpOnly: false,
      sameSite: 'lax',
    })
  }
  // Case 3: No lang param but has saved locale - do nothing (keep using saved)
  else {
    console.log(`middleware: Using existing locale cookie: ${currentLocale}`)
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
