import { cookies } from 'next/headers'
import type { TypedLocale } from 'payload'

import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, SUPPORTED_LOCALES } from '@/utilities/constant'

const isLocale = (value: unknown): value is TypedLocale =>
  typeof value === 'string' && SUPPORTED_LOCALES.includes(value)

/** A locale we serve, else the default: for anything a visitor sends (cookie, action args). */
export const toLocale = (value: unknown): TypedLocale => (isLocale(value) ? value : DEFAULT_LOCALE)

/** The visitor's locale, from the cookie the middleware sets (`?lang=`), as the site pages read it. */
export const readMenuLocale = async (): Promise<TypedLocale> =>
  toLocale((await cookies()).get(LOCALE_STORAGE_KEY)?.value)
