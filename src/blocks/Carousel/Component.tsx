'use client'

import { Swiper, SwiperRef, SwiperSlide } from 'swiper/react'
import { Pagination, Navigation, Autoplay } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/navigation'
import 'swiper/css/autoplay'

import React, { JSX, useMemo, useRef, useState } from 'react'
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import { CarouselBlock as CarouselBlockType } from '@/payload-types'
import { css } from '@/utilities/constants'

import { AutoplayOptions, SwiperOptions } from 'swiper/types'
import { getStyles } from '@/fields/css'
import { CardInlineImageBlock } from '../CardInlineImage/Component'
import { CardRowBlock } from '../CardRow/Component'
import { CardWithBackgroundBlock } from '../CardWithBackground/Component'

export type CarouselBlockProps = CarouselBlockType

export const CarouselBlock = ({ main, styles }: CarouselBlockProps) => {
  const [showNavigation, setShowNavigation] = useState<boolean>(false)
  const swiperRef = useRef<SwiperRef>(null)

  const { carouselSettings, layout, slides } = main!
  const { cssName, cssStyle } = getStyles({ ...styles })

  const onClickNext = () => swiperRef.current && swiperRef.current?.swiper.slideNext()
  const onClickPrev = () => swiperRef.current && swiperRef.current?.swiper.slidePrev()

  const baseSlidesPerView = useMemo(() => {
    return carouselSettings?.slidesPerView || 1
  }, [carouselSettings?.slidesPerView])

  const swiperBreakpoints: SwiperOptions['breakpoints'] = useMemo(() => {
    const maxSlides = Math.max(1, baseSlidesPerView)
    const defaultBreakSettings = {
      slidesPerView: 1,
      spaceBetween: 4,
    }

    if (layout === 'card-row') {
      return {
        0: defaultBreakSettings,
        425: defaultBreakSettings,
        '640': defaultBreakSettings,
        768: {
          slidesPerView: 1.5,
        },
        1024: {
          slidesPerView: maxSlides,
          spaceBetween: 8,
        },
      }
    }

    return {
      0: {
        slidesPerView: 1.5,
        spaceBetween: 4,
      },
      425: {
        slidesPerView: 1.5,
        spaceBetween: 1,
      },
      640: {
        slidesPerView: Math.min(2, maxSlides),
        spaceBetween: 4,
      },
      768: {
        slidesPerView: Math.min(3, maxSlides),
        spaceBetween: 8,
      },
      1024: {
        slidesPerView: maxSlides,
        spaceBetween: 8,
      },
    }
  }, [layout, baseSlidesPerView])

  const swiperAutoPlay: AutoplayOptions | undefined = useMemo(() => {
    return carouselSettings?.autoplay === true
      ? ({ delay: 3000, pauseOnMouseEnter: true } as AutoplayOptions)
      : undefined
  }, [carouselSettings?.autoplay])

  if (!layout || !slides) return null

  return (
    <React.Fragment>
      {cssStyle && (
        <style
          dangerouslySetInnerHTML={{
            __html: cssStyle || '',
          }}
        />
      )}

      <div
        onMouseEnter={() => setShowNavigation(true)}
        onMouseLeave={() => setShowNavigation(false)}
        // className={`aspect-video w-full bg-ui-bg-subtle relative min-h-56 ${
        //   block?.variant !== "cards" ? "max-h-[1080px] " : "max-h-[480px]"
        // }`}
        className={`${css('hero__carousel')} ${cssName}`}
      >
        <div
          className={`pointer-events-none absolute top-0 left-0 w-full h-full z-99 transition-shadow ${
            showNavigation ? 'shadow-inner' : ''
          }`}
        />

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
        <div className={css('hero__carousel-navigation')}></div>
        <Swiper
          style={{ width: '100%', height: '100%' }}
          ref={swiperRef}
          autoplay={swiperAutoPlay}
          slidesPerView={baseSlidesPerView}
          spaceBetween={4}
          centeredSlides={carouselSettings?.centeredSlides === true || false}
          loop={carouselSettings?.loop === true || false}
          pagination={{
            clickable: true,
          }}
          breakpoints={swiperBreakpoints}
          modules={[Pagination, Navigation, Autoplay]}
        >
          {slides.map((slide, idx) => {
            let component: JSX.Element | null = null
            const slideId = slide.id || `hero-slide-${idx}`

            switch (layout) {
              case 'card-inline-image':
                component = (
                  <CardInlineImageBlock blockType="card-inline-image" main={{ ...slide }} />
                )
                break
              case 'card-row':
                component = <CardRowBlock blockType="card-row" main={{ ...slide }} />
                break
              case 'card-with-background':
                component = (
                  <CardWithBackgroundBlock blockType="card-with-background" main={{ ...slide }} />
                )
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
    </React.Fragment>
  )
}
