'use client'

import React from 'react'
import { CMSLink } from '@/components/Link'
import { css } from '@/utilities/constants'

type ThemePreviewClientProps = {
  activeThemeName: string
  isPreview: boolean
}

export const ThemePreviewClient: React.FC<ThemePreviewClientProps> = ({
  activeThemeName,
  isPreview,
}) => {
  return (
    <div className={css('page')}>
      <div className={css('page__container')}>
        <section className={css('section')}>
          <h1 className={css('h1')}>Theme Preview: {activeThemeName}</h1>
          <p className={css('p')}>
            {isPreview
              ? 'Preview Mode Active - Changes appear in real-time'
              : 'Static View - Refresh to see changes'}
          </p>
        </section>

        {/* Typography Section */}
        <section className={css('section')}>
          <h2 className={css('h2')}>Typography</h2>
          <div className="grid gap-4">
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
            <blockquote className={`${css('blockquote')}`}>
              This is a blockquote. It's often used to highlight important quotes or passages.
            </blockquote>
          </div>
        </section>

        {/* Colors Section */}
        <section className={css('section')}>
          <h2 className={css('h2')}>Colors</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`${css('color-primary')} h-24 rounded flex items-end p-2`}>
              <span className="bg-white/80 px-2 py-1 rounded">Primary</span>
            </div>
            <div className={`${css('color-secondary')} h-24 rounded flex items-end p-2`}>
              <span className="bg-white/80 px-2 py-1 rounded">Secondary</span>
            </div>
            <div className={`${css('color-accent')} h-24 rounded flex items-end p-2`}>
              <span className="bg-white/80 px-2 py-1 rounded">Accent</span>
            </div>
            <div className={`${css('color-background')} h-24 rounded flex items-end p-2 border`}>
              <span className="bg-white/80 px-2 py-1 rounded">Background</span>
            </div>
          </div>
        </section>

        <section className={css('section')}>
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
          <section className={css('section')}>
            <CMSLink href="#" label="Default Link" />
            <CMSLink href="#" label="Primary Link" className={css('link-primary')} />
            <CMSLink href="#" label="Secondary Link" className={css('link-secondary')} />
            <CMSLink href="#" label="Visited Link" className={css('link-visited')} />
          </section>

          <h3 className={css('h3')}>Form Elements</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className={`${css('label')} block mb-1`}>Text Input</label>
              <input type="text" placeholder="Text input" className={`${css('input')}`} />
            </div>
            <div>
              <label className={`${css('label')} block mb-1`}>Text Area</label>
              <textarea placeholder="Text area" className={`${css('textarea')}`}></textarea>
            </div>
            <div>
              <label className={`${css('label')} block mb-1`}>Select</label>
              <select className={`${css('select')}`}>
                <option>Option 1</option>
                <option>Option 2</option>
              </select>
            </div>
            <div>
              <label className={`${css('label')} block mb-1`}>Checkbox</label>
              <div>
                <input type="checkbox" id="cb1" className={`${css('checkbox')}`} />
                <label htmlFor="cb1" className="ml-2">
                  Checkbox option
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* Layout Components */}
        <section className="mb-12 p-6 bg-white rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-4">Layout Components</h2>

          <h3 className="text-xl font-semibold mt-6 mb-3">Cards</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className={`${css('card')}`}>
              <div className={`${css('card-header')}`}>Card Header</div>
              <div className={`${css('card-body')}`}>
                <h5 className={`${css('card-title')}`}>Card Title</h5>
                <p className={`${css('card-text')}`}>
                  Some quick example text to build on the card title.
                </p>
                <button className={`${css('btn')}`}>Go somewhere</button>
              </div>
              <div className={`${css('card-footer')}`}>Card Footer</div>
            </div>

            <div className={`${css('card')}`}>
              <div
                className={`${css('card-img-top')} h-40 bg-gray-200 flex items-center justify-center`}
              >
                Image
              </div>
              <div className={`${css('card-body')}`}>
                <h5 className={`${css('card-title')}`}>Card with Image</h5>
                <p className={`${css('card-text')}`}>This card has an image at the top.</p>
              </div>
            </div>

            <div className={`${css('card')} ${css('card-horizontal')}`}>
              <div className="flex">
                <div
                  className={`${css('card-img')} w-1/3 bg-gray-200 flex items-center justify-center`}
                >
                  Img
                </div>
                <div className={`${css('card-body')} w-2/3`}>
                  <h5 className={`${css('card-title')}`}>Horizontal Card</h5>
                  <p className={`${css('card-text')}`}>This is a horizontal card layout.</p>
                </div>
              </div>
            </div>
          </div>

          <h3 className="text-xl font-semibold mt-6 mb-3">Alert Messages</h3>
          <div className="space-y-2 mb-6">
            <div className={`${css('alert')} ${css('alert-info')}`}>
              This is an information alert
            </div>
            <div className={`${css('alert')} ${css('alert-success')}`}>This is a success alert</div>
            <div className={`${css('alert')} ${css('alert-warning')}`}>This is a warning alert</div>
            <div className={`${css('alert')} ${css('alert-danger')}`}>This is a danger alert</div>
          </div>
        </section>
      </div>
    </div>
  )
}
