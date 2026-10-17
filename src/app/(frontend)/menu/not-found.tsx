import React from 'react'

/**
 * 404 inside the menu pages (unknown slug, another tenant's slug, a draft outside preview),
 * without the site header: a short message in the visitor's locale and a link back to `/menu`.
 */
export default async function MenuNotFound() {
  // 1. locale from the cookie; t = menuStrings(locale)
  // 2. <main className="container py-24 text-center"><h1>404</h1><p>{t.menuNotFound}</p>
  //    <Link href="/menu">{t.allMenus}</Link></main>
  return <div />
}
