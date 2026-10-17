'use client'

import React from 'react'

export type MenuCarouselProps = {
  images: { url: string; alt: string }[]
}

/**
 * The menu's carousel images under the header (Menus → Carousel). Swiper, already a dependency
 * of the Carousel block (whose component is tied to its block fields, so not reused): one image
 * per slide, pagination dots, autoplay off under reduced motion, `dir` from the page for RTL.
 * One image → a plain image, none → nothing.
 */
export const MenuCarousel: React.FC<MenuCarouselProps> = (props) => {
  // 1. images empty → null; one → a single <img>
  // 2. <Swiper modules={[Pagination, Autoplay]} pagination loop autoplay (unless
  //    prefers-reduced-motion)> a slide per image, aspect-[16/7] object-cover
  void props
  return null
}
