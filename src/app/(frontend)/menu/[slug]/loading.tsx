import React from 'react'

/**
 * What guests see while `/menu/<slug>` loads: the header, the category bar and a few item card
 * shapes, pulsing (theme colours only). Step 3 swaps the card shapes for MenuItemCardSkeleton.
 */
export default function MenuLoading() {
  // 1. container like the menu page: a title bar (h-10 w-1/2), a row of 4 pill shapes (category
  //    nav), then 6 card shapes in the menu grid; all bg-muted animate-pulse rounded
  // 2. aria-busy="true" on the container; motion-reduce:animate-none
  return <div />
}
