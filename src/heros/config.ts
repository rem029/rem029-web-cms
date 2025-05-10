import type { Field } from 'payload'

import {
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { cardsFields } from '@/fields/cards'
import { CSSNameWithCustomFiled } from '@/fields/css'

export const hero: Field = {
  name: 'hero',
  type: 'group',
  interfaceName: 'Hero',
  label: 'Hero Section Configuration',
  admin: {
    description: 'Configure the hero section for this page, including carousel options.',
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          name: 'main',
          label: 'Content',
          fields: [
            {
              name: 'type',
              type: 'select',
              defaultValue: 'none',
              label: 'Type',
              options: [
                {
                  label: 'None',
                  value: 'none',
                },
                {
                  label: 'Carousel',
                  value: 'carousel',
                },
              ],
              required: true,
            },
            {
              type: 'group',
              name: 'settings',
              label: 'Settings',
              interfaceName: 'CarouselSettings',
              admin: {
                description: 'Choose slide should be displayed.',
                condition: (_, siblingData) => siblingData?.type === 'carousel',
              },
              fields: [
                {
                  name: 'carouselSettings',
                  label: 'Carousel Settings',
                  type: 'group',
                  admin: {
                    condition: (_, siblingData) => (siblingData?.slides?.length || 0) > 0,
                    description: 'Customize the behavior of the carousel.',
                  },
                  fields: [
                    // {
                    //   name: 'slidesPerView',
                    //   label: 'Slides per view',
                    //   type: 'number',
                    //   defaultValue: 1,
                    // },
                    // {
                    //   name: 'centeredSlides',
                    //   label: 'Center Slides',
                    //   type: 'checkbox',
                    //   defaultValue: false,
                    // },
                    {
                      name: 'autoplay',
                      label: 'Autoplay',
                      type: 'checkbox',
                      defaultValue: false,
                    },
                    {
                      name: 'loop',
                      label: 'Loop Slides',
                      type: 'checkbox',
                      defaultValue: true,
                    },
                    // {
                    //   name: 'showArrows',
                    //   label: 'Show Navigation Arrows',
                    //   type: 'checkbox',
                    //   defaultValue: true,
                    // },
                    // {
                    //   name: 'showDots',
                    //   label: 'Show Navigation Dots',
                    //   type: 'checkbox',
                    //   defaultValue: true,
                    // },
                    {
                      name: 'className',
                      label: 'Class Name',
                      type: 'text',
                      admin: {
                        description: 'Add a custom class name to the carousel.',
                      },
                    },
                  ],
                },
                {
                  name: 'layout',
                  label: 'Slide Layout',
                  type: 'select',
                  defaultValue: 'feature',
                  options: [{ label: 'Full Screen/Feature', value: 'feature' }],
                  admin: {
                    description: 'Choose slide should be displayed.',
                  },
                },
                {
                  name: 'slides',
                  label: 'Slides',
                  type: 'array',
                  minRows: 0,
                  interfaceName: 'HeroSlide',
                  admin: {
                    // components: {
                    //   RowLabel: ({ data, index }: { data: any; index: number }) => {
                    //     return data?.title || `Slide ${index + 1}`
                    //   },
                    // },
                    description: 'Add and configure individual slides for the carousel.',
                  },
                  fields: cardsFields,
                },
              ],
            },
            //to be removed start
            {
              name: 'richText',
              type: 'richText',
              hidden: true,
              editor: lexicalEditor({
                features: ({ rootFeatures }) => {
                  return [
                    ...rootFeatures,
                    HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
                    FixedToolbarFeature(),
                    InlineToolbarFeature(),
                  ]
                },
              }),
              label: false,
            },
            {
              name: 'media',
              type: 'upload',
              hidden: true,
              admin: {
                condition: (_, { type } = {}) => ['highImpact', 'mediumImpact'].includes(type),
              },
              relationTo: 'media',
              required: true,
            },
            //to be removed end
          ],
        },
        { name: 'styles', fields: CSSNameWithCustomFiled },
      ],
    },
  ],
}
