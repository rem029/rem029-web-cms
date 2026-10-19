import Link from 'next/link'
import React from 'react'

import { readMenuLocale } from './_data/locale'
import { menuStrings } from './_i18n'

/**
 * 404 inside the menu pages (unknown slug, another tenant's slug, a draft outside preview),
 * without the site header: a short message in the visitor's locale and a link back to `/menu`.
 */
export default async function MenuNotFound() {
  const t = menuStrings(await readMenuLocale())

  return (
    <main className="menu-not-found menu-theme min-h-dvh py-24 text-center">
      <div className="container">
        <h1 className="menu-not-found-title text-4xl font-semibold">404</h1>
        <p className="menu-not-found-text mt-2 text-menu-muted">{t.menuNotFound}</p>
        <Link
          href="/menu"
          className="menu-not-found-link mt-6 inline-block rounded bg-menu-primary px-4 py-2 text-menu-primary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-menu-primary"
        >
          {t.allMenus}
        </Link>
      </div>
    </main>
  )
}
