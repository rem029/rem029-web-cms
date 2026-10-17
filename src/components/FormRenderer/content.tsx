/**
 * Content blocks inside a form: `message` (rich text) and `image` (media + caption, size
 * small | medium | full). They hold no answer, so validation and `submissionData` skip them
 * (`isContentBlock` in helpers.ts). Rendered by `RecursiveFields` with `fb-content` +
 * `fb-content--<blockType>` and the block's `css_class`.
 */
import React from 'react'

import { Media } from '@/components/Media'
import RichText from '@/components/RichText'
import { cn } from '@/utilities/ui'

import type { FieldOf } from './types'

const IMAGE_SIZES = { small: 'max-w-xs', medium: 'max-w-md', full: 'w-full' } as const

export const MessageContent: React.FC<{ block: FieldOf<'message'> }> = ({ block }) => {
  if (!block.message) return null
  return (
    <div className={cn('fb-content fb-content--message basis-full', block.css_class)}>
      <RichText data={block.message} enableGutter={false} />
    </div>
  )
}

export const ImageContent: React.FC<{ block: FieldOf<'image'> }> = ({ block }) => {
  // an unpopulated id means the page loaded the form too shallow: nothing to show
  if (typeof block.media !== 'object') return null
  return (
    <figure
      className={cn(
        'fb-content fb-content--image basis-full',
        IMAGE_SIZES[block.size ?? 'full'],
        block.css_class,
      )}
    >
      <Media imgClassName="h-auto w-full rounded" resource={block.media} />
      {block.caption && (
        <figcaption className="mt-2 text-sm text-muted-foreground">{block.caption}</figcaption>
      )}
    </figure>
  )
}
