// Page content builders for tests (own copy, so tests don't depend on src/seeds).
import type { Page } from '@/payload-types'

// non-null: the post content field is required, the content block column is optional
type RichText = NonNullable<
  NonNullable<
    Extract<Page['layout'][number], { blockType: 'content' }>['columns']
  >[number]['richText']
>

const text = (value: string) => ({
  type: 'text',
  text: value,
  version: 1,
  detail: 0,
  format: 0,
  mode: 'normal',
  style: '',
})

export const richText = (heading: string, ...paragraphs: string[]): RichText => ({
  root: {
    type: 'root',
    version: 1,
    direction: 'ltr',
    format: '',
    indent: 0,
    children: [
      {
        type: 'heading',
        tag: 'h2',
        version: 1,
        direction: 'ltr',
        format: '',
        indent: 0,
        children: [text(heading)],
      },
      ...paragraphs.map((paragraph) => ({
        type: 'paragraph',
        version: 1,
        direction: 'ltr' as const,
        format: '' as const,
        indent: 0,
        children: [text(paragraph)],
      })),
    ],
  },
})

export const contentLayout = (content: RichText): Page['layout'] => [
  { blockType: 'content', columns: [{ size: 'full', richText: content }] },
]
