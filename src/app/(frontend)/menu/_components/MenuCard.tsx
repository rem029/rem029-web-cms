import Link from 'next/link'
import React from 'react'

import type { Menu } from '@/payload-types'

import { mediaOf } from '../_data/media'

export type MenuCardProps = {
  menu: Pick<Menu, 'title' | 'slug' | 'intro' | 'header' | 'carousel'>
}

/**
 * One menu on the `/menu` list: its first carousel image (or the header logo), title and intro
 * heading, the whole card one link to `/menu/<slug>`. Theme classes only, logical spacing for
 * RTL. Server component.
 */
export const MenuCard: React.FC<MenuCardProps> = ({ menu }) => {
  const image = mediaOf(menu.carousel?.[0]?.image) ?? mediaOf(menu.header?.logo)
  const src = image?.sizes?.small?.url ?? image?.url

  return (
    <Link
      href={`/menu/${menu.slug}`}
      className="menu-card block overflow-hidden rounded border border-menu-border bg-menu-card text-menu-text no-underline transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-menu-primary motion-reduce:transition-none"
    >
      {src && (
        // eslint-disable-next-line @next/next/no-img-element -- a CMS upload of any size
        <img
          src={src}
          alt=""
          loading="lazy"
          className="menu-card-image aspect-video w-full object-cover"
        />
      )}
      <div className="p-4 text-start">
        <h2 className="menu-card-title text-xl font-semibold">{menu.title}</h2>
        {menu.intro?.heading && (
          <p className="menu-card-subtitle mt-1 text-menu-muted">{menu.intro.heading}</p>
        )}
      </div>
    </Link>
  )
}
