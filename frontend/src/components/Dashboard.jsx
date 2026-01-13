import { useState, useEffect } from 'react'
import { Camera, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

function Dashboard() {
  const [metrics, setMetrics] = useState({
    height: 2.1,
    width: 10.2,
    defects: {
      porosity: 0,
      spatter: 0,
      slagInclusion: 0,
      burnThrough: 0,
    },
  })

  // Mock Data Generator - Updates every second
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics({
        height: parseFloat((2.1 + (Math.random() - 0.5) * 0.2).toFixed(2)),
        width: parseFloat((10.0 + Math.random() * 2).toFixed(2)),
        defects: {
          porosity: Math.floor(Math.random() * 3),
          spatter: Math.floor(Math.random() * 5),
          slagInclusion: Math.floor(Math.random() * 2),
          burnThrough: Math.floor(Math.random() * 2),
        },
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Validation Functions
  const isHeightValid = metrics.height >= 1 && metrics.height <= 3
  const isWidthValid = metrics.width >= 8 && metrics.width <= 12

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Live Monitoring</h2>
          <p className="text-slate-400 mt-1">Real-time weld quality inspection</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-industrial-slate rounded-lg">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-slate-300 font-medium">Streaming</span>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left: Video Feed */}
        <div className="col-span-2">
          <div className="bg-black rounded-lg border-2 border-industrial-gray aspect-video flex items-center justify-center">
            <div className="text-center">
              <Camera className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-500 text-lg font-medium">Camera Feed</p>
              <p className="text-slate-600 text-sm mt-2">Awaiting RDK X5 Connection</p>
            </div>
          </div>
        </div>

        {/* Right: Live Metrics */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-white mb-4">Live Metrics</h3>

          {/* Reinforcement Height Card */}
          <div className={`p-4 rounded-lg border-2 transition-all ${
            isHeightValid 
              ? 'bg-green-950/30 border-green-600' 
              : 'bg-red-950/30 border-red-600'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-300">Reinforcement Height</span>
              {isHeightValid ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
            </div>
            <div className="text-3xl font-bold text-white">
              {metrics.height.toFixed(2)} <span className="text-lg text-slate-400">mm</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Target: 1.0 - 3.0 mm
            </div>
          </div>

          {/* Bead Width Card */}
          <div className={`p-4 rounded-lg border-2 transition-all ${
            isWidthValid 
              ? 'bg-green-950/30 border-green-600' 
              : 'bg-red-950/30 border-red-600'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-300">Bead Width</span>
              {isWidthValid ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
            </div>
            <div className="text-3xl font-bold text-white">
              {metrics.width.toFixed(2)} <span className="text-lg text-slate-400">mm</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Target: 8.0 - 12.0 mm
            </div>
          </div>

          {/* Visual Defects Card */}
          <div className="p-4 rounded-lg bg-industrial-slate border-2 border-industrial-gray">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <span className="text-sm font-medium text-slate-300">Visual Defects</span>
            </div>
            <div className="space-y-2">
              <DefectRow label="Porosity" count={metrics.defects.porosity} />
              <DefectRow label="Spatter" count={metrics.defects.spatter} />
              <DefectRow label="Slag Inclusion" count={metrics.defects.slagInclusion} />
              <DefectRow label="Burn-Through" count={metrics.defects.burnThrough} />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Total Inspections" value="1,247" trend="+12%" />
        <StatCard title="Pass Rate" value="94.3%" trend="+2.1%" />
        <StatCard title="Avg. Height" value="2.1mm" trend="±0.1" />
        <StatCard title="Defect Rate" value="5.7%" trend="-1.3%" />
      </div>
    </div>
  )
}

// Helper Components
function DefectRow({ label, count }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-400">{label}</span>
      <span className={`font-mono font-semibold ${
        count > 0 ? 'text-red-400' : 'text-green-400'
      }`}>
        {count}
      </span>
    </div>
  )
}

function StatCard({ title, value, trend }) {
  const isPositive = trend.startsWith('+')
  return (
    <div className="p-4 bg-industrial-slate rounded-lg border border-industrial-gray">
      <p className="text-xs text-slate-400 mb-1">{title}</p>
      <div className="flex items-baseline justify-between">
        <p className="text-2xl font-bold text-white">{value}</p>
        <span className={`text-xs font-medium ${
          isPositive ? 'text-green-400' : 'text-slate-400'
        }`}>
          {trend}
        </span>
      </div>
    </div>
  )
}

export default Dashboard
