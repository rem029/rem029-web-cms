import { Analytics } from '@/payload-types'
import { RequiredDataFromCollection } from 'payload'

// Utility to detect device type
const getDeviceType = (): Analytics['deviceType'] => {
  if (typeof window === 'undefined') return 'desktop'
  const ua = navigator.userAgent
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet'
  if (/Mobile|Android|iP(hone|od)/i.test(ua)) return 'mobile'
  return 'desktop'
}

export type AnalyticsData = RequiredDataFromCollection<Analytics>

export const addAnalytics = async (data: Partial<AnalyticsData>) => {
  try {
    if (data?.email) {
      localStorage.setItem('email', data.email)
    }

    if (data?.phone) {
      localStorage.setItem('phone', data.phone)
    }

    let email = ''
    let phone = ''
    if (typeof window !== 'undefined') {
      email = localStorage.getItem('email') || ''
      phone = localStorage.getItem('phone') || ''
      // Optionally, check cookies as fallback
    }

    const payload: AnalyticsData = {
      ...data,
      deviceType: data?.deviceType || getDeviceType(),
      eventType: data?.eventType || 'unknown',
      pagePath: data?.pagePath || (typeof window !== 'undefined' ? window.location.pathname : ''),
      referrer: typeof document !== 'undefined' ? document.referrer : '',
      email,
      phone,
      timestamp: new Date().toISOString(),
    }

    console.log('@addAnalytics payload', payload)

    await fetch('/next/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (_err) {
    // Silently fail
  }
}
