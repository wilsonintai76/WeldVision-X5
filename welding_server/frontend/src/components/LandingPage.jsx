import { useState, useEffect } from 'react'
import {
  Cpu,
  Rocket,
  BookOpen,
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Monitor,
  GitBranch,
  ExternalLink,
  Camera,
  Database,
  Brain,
  Settings,
  RefreshCw
} from 'lucide-react'

function LandingPage({ onEnterApp }) {
  const [systemStatus, setSystemStatus] = useState({
    backend: { status: 'checking', message: 'Checking...' },
    edgeDevice: { status: 'checking', message: 'Checking...' }
  })
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    checkSystemStatus()
  }, [])

  const checkSystemStatus = async () => {
    setIsChecking(true)
    
    // Check backend using CSRF endpoint (public, no auth required)
    try {
      const response = await fetch('/api/auth/csrf/', { credentials: 'include', method: 'GET',
        headers: { 'Accept': 'application/json' },
        credentials: 'include'
      })
      if (response.ok) {
        setSystemStatus(prev => ({
          ...prev,
          backend: { status: 'online', message: 'Connected' }
        }))
      } else {
        setSystemStatus(prev => ({
          ...prev,
          backend: { status: 'error', message: 'API Error' }
        }))
      }
    } catch {
      setSystemStatus(prev => ({
        ...prev,
        backend: { status: 'offline', message: 'Not reachable' }
      }))
    }

    // Check edge device (placeholder - would need actual edge device endpoint)
    try {
      const edgeResponse = await fetch('/api/edge/status/', { credentials: 'include', method: 'GET',
        headers: { 'Accept': 'application/json' },
        credentials: 'include'
      })
      if (edgeResponse.ok) {
        const data = await edgeResponse.json()
        const hasOnlineDevice = data.some && data.some(d => d.status === 'online')
        setSystemStatus(prev => ({
          ...prev,
          edgeDevice: { 
            status: hasOnlineDevice ? 'online' : 'warning', 
            message: hasOnlineDevice ? 'Device connected' : 'No devices online'
          }
        }))
      } else {
        setSystemStatus(prev => ({
          ...prev,
          edgeDevice: { status: 'warning', message: 'No devices registered' }
        }))
      }
    } catch {
      setSystemStatus(prev => ({
        ...prev,
        edgeDevice: { status: 'warning', message: 'Edge API unavailable' }
      }))
    }

    setIsChecking(false)
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="w-5 h-5 text-emerald-400" />
      case 'offline':
        return <XCircle className="w-5 h-5 text-red-400" />
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-amber-400" />
      default:
        return <RefreshCw className="w-5 h-5 text-slate-400 animate-spin" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
        return 'border-emerald-500/50 bg-emerald-500/10'
      case 'offline':
        return 'border-red-500/50 bg-red-500/10'
      case 'warning':
        return 'border-amber-500/50 bg-amber-500/10'
      default:
        return 'border-slate-500/50 bg-slate-500/10'
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
        {/* Logo and Title */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-500/25">
              <Cpu className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-white mb-3">
            WeldVision <span className="text-emerald-400">X5</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-lg mx-auto">
            Industrial Edge Computing Platform for Real-Time Weld Quality Inspection
          </p>
        </div>

        {/* Quick Start Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full mb-12">
          <QuickStartCard
            icon={<Rocket className="w-8 h-8" />}
            title="Quick Start"
            description="Get up and running in minutes with our step-by-step guide"
            href="https://github.com/wilsonintai76/WeldVision-X5/blob/main/docs/QUICKSTART.md"
            color="emerald"
          />
          <QuickStartCard
            icon={<BookOpen className="w-8 h-8" />}
            title="Prerequisites"
            description="Hardware and software requirements for your setup"
            href="https://github.com/wilsonintai76/WeldVision-X5/blob/main/docs/PREREQUISITES.md"
            color="blue"
          />
          <QuickStartCard
            icon={<Settings className="w-8 h-8" />}
            title="Deployment Guide"
            description="Learn what runs where and how to connect everything"
            href="https://github.com/wilsonintai76/WeldVision-X5/blob/main/docs/DEPLOYMENT.md"
            color="purple"
          />
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl w-full mb-12">
          <FeatureCard
            icon={<Monitor className="w-6 h-6" />}
            title="Live Monitoring"
            description="Real-time video feed with AI detection"
          />
          <FeatureCard
            icon={<Brain className="w-6 h-6" />}
            title="MLOps Studio"
            description="Train, convert, and deploy models"
          />
          <FeatureCard
            icon={<Camera className="w-6 h-6" />}
            title="Stereo Vision"
            description="Accurate depth measurement"
          />
          <FeatureCard
            icon={<Database className="w-6 h-6" />}
            title="Data Management"
            description="Annotate and organize datasets"
          />
        </div>

        {/* System Status */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-lg w-full mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">System Status</h3>
            <button
              onClick={checkSystemStatus}
              disabled={isChecking}
              className="text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="space-y-3">
            <div className={`flex items-center justify-between p-3 rounded-lg border ${getStatusColor(systemStatus.backend.status)}`}>
              <div className="flex items-center gap-3">
                {getStatusIcon(systemStatus.backend.status)}
                <div>
                  <p className="text-white font-medium text-sm">Backend Server</p>
                  <p className="text-xs text-slate-400">Django REST API</p>
                </div>
              </div>
              <span className="text-xs text-slate-300">{systemStatus.backend.message}</span>
            </div>
            <div className={`flex items-center justify-between p-3 rounded-lg border ${getStatusColor(systemStatus.edgeDevice.status)}`}>
              <div className="flex items-center gap-3">
                {getStatusIcon(systemStatus.edgeDevice.status)}
                <div>
                  <p className="text-white font-medium text-sm">Edge Device</p>
                  <p className="text-xs text-slate-400">RDK X5</p>
                </div>
              </div>
              <span className="text-xs text-slate-300">{systemStatus.edgeDevice.message}</span>
            </div>
          </div>
        </div>

        {/* Enter Dashboard Button */}
        <button
          onClick={onEnterApp}
          className="group flex items-center gap-3 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-2xl shadow-emerald-500/25 transition-all hover:scale-105"
        >
          <Monitor className="w-6 h-6" />
          Enter Dashboard
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Footer with Additional Resources */}
      <footer className="border-t border-slate-800 bg-slate-900/50 py-8 px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="text-white font-semibold mb-3">Documentation</h4>
              <ul className="space-y-2">
                <FooterLink href="https://github.com/wilsonintai76/WeldVision-X5/blob/main/docs/QUICKSTART.md">Quick Start</FooterLink>
                <FooterLink href="https://github.com/wilsonintai76/WeldVision-X5/blob/main/docs/PREREQUISITES.md">Prerequisites</FooterLink>
                <FooterLink href="https://github.com/wilsonintai76/WeldVision-X5/blob/main/docs/DEPLOYMENT.md">Deployment</FooterLink>
                <FooterLink href="https://github.com/wilsonintai76/WeldVision-X5/blob/main/docs/STEREO_CALIBRATION_SETUP.md">Stereo Calibration</FooterLink>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Hardware</h4>
              <ul className="space-y-2">
                <FooterLink href="https://d-robotics.github.io/rdk_doc/en/RDK">RDK X5 Docs</FooterLink>
                <FooterLink href="https://docs.opencv.org/4.x/dc/dbb/tutorial_py_calibration.html">OpenCV Calibration</FooterLink>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">AI & ML</h4>
              <ul className="space-y-2">
                <FooterLink href="https://docs.ultralytics.com/">YOLO Docs</FooterLink>
                <FooterLink href="https://hub.ultralytics.com/">Ultralytics HUB</FooterLink>
                <FooterLink href="https://roboflow.com/">Roboflow</FooterLink>
                <FooterLink href="https://colab.research.google.com/">Google Colab</FooterLink>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Development</h4>
              <ul className="space-y-2">
                <FooterLink href="https://github.com/wilsonintai76/WeldVision-X5">
                  <GitBranch className="w-3 h-3 inline mr-1" />
                  GitHub Repository
                </FooterLink>
                <FooterLink href="https://www.django-rest-framework.org/">Django REST</FooterLink>
                <FooterLink href="https://react.dev/">React</FooterLink>
                <FooterLink href="https://docs.docker.com/">Docker</FooterLink>
              </ul>
            </div>
          </div>
          <div className="text-center text-slate-500 text-sm pt-6 border-t border-slate-800">
            <p>WeldVision X5 • Industrial Edge Computing Platform</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

// Helper Components
function QuickStartCard({ icon, title, description, href, color }) {
  const colorClasses = {
    emerald: 'from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 shadow-emerald-500/20',
    blue: 'from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 shadow-blue-500/20',
    purple: 'from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 shadow-purple-500/20'
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`group bg-gradient-to-br ${colorClasses[color]} rounded-xl p-6 shadow-xl transition-all hover:scale-105`}
    >
      <div className="text-white/90 mb-4">{icon}</div>
      <h3 className="text-white font-bold text-lg mb-2 flex items-center gap-2">
        {title}
        <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
      </h3>
      <p className="text-white/80 text-sm">{description}</p>
    </a>
  )
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center hover:border-slate-700 transition-colors">
      <div className="text-emerald-400 flex justify-center mb-3">{icon}</div>
      <h4 className="text-white font-semibold text-sm mb-1">{title}</h4>
      <p className="text-slate-400 text-xs">{description}</p>
    </div>
  )
}

function FooterLink({ href, children }) {
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-slate-400 hover:text-white text-sm transition-colors flex items-center gap-1"
      >
        {children}
        <ExternalLink className="w-3 h-3 opacity-50" />
      </a>
    </li>
  )
}

export default LandingPage


