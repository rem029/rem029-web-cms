'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { TypedLocale } from 'payload'
import React from 'react'

import { touchTarget } from './chip'

const LANGUAGES: { locale: TypedLocale; label: string; name: string }[] = [
  { locale: 'en', label: 'EN', name: 'English' },
  { locale: 'ar', label: 'AR', name: 'العربية' },
]

/**
 * The menu header's EN / AR switch: like the site's `LocaleSwitch` (`?lang=`, which the
 * middleware stores in the locale cookie, then a refresh), styled with the theme tokens so it
 * shows on the menu's own header, phones included. The current language is marked.
 */
export const LanguageSwitch: React.FC<{ locale?: TypedLocale }> = ({ locale }) => {
  const router = useRouter()
  const pathname = usePathname()

  const switchTo = (next: TypedLocale, event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    router.push(`${pathname}?lang=${next}`)
    router.refresh()
  }

  return (
    <nav className="flex shrink-0 items-center gap-1 text-sm" aria-label="Language">
      {LANGUAGES.map((language) => (
        <Link
          key={language.locale}
          href={`?lang=${language.locale}`}
          hrefLang={language.locale}
          lang={language.locale}
          title={language.name}
          aria-current={language.locale === locale ? 'true' : undefined}
          onClick={(event) => switchTo(language.locale, event)}
          className={`${touchTarget} [@media(pointer:coarse)]:min-w-11 inline-flex items-center justify-center rounded px-2 py-1 font-medium text-menu-muted hover:text-menu-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-menu-primary aria-[current=true]:bg-menu-primary aria-[current=true]:text-menu-primary-text`}
        >
          {language.label}
        </Link>
      ))}
    </nav>
  )
}
