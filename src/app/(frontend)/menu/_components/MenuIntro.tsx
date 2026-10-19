import React from 'react'

export type MenuIntroProps = {
  heading?: string | null
  subheading?: string | null
  title: string
}

export const MenuIntro: React.FC<MenuIntroProps> = ({ heading, subheading, title }) => (
  <div className="menu-intro">
    {/* without an intro heading the page still gets an h1 (the menu title, screen readers only) */}
    <h1 className={heading ? 'menu-title text-3xl font-semibold' : 'menu-title sr-only'}>
      {heading || title}
    </h1>
    {subheading && <p className="menu-sub-header mt-1 text-menu-muted">{subheading}</p>}
  </div>
)
