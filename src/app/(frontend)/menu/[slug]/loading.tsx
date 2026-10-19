import { MenuPageSkeleton } from '../_components/MenuPageSkeleton'

// the skeleton while the menu loads; a menu that isn't found then shows the 404 page (user
// decision 2026-10-17: streamed, so it answers 200 with noindex instead of a 404 status)
export default function Loading() {
  return <MenuPageSkeleton />
}
