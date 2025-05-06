'use client'

import React from 'react'
import { CMSLink } from '@/components/Link'
import { css } from '@/utilities/constants'
import { SocialMedia } from '@/components/Social'
import { Setting } from '@/payload-types'
import Image from 'next/image'
import { IoIosInformationCircleOutline, IoIosCheckmarkCircleOutline } from 'react-icons/io'
import { MdErrorOutline } from 'react-icons/md'
import { IoWarningOutline } from 'react-icons/io5'
import RichText from '@/components/RichText'
import { richText } from './sample-rich-text'

type ThemePreviewClientProps = {
  activeThemeName: string
  isPreview: boolean
  settings: Setting
}

export const ThemePreviewClient: React.FC<ThemePreviewClientProps> = ({
  activeThemeName,
  isPreview,
  settings,
}) => {
  return (
    <div className={css('page')}>
      <div className={css('page__container')}>
        <section className={css('section')}>
          <div className={css('section__container')}>
            <h1 className={css('h1')}>Theme Preview: {activeThemeName}</h1>
            <p className={css('p')}>
              {isPreview
                ? 'Preview Mode Active - Changes appear in real-time'
                : 'Static View - Refresh to see changes'}
            </p>
          </div>
        </section>

        {/* Typography Section */}
        <section className={css('section')}>
          <div className={css('section__container')}>
            <h2 className={css('h2')}>Typography</h2>
            <div className="grid gap-4"></div>
            <h1 className={`${css('h1')}`}>Heading 1</h1>
            <h2 className={`${css('h2')}`}>Heading 2</h2>
            <h3 className={`${css('h3')}`}>Heading 3</h3>
            <h4 className={`${css('h4')}`}>Heading 4</h4>
            <h5 className={`${css('h5')}`}>Heading 5</h5>
            <h6 className={`${css('h6')}`}>Heading 6</h6>
            <p className={`${css('p')}`}>
              This is a paragraph of text. This is how your standard paragraph text will look with
              the current theme. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>
            <p className={`${css('p-sm')}`}>
              Small This is a paragraph of text. This is how your standard paragraph text will look
              with the current theme. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed
              do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>
            <p className={`${css('p-md')}`}>
              Medium This is a paragraph of text. This is how your standard paragraph text will look
              with the current theme. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed
              do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>
            <p className={`${css('p-lg')}`}>
              Large This is a paragraph of text. This is how your standard paragraph text will look
              with the current theme. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed
              do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>
            <blockquote className={`${css('blockquote')}`}>
              This is a blockquote. Its often used to highlight important quotes or passages.
            </blockquote>
          </div>
        </section>

        <section className={css('section')}>
          <div className={css('section__container')}>
            <h6 className={css('h3')}>Rich Text</h6>
            <RichText
              enableGutter={false}
              enableProse={false}
              data={{
                root: {
                  type: 'root',
                  format: '',
                  indent: 0,
                  version: 1,
                  children: [
                    {
                      type: 'paragraph',
                      format: '',
                      indent: 0,
                      version: 1,
                      children: [
                        {
                          mode: 'normal',
                          text: 'Normal',
                          type: 'text',
                          style: '',
                          detail: 0,
                          format: 0,
                          version: 1,
                        },
                      ],
                      direction: 'ltr',
                      textStyle: '',
                      textFormat: 0,
                    },
                    {
                      tag: 'h2',
                      type: 'heading',
                      format: '',
                      indent: 0,
                      version: 1,
                      children: [
                        {
                          mode: 'normal',
                          text: 'Heading 2',
                          type: 'text',
                          style: '',
                          detail: 0,
                          format: 0,
                          version: 1,
                        },
                      ],
                      direction: 'ltr',
                    },
                    {
                      tag: 'h3',
                      type: 'heading',
                      format: '',
                      indent: 0,
                      version: 1,
                      children: [
                        {
                          mode: 'normal',
                          text: 'Heading 3',
                          type: 'text',
                          style: '',
                          detail: 0,
                          format: 0,
                          version: 1,
                        },
                      ],
                      direction: 'ltr',
                    },
                    {
                      tag: 'h4',
                      type: 'heading',
                      format: '',
                      indent: 0,
                      version: 1,
                      children: [
                        {
                          mode: 'normal',
                          text: 'Heading 4',
                          type: 'text',
                          style: '',
                          detail: 0,
                          format: 0,
                          version: 1,
                        },
                      ],
                      direction: 'ltr',
                    },
                    {
                      type: 'paragraph',
                      format: '',
                      indent: 0,
                      version: 1,
                      children: [
                        {
                          mode: 'normal',
                          text: 'Bold',
                          type: 'text',
                          style: '',
                          detail: 0,
                          format: 1,
                          version: 1,
                        },
                        {
                          type: 'linebreak',
                          version: 1,
                        },
                        {
                          mode: 'normal',
                          text: 'Italic',
                          type: 'text',
                          style: '',
                          detail: 0,
                          format: 2,
                          version: 1,
                        },
                        {
                          type: 'linebreak',
                          version: 1,
                        },
                        {
                          mode: 'normal',
                          text: 'Underline',
                          type: 'text',
                          style: '',
                          detail: 0,
                          format: 10,
                          version: 1,
                        },
                      ],
                      direction: 'ltr',
                      textStyle: '',
                      textFormat: 1,
                    },
                    {
                      type: 'paragraph',
                      format: '',
                      indent: 0,
                      version: 1,
                      children: [
                        {
                          id: '6818bd2253241f5677dc0a7a',
                          type: 'link',
                          fields: {
                            url: 'https://kien-fm.qa',
                            newTab: false,
                            linkType: 'custom',
                          },
                          format: '',
                          indent: 0,
                          version: 3,
                          children: [
                            {
                              mode: 'normal',
                              text: 'Link here',
                              type: 'text',
                              style: '',
                              detail: 0,
                              format: 0,
                              version: 1,
                            },
                          ],
                          direction: 'ltr',
                        },
                      ],
                      direction: 'ltr',
                      textStyle: '',
                      textFormat: 0,
                    },
                    {
                      type: 'paragraph',
                      format: '',
                      indent: 0,
                      version: 1,
                      children: [],
                      direction: 'ltr',
                      textStyle: '',
                      textFormat: 0,
                    },
                    {
                      type: 'paragraph',
                      format: '',
                      indent: 0,
                      version: 1,
                      children: [],
                      direction: 'ltr',
                      textStyle: '',
                      textFormat: 0,
                    },
                  ],
                  direction: 'ltr',
                },
              }}
            />
          </div>
        </section>

        {/* Colors Section */}
        <section className={css('section')}>
          <div className={css('section__container')}>
            <h2 className={css('h2')}>Colors</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div
                className={`h-24 shadow-[var(--shadow-sm)] rounded-[var(--radius-md)] overflow-hidden flex items-end p-2`}
                style={{
                  backgroundColor: 'var(--background)',
                  color: 'var(--foreground)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <span className="px-2 py-1 rounded">Background Page</span>
              </div>
              <div></div>
              <div></div>
              <div
                className={`h-24 rounded-[var(--radius-md)] overflow-hidden flex items-end p-2`}
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'var(--primary-foreground)',
                }}
              >
                <span className="px-2 py-1 rounded">Primary</span>
              </div>
              <div
                className={`h-24 shadow-[var(--shadow-lg)] rounded-[var(--radius-md)] overflow-hidden flex items-end p-2`}
                style={{
                  backgroundColor: 'var(--primary-light)',
                  color: 'var(--primary-light-foreground)',
                }}
              >
                <span className="px-2 py-1 rounded">Primary Light</span>
              </div>
              <div
                className={`h-24 shadow-[var(--shadow-sm)] rounded-[var(--radius-md)] overflow-hidden flex items-end p-2`}
                style={{
                  backgroundColor: 'var(--primary-dark)',
                  color: 'var(--primary-dark-foreground)',
                }}
              >
                <span className="px-2 py-1 rounded">Primary Dark</span>
              </div>
              <div
                className={`h-24 rounded-[var(--radius)] flex items-end p-2`}
                style={{
                  backgroundColor: 'var(--secondary)',
                  color: 'var(--secondary-foreground)',
                }}
              >
                <span className="px-2 py-1 rounded">Secondary</span>
              </div>
              <div
                className={`h-24 rounded-[var(--radius)] flex items-end p-2`}
                style={{
                  backgroundColor: 'var(--secondary-light)',
                  color: 'var(--secondary-light-foreground)',
                }}
              >
                <span className="px-2 py-1 rounded">Secondary Light</span>
              </div>
              <div
                className={`h-24 rounded-[var(--radius)] flex items-end p-2`}
                style={{
                  backgroundColor: 'var(--secondary-dark)',
                  color: 'var(--secondary-dark-foreground)',
                }}
              >
                <span className="px-2 py-1 rounded">Secondary Dark</span>
              </div>
              <div
                className={`h-24 rounded-[var(--radius)] flex items-end p-2`}
                style={{
                  backgroundColor: 'var(--base)',
                  color: 'var(--base-foreground)',
                }}
              >
                <span className="px-2 py-1 rounded">Base</span>
              </div>
              <div
                className={`h-24 rounded-[var(--radius)] flex items-end p-2`}
                style={{
                  backgroundColor: 'var(--base-light)',
                  color: 'var(--base-light-foreground)',
                }}
              >
                <span className="px-2 py-1 rounded">Base Light</span>
              </div>
              <div
                className={`h-24 rounded-[var(--radius)] flex items-end p-2`}
                style={{
                  backgroundColor: 'var(--base-dark)',
                  color: 'var(--base-dark-foreground)',
                }}
              >
                <span className="px-2 py-1 rounded">Base Dark</span>
              </div>
              <div
                className={`h-24 rounded-[var(--radius)] flex items-end p-2`}
                style={{
                  backgroundColor: 'var(--success)',
                  color: 'var(--success-foreground)',
                }}
              >
                <span className="px-2 py-1 rounded">Success</span>
              </div>
              <div
                className={`h-24 rounded-[var(--radius)] flex items-end p-2`}
                style={{
                  backgroundColor: 'var(--success-light)',
                  color: 'var(--success-light-foreground)',
                }}
              >
                <span className="px-2 py-1 rounded">Success Light</span>
              </div>
              <div
                className={`h-24 rounded-[var(--radius)] flex items-end p-2`}
                style={{
                  backgroundColor: 'var(--success-dark)',
                  color: 'var(--success-dark-foreground)',
                }}
              >
                <span className="px-2 py-1 rounded">Success Dark</span>
              </div>
              <div
                className={`h-24 rounded-[var(--radius)] flex items-end p-2`}
                style={{
                  backgroundColor: 'var(--warning)',
                  color: 'var(--warning-foreground)',
                }}
              >
                <span className="px-2 py-1 rounded">Warning</span>
              </div>
              <div
                className={`h-24 rounded-[var(--radius)] flex items-end p-2`}
                style={{
                  backgroundColor: 'var(--warning-light)',
                  color: 'var(--warning-light-foreground)',
                }}
              >
                <span className="px-2 py-1 rounded">Warning Light</span>
              </div>
              <div
                className={`h-24 rounded-[var(--radius)] flex items-end p-2`}
                style={{
                  backgroundColor: 'var(--warning-dark)',
                  color: 'var(--warning-dark-foreground)',
                }}
              >
                <span className="px-2 py-1 rounded">Warning Dark</span>
              </div>
              <div
                className={`h-24 rounded-[var(--radius)] flex items-end p-2`}
                style={{
                  backgroundColor: 'var(--info)',
                  color: 'var(--info-foreground)',
                }}
              >
                <span className="px-2 py-1 rounded">Info</span>
              </div>
              <div
                className={`h-24 rounded-[var(--radius)] flex items-end p-2`}
                style={{
                  backgroundColor: 'var(--info-light)',
                  color: 'var(--info-light-foreground)',
                }}
              >
                <span className="px-2 py-1 rounded">Info Light</span>
              </div>
              <div
                className={`h-24 rounded-[var(--radius)] flex items-end p-2`}
                style={{
                  backgroundColor: 'var(--info-dark)',
                  color: 'var(--info-dark-foreground)',
                }}
              >
                <span className="px-2 py-1 rounded">Info Dark</span>
              </div>
              <div
                className={`h-24 rounded-[var(--radius)] flex items-end p-2`}
                style={{
                  backgroundColor: 'var(--error)',
                  color: 'var(--error-foreground)',
                }}
              >
                <span className="px-2 py-1 rounded">Error</span>
              </div>
              <div
                className={`h-24 rounded-[var(--radius)] flex items-end p-2`}
                style={{
                  backgroundColor: 'var(--error-light)',
                  color: 'var(--error-light-foreground)',
                }}
              >
                <span className="px-2 py-1 rounded">Error Light</span>
              </div>
              <div
                className={`h-24 rounded-[var(--radius)] flex items-end p-2`}
                style={{
                  backgroundColor: 'var(--error-dark)',
                  color: 'var(--error-dark-foreground)',
                }}
              >
                <span className="px-2 py-1 rounded">Error Dark</span>
              </div>
            </div>
          </div>
        </section>

        <section className={css('section')}>
          <div className={css('section__container')}>
            <h2 className={css('h2')}>Shadows</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div
                className={`h-24 rounded-[var(--radius-md)] overflow-hidden flex items-end p-2`}
                style={{
                  backgroundColor: '#FFF',
                  color: 'var(--foreground)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <span className="px-2 py-1 rounded">Shadow small</span>
              </div>

              <div
                className={`h-24 rounded-[var(--radius-md)] overflow-hidden flex items-end p-2`}
                style={{
                  backgroundColor: '#FFF',
                  color: 'var(--foreground)',
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                <span className="px-2 py-1 rounded">Shadow medium</span>
              </div>

              <div
                className={`h-24 rounded-[var(--radius-md)] overflow-hidden flex items-end p-2`}
                style={{
                  backgroundColor: '#FFF',
                  color: 'var(--foreground)',
                  boxShadow: 'var(--shadow-lg)',
                }}
              >
                <span className="px-2 py-1 rounded">Shadow large</span>
              </div>

              <div
                className={`h-24 rounded-[var(--radius-md)] overflow-hidden flex items-end p-2`}
                style={{
                  backgroundColor: '#FFF',
                  color: 'var(--foreground)',
                  boxShadow: 'var(--shadow-xl)',
                }}
              >
                <span className="px-2 py-1 rounded">Shadow XL</span>
              </div>

              <div
                className={`h-24 rounded-[var(--radius-md)] overflow-hidden flex items-end p-2`}
                style={{
                  backgroundColor: '#FFF',
                  color: 'var(--foreground)',
                  boxShadow: 'var(--shadow-xxl)',
                }}
              >
                <span className="px-2 py-1 rounded">Shadow XXL</span>
              </div>
            </div>
          </div>
        </section>

        <section className={css('section')}>
          <div className={css('section__container')}>
            <h2 className={css('h2')}>UI Elements</h2>
            <h3 className={css('h3')}>Buttons</h3>
            <div className="flex flex-wrap gap-2 mb-6">
              <button className={`${css('btn')}`}>Default Button</button>
              <button className={`${css('btn-primary')}`}>Primary Button</button>
              <button className={`${css('btn-secondary')}`}>Secondary Button</button>
              <button className={`${css('btn-outline')}`}>Outline Button</button>
              <button className={`${css('btn')} ${css('btn-lg')}`}>Large Button</button>
              <button className={`${css('btn')} ${css('btn-sm')}`}>Small Button</button>
              <button disabled className={`${css('btn')} ${css('btn-disabled')}`}>
                Disabled Button
              </button>
            </div>

            <h3 className={css('h3')}>Links</h3>
            <CMSLink href="#" label="Default Link" className={css('link')} />
            <CMSLink href="#" label="Primary Link" className={css('link-primary')} />
            <CMSLink href="#" label="Secondary Link" className={css('link-secondary')} />

            <h3 className={css('h3')}>Form Elements</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className={css('form-group')}>
                <label className={`${css('label')}`}>Text Input</label>
                <input type="text" placeholder="Text input" className={`${css('input')}`} />
              </div>

              <div className={css('form-group')}>
                <label className={`${css('label')}`}>Text Area</label>
                <textarea placeholder="Text area" className={`${css('textarea')}`}></textarea>
              </div>

              <div className={css('form-group')}>
                <label className={`${css('label')}`}>Select</label>
                <select className={`${css('input-select')}`}>
                  <option>Option 1</option>
                  <option>Option 2</option>
                </select>
              </div>

              <div className={css('form-group')}>
                <label className={`${css('label')}`}>Checkbox</label>
                <div>
                  <input type="checkbox" id="cb1" className={`${css('input-checkbox')}`} />
                  <label htmlFor="cb1" className="ml-2">
                    Checkbox option
                  </label>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Layout Components */}
        <section className={css('section')}>
          <div className={css('section__container')}>
            <h2 className={css('h2')}>Layout Components</h2>

            <h3 className={css('h3')}>Radius</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className={`rounded-[var(--radius)] bg-[var(--info-light)] w-24 h-24`}></div>
              <div className={`rounded-[var(--radius-sm)] bg-[var(--info-light)] w-24 h-24`}></div>
              <div className={`rounded-[var(--radius-md)] bg-[var(--info-light)] w-24 h-24`}></div>
              <div className={`rounded-[var(--radius-lg)] bg-[var(--info-light)] w-24 h-24`}></div>
              <div
                className={`rounded-[var(--radius-full)] bg-[var(--info-light)] w-24 h-24`}
              ></div>
            </div>

            <h3 className={css('h3')}>Cards</h3>
            <div className="flex flex-row flex-wrap gap-8">
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
                  <CMSLink className={`${css('btn-secondary')} ${css('btn-sm')} max-w-52`} href="#">
                    Go somewhere
                  </CMSLink>
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
                  <CMSLink className={`${css('btn-primary')} ${css('btn-sm')} max-w-52`} href="#">
                    Go somewhere
                  </CMSLink>
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
            </div>

            <h3 className="text-xl font-semibold mt-6 mb-3">Alert Messages</h3>
            <div className="space-y-2 mb-6">
              <div className={`${css('alert')} ${css('alert-info')}`}>
                <IoIosInformationCircleOutline />
                <p>This is an information alert</p>
              </div>
              <div className={`${css('alert')} ${css('alert-success')}`}>
                <IoIosCheckmarkCircleOutline />
                <p>This is a success alert</p>
              </div>
              <div className={`${css('alert')} ${css('alert-warning')}`}>
                <IoWarningOutline />
                <p>This is a warning alert</p>
              </div>
              <div className={`${css('alert')} ${css('alert-error')}`}>
                <MdErrorOutline />
                <p>This is a error alert</p>
              </div>
            </div>
          </div>
        </section>

        <section className={css('section')}>
          <div className={css('section__container')}>
            <h2 className={css('h2')}>Social Media Icons Header</h2>
            <SocialMedia
              socialMedia={settings?.socialMedia}
              classNameContainer={css('header__drawer-footer__social')}
              classNameItem={css('header__drawer-footer__social-item')}
            />
          </div>
        </section>

        <section className={`${css('section')} ${css('footer')} mb-8`}>
          <div className={css('footer__container')}>
            <h2 className={css('h2')}>Social Media Icons Footer</h2>
            <SocialMedia
              fullWidth
              socialMedia={settings?.socialMedia}
              classNameContainer={css('footer__social')}
              classNameItem={css('footer__social-item')}
            />
          </div>
        </section>
      </div>
    </div>
  )
}
