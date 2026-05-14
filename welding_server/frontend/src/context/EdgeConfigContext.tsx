import React, { createContext, useContext, useState, useEffect, useCallback, FC, ReactNode } from 'react'
import { EdgeConfig } from '../components/edge/types'

const EDGE_CONFIG_KEY = 'wv_edge_config'

const DEFAULT_CONFIG: EdgeConfig = {
  device_ip: '192.168.1.100',
  device_port: '8080',
  stream_port: '8554',
  model_path: '/app/runtime/weldvision.bin',
}

export type ConnMode = 'cloud' | 'edge' | 'offline'

export interface Connectivity {
  cloudOnline: boolean
  edgeOnline: boolean
  mode: ConnMode
  checking: boolean
}

interface EdgeConfigContextType {
  edgeConfig: EdgeConfig
  setEdgeConfig: (cfg: EdgeConfig) => void
  connectivity: Connectivity
  refreshConnectivity: () => void
  edgeBase: string
  mixedContentWarning: boolean
}

const EdgeConfigContext = createContext<EdgeConfigContextType | null>(null)

export const EdgeConfigProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [edgeConfig, setEdgeConfigState] = useState<EdgeConfig>(() => {
    try {
      const saved = localStorage.getItem(EDGE_CONFIG_KEY)
      return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG
    } catch {
      return DEFAULT_CONFIG
    }
  })

  const [connectivity, setConnectivity] = useState<Connectivity>({
    cloudOnline: false,
    edgeOnline: false,
    mode: 'offline',
    checking: true,
  })

  const setEdgeConfig = useCallback((cfg: EdgeConfig) => {
    setEdgeConfigState(cfg)
    try { localStorage.setItem(EDGE_CONFIG_KEY, JSON.stringify(cfg)) } catch { /* ignore */ }
  }, [])

  const checkConnectivity = useCallback(async () => {
    setConnectivity(prev => ({ ...prev, checking: true }))

    const cloudUrl = `${import.meta.env.VITE_API_URL ?? ''}/health`
    const edgeUrl  = `http://${edgeConfig.device_ip}:${edgeConfig.device_port}/health`

    // Browsers block HTTP fetches from HTTPS pages (mixed content). When served
    // over HTTPS, skip the edge health check — it will always be blocked.
    const isHttps = window.location.protocol === 'https:'

    const [cloudResult, edgeResult] = await Promise.allSettled([
      fetch(cloudUrl, { signal: AbortSignal.timeout(4000) }).then(r => r.ok),
      isHttps
        ? Promise.resolve(false)
        : fetch(edgeUrl, { signal: AbortSignal.timeout(2500) }).then(r => r.ok),
    ])

    const cloudOnline = cloudResult.status === 'fulfilled' && cloudResult.value === true
    const edgeOnline  = edgeResult.status  === 'fulfilled' && edgeResult.value  === true
    const mode: ConnMode = cloudOnline ? 'cloud' : edgeOnline ? 'edge' : 'offline'

    setConnectivity({ cloudOnline, edgeOnline, mode, checking: false })
  }, [edgeConfig.device_ip, edgeConfig.device_port])

  useEffect(() => {
    checkConnectivity()
    const id = setInterval(checkConnectivity, 15_000)
    return () => clearInterval(id)
  }, [checkConnectivity])

  const edgeBase = `http://${edgeConfig.device_ip}:${edgeConfig.device_port}`

  // True when the page is on HTTPS but edge device is plain HTTP — Chrome will block those requests
  const mixedContentWarning = window.location.protocol === 'https:' && !connectivity.cloudOnline

  return (
    <EdgeConfigContext.Provider
      value={{ edgeConfig, setEdgeConfig, connectivity, refreshConnectivity: checkConnectivity, edgeBase, mixedContentWarning }}
    >
      {children}
    </EdgeConfigContext.Provider>
  )
}

export function useEdgeConfig(): EdgeConfigContextType {
  const ctx = useContext(EdgeConfigContext)
  if (!ctx) throw new Error('useEdgeConfig must be used within EdgeConfigProvider')
  return ctx
}
