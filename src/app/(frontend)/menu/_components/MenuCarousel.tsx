'use client'

import React, { useEffect, useRef } from 'react'
import { Autoplay, Pagination } from 'swiper/modules'
import { Swiper, SwiperSlide, type SwiperRef } from 'swiper/react'
import 'swiper/css'
import 'swiper/css/pagination'

export type CarouselImage = {
  url: string
  /** the resized copies (`<url> <width>w, …`), so phones don't load the 1400px image */
  srcSet?: string
  alt: string
}

export type MenuCarouselProps = {
  images: CarouselImage[]
}

// slides are as wide as the page
const SIZES = '100vw'

const IMAGE_CLASS = 'menu-carousel-image aspect-[16/7] max-h-80 w-full object-cover'
const AUTOPLAY_DELAY = 5000

/**
 * The menu's carousel images under the header (Menus → Carousel). Swiper, already a dependency
 * of the Carousel block (whose component is tied to its block fields, so not reused): one image
 * per slide, pagination dots, autoplay off under reduced motion, RTL from the page's direction
 * (Swiper reads the computed `direction`). One image → a plain image, none → nothing.
 */
export const MenuCarousel: React.FC<MenuCarouselProps> = ({ images }) => {
  const swiperRef = useRef<SwiperRef>(null)

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      swiperRef.current?.swiper.autoplay?.stop()
    }
  }, [])

  if (images.length === 0) return null
  if (images.length === 1) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- a CMS upload of any size
      <img
        src={images[0]!.url}
        srcSet={images[0]!.srcSet}
        sizes={SIZES}
        alt={images[0]!.alt}
        fetchPriority="high"
        className={`menu-carousel ${IMAGE_CLASS}`}
      />
    )
  }

  return (
    <Swiper
      ref={swiperRef}
      modules={[Pagination, Autoplay]}
      pagination={{ clickable: true }}
      autoplay={{ delay: AUTOPLAY_DELAY, disableOnInteraction: true }}
      loop
      className="menu-carousel w-full"
    >
      {images.map((image, index) => (
        <SwiperSlide key={`${image.url}-${index}`} className="menu-carousel-slide">
          {/* eslint-disable-next-line @next/next/no-img-element -- a CMS upload of any size */}
          <img
            src={image.url}
            srcSet={image.srcSet}
            sizes={SIZES}
            alt={image.alt}
            loading={index === 0 ? 'eager' : 'lazy'}
            fetchPriority={index === 0 ? 'high' : undefined}
            className={IMAGE_CLASS}
          />
        </SwiperSlide>
      ))}
    </Swiper>
  )
}
