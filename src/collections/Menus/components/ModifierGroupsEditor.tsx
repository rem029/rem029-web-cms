'use client'

/**
 * Options editor of the item form: groups (e.g. Size) with their choices (Small, Large) and each
 * choice's extra price (rem0018, empty = free), how many a guest picks (any number / exactly one)
 * and whether it's required. Controlled by the form.
 */
import React from 'react'

import type { ModifierGroupInput } from './builderTypes'

export type ModifierGroupsEditorProps = {
  value: ModifierGroupInput[]
  onChange: (value: ModifierGroupInput[]) => void
}

const emptyGroup = (): ModifierGroupInput => ({
  name: '',
  inputType: 'checkbox',
  required: false,
  options: [{ label: '', price: null }],
})

export const ModifierGroupsEditor: React.FC<ModifierGroupsEditorProps> = ({ value, onChange }) => {
  const setGroup = (index: number, group: ModifierGroupInput) =>
    onChange(value.map((current, i) => (i === index ? group : current)))

  return (
    <fieldset className="menu-builder__options">
      <legend>Options</legend>
      {value.length === 0 && (
        <p className="menu-builder__empty">No options. Add one for sizes, extras…</p>
      )}
      {value.map((group, index) => (
        <div key={index} className="menu-builder__option-group">
          <div className="menu-builder__toolbar">
            <input
              aria-label={`Option group ${index + 1} name`}
              placeholder="Group name, e.g. Size"
              value={group.name}
              onChange={(event) => setGroup(index, { ...group, name: event.target.value })}
            />
            <select
              aria-label={`Option group ${index + 1}: guests pick`}
              value={group.inputType}
              onChange={(event) =>
                setGroup(index, {
                  ...group,
                  inputType: event.target.value === 'radio' ? 'radio' : 'checkbox',
                })
              }
            >
              <option value="checkbox">Any number</option>
              <option value="radio">Exactly one</option>
            </select>
            <label>
              <input
                type="checkbox"
                checked={group.required}
                onChange={(event) => setGroup(index, { ...group, required: event.target.checked })}
              />{' '}
              Required
            </label>
            <button
              type="button"
              aria-label={`Remove option group ${index + 1}`}
              onClick={() => onChange(value.filter((_, i) => i !== index))}
            >
              Remove
            </button>
          </div>
          <ul className="menu-builder__choices">
            {group.options.map((option, optionIndex) => (
              <li key={optionIndex}>
                <input
                  aria-label={`Option group ${index + 1}, choice ${optionIndex + 1}`}
                  placeholder="Choice, e.g. Large"
                  value={option.label}
                  onChange={(event) =>
                    setGroup(index, {
                      ...group,
                      options: group.options.map((current, i) =>
                        i === optionIndex ? { ...current, label: event.target.value } : current,
                      ),
                    })
                  }
                />
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  aria-label={`Option group ${index + 1}, choice ${optionIndex + 1} extra price`}
                  placeholder="Free"
                  value={option.price ?? ''}
                  onChange={(event) =>
                    setGroup(index, {
                      ...group,
                      options: group.options.map((current, i) =>
                        i === optionIndex
                          ? {
                              ...current,
                              price: event.target.value === '' ? null : Number(event.target.value),
                            }
                          : current,
                      ),
                    })
                  }
                />
                <button
                  type="button"
                  aria-label={`Remove choice ${optionIndex + 1} of option group ${index + 1}`}
                  disabled={group.options.length === 1}
                  onClick={() =>
                    setGroup(index, {
                      ...group,
                      options: group.options.filter((_, i) => i !== optionIndex),
                    })
                  }
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn btn--style-secondary btn--size-small"
            onClick={() =>
              setGroup(index, { ...group, options: [...group.options, { label: '', price: null }] })
            }
          >
            Add choice
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn btn--style-secondary btn--size-small"
        onClick={() => onChange([...value, emptyGroup()])}
      >
        Add option group
      </button>
    </fieldset>
  )
}
