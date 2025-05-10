'use client'

import { Swiper, SwiperRef, SwiperSlide } from 'swiper/react'
import { Pagination, Navigation, Autoplay } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/navigation'
import 'swiper/css/autoplay'

import { JSX, useMemo, useRef, useState } from 'react'
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import { CarouselSettings } from '@/payload-types'
import { css } from '@/utilities/constants'
import { Feature } from '../Feature'
import { AutoplayOptions } from 'swiper/types'

export const CarouselHero = ({ carouselSettings, layout, slides }: CarouselSettings) => {
  const [showNavigation, setShowNavigation] = useState<boolean>(false)
  const swiperRef = useRef<SwiperRef>(null)

  const className = carouselSettings?.className || ''
  const onClickNext = () => swiperRef.current && swiperRef.current?.swiper.slideNext()
  const onClickPrev = () => swiperRef.current && swiperRef.current?.swiper.slidePrev()

  const swiperAutoPlay: AutoplayOptions | undefined = useMemo(() => {
    return carouselSettings?.autoplay === true
      ? ({ delay: 3000, pauseOnMouseEnter: true } as AutoplayOptions)
      : undefined
  }, [carouselSettings?.autoplay])

  if (!layout || !slides) return null

  return (
    <div
      onMouseEnter={() => setShowNavigation(true)}
      onMouseLeave={() => setShowNavigation(false)}
      className={`${css('hero__carousel')} ${className}`}
    >
      {layout !== 'feature' && (
        <div
          className={`pointer-events-none absolute top-0 left-0 w-full h-full z-99 transition-shadow ${
            showNavigation ? 'shadow-inner' : ''
          }`}
        />
      )}

      <button
        className={`absolute left-1 top-[50%] z-[31] translate-y-[50%] transition-opacity ${
          showNavigation ? 'opacity-100 translate-x-0' : 'opacity-0'
        }`}
        onClick={onClickPrev}
      >
        <FaChevronLeft className="text-lg text-secondary" />
      </button>
      <button
        className={`absolute right-1 top-[50%] z-50 translate-y-[50%] opacity-0 transition-opacity ${
          showNavigation ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClickNext}
      >
        <FaChevronRight className="text-lg text-secondary" />
      </button>

      <Swiper
        style={{ width: '100%', height: '100%' }}
        ref={swiperRef}
        autoplay={swiperAutoPlay}
        spaceBetween={16}
        loop={carouselSettings?.loop === true || false}
        pagination={{
          clickable: true,
        }}
        modules={[Pagination, Navigation, Autoplay]}
      >
        {slides.map((slide, idx) => {
          let component: JSX.Element | null = null
          const slideId = slide.id || `hero-slide-${idx}`

          switch (layout) {
            case 'feature':
              component = <Feature {...slide} />
              break
          }
          return (
            <SwiperSlide key={slideId} className={`${css('hero__carousel-slide')}`}>
              {component}
            </SwiperSlide>
          )
        })}
      </Swiper>
    </div>
  )
}
