import { cardsFields } from '@/fields/cards'
import { CSSNameWithCustomFiled } from '@/fields/css'
import type { Block } from 'payload'

export const CarouselBlock: Block = {
  slug: 'carousel-block',
  interfaceName: 'CarouselBlock',
  dbName: 'carousel',
  labels: {
    singular: 'Carousel',
    plural: 'Carousels',
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          name: 'main',
          label: 'Main',
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
                {
                  name: 'slidesPerView',
                  label: 'Slides per view',
                  type: 'number',
                  defaultValue: 3,
                },
                {
                  name: 'centeredSlides',
                  label: 'Center Slides',
                  type: 'checkbox',
                  defaultValue: false,
                },
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
                {
                  name: 'showArrows',
                  label: 'Show Navigation Arrows',
                  type: 'checkbox',
                  defaultValue: true,
                },
                {
                  name: 'showDots',
                  label: 'Show Navigation Dots',
                  type: 'checkbox',
                  defaultValue: true,
                },
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
              defaultValue: 'card-with-background',
              options: [
                { label: 'Card Row', value: 'card-row' },
                { label: 'Card With Inline Image', value: 'card-inline-image' },
                { label: 'Card With Background Image', value: 'card-with-background' },
              ],

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
        {
          name: 'styles',
          label: 'Styles',
          fields: [...CSSNameWithCustomFiled],
        },
      ],
    },
  ],
}
