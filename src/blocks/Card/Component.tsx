import { css } from '@/utilities/constants'
import React from 'react'
import { LinkBlock } from '../Link/Component'
import Image from 'next/image'

export const CardBlock = () => {
  return (
    <React.Fragment>
      <div className={`${css('card')} ${css('card-img-bg')}`}>
        <div className={css('card-img')}>
          <Image
            alt="sample image"
            src={
              'https://images.pexels.com/photos/31887348/pexels-photo-31887348/free-photo-of-elegant-spring-white-flowers-in-bloom.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
            }
            fill
          />
        </div>
        <div className={css('card-overlay')} />
        <div className={`${css('card-header')}`}>
          <h6>Card Header</h6>
        </div>
        <div className={`${css('card-body')} ${css('card-body-end')}`}>
          <h5 className={`${css('card-title')}`}>Card Image with Content Overlay</h5>
          <p className={`${css('card-text')}`}>
            Some quick example text to build on the card title.
          </p>
        </div>
        <div className={`${css('card-footer')}`}>
          <LinkBlock
            blockType="link"
            main={{ variant: 'btn-secondary', href: '#', text: 'Go somewhere', new_tab: true }}
          />
        </div>
      </div>

      <div className={`${css('card')} ${css('card-img-inline')}`}>
        <div className={`${css('card-header')}`}>
          <h6>Card Header</h6>
        </div>
        <div className={css('card-img')}>
          <Image
            alt="sample image"
            src={
              'https://images.pexels.com/photos/31887348/pexels-photo-31887348/free-photo-of-elegant-spring-white-flowers-in-bloom.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
            }
            fill
          />
        </div>
        <div className={`${css('card-body')}`}>
          <h5 className={`${css('card-title')}`}>Card with Image on top</h5>
          <p className={`${css('card-text')}`}>
            Some quick example text to build on the card title.
          </p>
        </div>
        <div className={`${css('card-footer')}`}>
          <LinkBlock
            blockType="link"
            main={{ variant: 'btn-primary', href: '#', text: 'Go somewhere', new_tab: true }}
          />
        </div>
      </div>

      <div className={`${css('card')} ${css('card-row')}`}>
        <div className={css('card-img')}>
          <Image
            alt="sample image"
            src={
              'https://images.pexels.com/photos/31887348/pexels-photo-31887348/free-photo-of-elegant-spring-white-flowers-in-bloom.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
            }
            fill
          />
        </div>
        <div className={`${css('card-body')} ${css('card-body-center')}`}>
          <h5 className={`${css('card-title')}`}>Horizontal Card</h5>
          <p className={`${css('card-text')}`}>This is a horizontal card layout.</p>
        </div>
      </div>
    </React.Fragment>
  )
}
