'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useDocumentInfo } from '@payloadcms/ui'

import { getMenuPublicURLAction } from './actions'
import './PublicURL.scss'

const COPIED_FOR_MS = 2000

/**
 * "Public URL" on a menu's edit view (rem0017 phase 3 step 5), under the title: the address
 * guests open, with Copy and Open, once the menu is saved (draft or published). The address
 * comes from the server (`getMenuPublicURLAction`) after each save, so it follows the saved slug.
 * Styled with Payload's own field classes, so the admin theme applies.
 */
export const PublicURL: React.FC = () => {
  const { id, savedDocumentData, hasPublishedDoc } = useDocumentInfo()
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedAt = savedDocumentData?.updatedAt

  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current)
    },
    [],
  )

  useEffect(() => {
    if (!id) return
    // ignore an answer that arrives after a newer save started its own request
    let cancelled = false
    void getMenuPublicURLAction({ id: Number(id) }).then((result) => {
      if (cancelled) return
      setUrl(result.ok ? result.url : null)
      setError(result.ok ? null : result.error)
    })
    return () => {
      cancelled = true
    }
  }, [id, savedAt])

  const copy = async () => {
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopied(true)
    if (copiedTimer.current) clearTimeout(copiedTimer.current)
    copiedTimer.current = setTimeout(() => setCopied(false), COPIED_FOR_MS)
  }

  return (
    <div className="field-type menu-public-url">
      <span className="field-label">Public URL</span>
      {!id && <p className="field-description">Save the menu to get its address.</p>}
      {id && error && <p className="field-description">{error}</p>}
      {id && url && (
        <>
          <div className="menu-public-url__row">
            <a
              className="menu-public-url__address"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {url}
            </a>
            <button
              type="button"
              className="btn btn--size-small btn--style-secondary"
              onClick={copy}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
            <a
              className="btn btn--size-small btn--style-secondary"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open
            </a>
          </div>
          {!hasPublishedDoc && (
            <p className="field-description">
              Guests can see this address once you publish the menu.
            </p>
          )}
        </>
      )}
    </div>
  )
}
