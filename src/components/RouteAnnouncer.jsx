import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

const PAGE_TITLES = {
  '/': 'Home',
  '/send': 'Send Money',
  '/transfers': 'Your Transfers'
}

function resolvePageTitle(pathname) {
  return PAGE_TITLES[pathname] ?? 'Page not found'
}

export default function RouteAnnouncer() {
  const { pathname } = useLocation()
  const [message, setMessage] = useState('')

  useEffect(() => {
    const title = resolvePageTitle(pathname)
    setMessage(`Navigated to ${title}`)
  }, [pathname])

  return (
    <div
      className="sr-only"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {message}
    </div>
  )
}
