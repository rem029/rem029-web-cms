import Link from 'next/link'
import React from 'react'

import { Button } from '@/components/ui/button'
import { css } from '@/utilities/constants'

export default function NotFound() {
  return (
    <div className={`${css('section')}`}>
      <div className={`${css('section__container')} py-28`}>
        <div className="prose max-w-none">
          <h1 style={{ marginBottom: 0 }}>404</h1>
          <p className="mb-4">This page could not be found.</p>
        </div>
        <Button asChild variant="default" className={css('btn-primary')}>
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </div>
  )
}
