import React from 'react'

/**
 * The menu pages' own frame (rem0017 phase 3): outside the `(site)` group, so no site Header or
 * Footer. Each page renders its MenuHeader (the menu's title and logo differ per page); the
 * MenuFooter is the same on `/menu` and `/menu/<slug>`, so it lives here.
 */
export default async function MenuLayout({ children }: { children: React.ReactNode }) {
  // 1. locale from the cookie; tenantId = await getFrontendTenantId()
  // 2. settings = await getTenantDoc('settings', tenantId, { depth: 1, locale })
  // 3. <div className="flex min-h-dvh flex-col bg-background text-foreground">
  //      <div className="flex-1">{children}</div><MenuFooter settings={settings} locale={locale} />
  //    </div>
  return <>{children}</>
}
