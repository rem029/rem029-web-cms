'use client'

import { type ButtonProps } from '@/components/ui/button'
import { Menu, Page, Post } from '@/payload-types'
import Link from 'next/link'
import { useRouter } from 'next/compat/router'

import React from 'react'

type CMSLinkType = {
  appearance?: 'inline' | ButtonProps['variant']
  children?: React.ReactNode
  className?: string
  label?: string | null
  newTab?: boolean | null
  reference?: {
    relationTo: 'pages' | 'posts' | 'menus'
    value: Page | Post | Menu | string | number
  } | null
  size?: ButtonProps['size'] | null
  type?: 'custom' | 'reference' | 'group' | 'menus' | null
  url?: string | null
  onClick?: () => void
}

export const CMSLink: React.FC<CMSLinkType> = (props) => {
  const router = useRouter()
  const { children, className, label, newTab, reference, type, url, onClick } = props

  // Fix: Improved href calculation with better reference handling
  let href: string | null = null

  if (type === 'reference' && reference) {
    if (reference.relationTo === 'pages') {
      href = `/${(reference.value as Page).slug}`
    } else if (reference.relationTo === 'menus') {
      if (
        typeof reference.value === 'object' &&
        reference.value !== null &&
        'slug' in reference.value &&
        typeof reference.value.slug === 'string'
      ) {
        href = `/menu/${reference.value.slug}`
      }
    }
  } else if (type === 'menus') {
    href = '/menu'
  } else if (url) {
    // For custom links, use the URL directly
    href = url
  }

  const newTabProps = newTab ? { rel: 'noopener noreferrer', target: '_blank' } : {}

  const handleClick = (_: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) {
      onClick()
    }
    // insert analytics here

    router?.push(href || url || '')
  }

  return (
    <Link
      onClick={handleClick}
      className={className ? className : ``}
      href={href || url || ''}
      {...newTabProps}
    >
      {label && label}
      {children && children}
    </Link>
  )
}
