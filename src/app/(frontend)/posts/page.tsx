import { notFound } from 'next/navigation'

// no posts index yet: a real 404 (status included), rendered per request so the layout shows the
// host's tenant
export default function Page() {
  notFound()
}
