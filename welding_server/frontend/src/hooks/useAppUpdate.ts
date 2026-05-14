import { useEffect, useRef, useState } from 'react'

/** How often to poll /version.json (ms). */
const POLL_INTERVAL = 5 * 60 * 1000 // 5 minutes

/** Seconds before auto-reload once a new version is detected. */
const RELOAD_COUNTDOWN = 10

interface VersionPayload {
  version: string
  buildTime?: string
}

/**
 * Polls /version.json every 5 minutes.
 * When the deployed version differs from the compiled-in __APP_VERSION__,
 * starts a 10-second countdown and then reloads the page automatically.
 */
export function useAppUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [newVersion, setNewVersion] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(RELOAD_COUNTDOWN)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Poll for new version
  useEffect(() => {
    const checkVersion = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' })
        if (!res.ok) return
        const data = (await res.json()) as VersionPayload
        if (data.version && data.version !== __APP_VERSION__) {
          setNewVersion(data.version)
          setUpdateAvailable(true)
        }
      } catch {
        // Network unavailable — skip silently
      }
    }

    checkVersion()
    const pollId = setInterval(checkVersion, POLL_INTERVAL)
    return () => clearInterval(pollId)
  }, [])

  // Auto-reload countdown once update is detected
  useEffect(() => {
    if (!updateAvailable) return
    setCountdown(RELOAD_COUNTDOWN)

    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!)
          window.location.reload()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [updateAvailable])

  return {
    updateAvailable,
    newVersion,
    countdown,
    currentVersion: __APP_VERSION__,
  }
}
