'use client'

/**
 * Categories panel of the menu builder: the tenant's categories in guest order with their item
 * counts; add, rename, move up/down, and "Add all to this menu". Stateless apart from the inputs
 * being typed: `MenuBuilder` saves.
 */
import React, { useState } from 'react'

import type { BuilderCategory } from './builderTypes'

export type CategoriesPanelProps = {
  categories: BuilderCategory[]
  error: string | null
  onAddAll: (categoryId: number) => void
  onCreate: (title: string) => void
  onRename: (categoryId: number, title: string) => void
  onMove: (categoryId: number, direction: -1 | 1) => void
}

const CategoryRow: React.FC<{
  category: BuilderCategory
  isFirst: boolean
  isLast: boolean
  props: CategoriesPanelProps
}> = ({ category, isFirst, isLast, props }) => {
  const [renaming, setRenaming] = useState(false)
  const [title, setTitle] = useState(category.title)

  const finish = () => {
    setRenaming(false)
    if (title.trim() && title.trim() !== category.title) props.onRename(category.id, title.trim())
    else setTitle(category.title)
  }

  return (
    <li className="menu-builder__category">
      {renaming ? (
        <input
          aria-label={`Name of ${category.title}`}
          value={title}
          autoFocus
          onChange={(event) => setTitle(event.target.value)}
          onBlur={finish}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              finish()
            }
            if (event.key === 'Escape') {
              setTitle(category.title)
              setRenaming(false)
            }
          }}
        />
      ) : (
        <button
          type="button"
          className="menu-builder__link"
          aria-label={`Rename ${category.title}`}
          onClick={() => setRenaming(true)}
        >
          {category.title}
        </button>
      )}
      <span className="menu-builder__count">
        {category.itemCount} {category.itemCount === 1 ? 'item' : 'items'}
      </span>
      <button
        type="button"
        aria-label={`Move ${category.title} up`}
        disabled={isFirst}
        onClick={() => props.onMove(category.id, -1)}
      >
        ↑
      </button>
      <button
        type="button"
        aria-label={`Move ${category.title} down`}
        disabled={isLast}
        onClick={() => props.onMove(category.id, 1)}
      >
        ↓
      </button>
      <button
        type="button"
        className="btn btn--style-secondary btn--size-small"
        aria-label={`Add all ${category.title} to this menu`}
        onClick={() => props.onAddAll(category.id)}
      >
        Add all to this menu
      </button>
    </li>
  )
}

export const CategoriesPanel: React.FC<CategoriesPanelProps> = (props) => {
  const { categories, error } = props
  const [newTitle, setNewTitle] = useState('')

  const create = () => {
    if (!newTitle.trim()) return
    props.onCreate(newTitle.trim())
    setNewTitle('')
  }

  return (
    <section className="menu-builder__panel" aria-label="Categories">
      <h4>Categories</h4>
      {error && (
        <p className="menu-builder__error" role="alert">
          {error}
        </p>
      )}
      {categories.length === 0 ? (
        <p className="menu-builder__empty">
          No categories yet. Items without one show under &quot;Other&quot;.
        </p>
      ) : (
        <ol className="menu-builder__categories">
          {categories.map((category, index) => (
            <CategoryRow
              key={category.id}
              category={category}
              isFirst={index === 0}
              isLast={index === categories.length - 1}
              props={props}
            />
          ))}
        </ol>
      )}
      <div className="menu-builder__toolbar">
        <input
          aria-label="New category name"
          placeholder="New category name"
          value={newTitle}
          onChange={(event) => setNewTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              create()
            }
          }}
        />
        <button
          type="button"
          className="btn btn--style-secondary btn--size-small"
          disabled={!newTitle.trim()}
          onClick={create}
        >
          Add category
        </button>
      </div>
    </section>
  )
}
