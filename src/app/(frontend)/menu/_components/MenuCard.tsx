import Link from 'next/link'
import React from 'react'

import type { Media, Menu } from '@/payload-types'

export type MenuCardProps = {
  menu: Pick<Menu, 'title' | 'slug' | 'intro' | 'header' | 'carousel'>
}

/**
 * One menu on the `/menu` list: its first carousel image (or the header logo), title and intro
 * heading, the whole card one link to `/menu/<slug>`. Theme classes only (bg-card,
 * text-card-foreground, border-border), logical spacing (ps/pe, text-start) for RTL. Server
 * component.
 */
export const MenuCard: React.FC<MenuCardProps> = ({ menu }) => {
  // 1. image = first carousel image if populated, else header.logo if populated (imageOf below)
  // 2. <Link href={`/menu/${menu.slug}`} className="block rounded border bg-card … focus-visible:ring">
  //      {image && <img src alt="" loading="lazy" className="aspect-video w-full object-cover" />}
  //      <div className="p-4 text-start"><h2>{menu.title}</h2>
  //        {menu.intro?.heading && <p className="text-muted-foreground">{heading}</p>}</div>
  //    </Link>
  void menu
  void Link
  void imageOf
  return <div />
}

// a populated upload, else nothing (depth 1 populates them; an id alone has no url)
const imageOf = (value: number | Media | null | undefined): Media | null =>
  value && typeof value === 'object' ? value : null
