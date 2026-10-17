/**
 * Content blocks inside a form: `message` (rich text) and `image` (media + caption, size
 * small | medium | full). They hold no answer, so validation and `submissionData` skip them
 * (`isContentBlock` in helpers.ts). Rendered by `RecursiveFields` with `fb-content` +
 * `fb-content--<blockType>` and the block's `css_class`.
 */
import React from 'react'

import type { FieldOf } from './types'

export const MessageContent: React.FC<{ block: FieldOf<'message'> }> = () => {
  // 1. <div className={cn('fb-content fb-content--message', css_class)}>
  // 2.   <RichText data={message} enableGutter={false} />
  return <div />
}

export const ImageContent: React.FC<{ block: FieldOf<'image'> }> = () => {
  // 1. media not populated (an id) → null (the page loads forms with depth ≥ 1)
  // 2. <figure className={cn('fb-content fb-content--image', `fb-image--${size}`, css_class)}>
  // 3.   <Media resource={media} /> + <figcaption> caption
  return <figure />
}
