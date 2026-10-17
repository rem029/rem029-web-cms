'use client'

import { useEffect, useState } from 'react'

/**
 * The id of the menu section at the top of the screen, for the category nav to mark while the
 * guest scrolls (replaces sdq's useMenuNav, whose url and fetch syncing a whole-menu page doesn't
 * need). IntersectionObserver on the section elements; `setActive` lets a nav click mark its
 * section straight away.
 */
export const useActiveSection = (
  ids: string[],
): { active: string | null; setActive: (id: string) => void } => {
  // 1. state active = ids[0] ?? null
  // 2. effect: IntersectionObserver (rootMargin '-20% 0px -70% 0px') on each
  //    document.getElementById(id); the first intersecting entry → setActive(entry.target.id)
  // 3. disconnect on cleanup; no IntersectionObserver (old browser, jsdom) → do nothing
  const [active, setActive] = useState<string | null>(ids[0] ?? null)
  useEffect(() => {}, [ids])
  return { active, setActive }
}
