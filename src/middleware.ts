import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { LOCALE_STORAGE_KEY, DEFAULT_LOCALE } from './utilities/constant'

export function middleware(request: NextRequest) {
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
  matcher: ['/((?!api|admin|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'],
}
