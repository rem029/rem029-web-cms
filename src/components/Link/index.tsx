'use client'

import Link from 'next/link'
import React from 'react'

type CMSLinkType = {
  label?: string | null
  children?: React.ReactNode
  href?: string
  newTab?: boolean
  className?: string
  onClick?: () => void
}

export const CMSLink: React.FC<CMSLinkType> = ({
  label,
  href,
  newTab,
  children,
  className,
  onClick,
}) => {
  const handleClick = (_: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) {
      onClick()
    }
    // insert analytics here
  }
  return (
    <Link
      onClick={handleClick}
      className={className ? className : ``}
      href={href || ''}
      target={(newTab && '_blank') || undefined}
    >
      {label && label}
      {children && children}
    </Link>
  )
}
