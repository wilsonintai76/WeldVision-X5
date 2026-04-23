import { useState, FC } from 'react'
import { Wifi, WifiOff, Settings, Camera } from 'lucide-react'

// Types
import { EdgeConfig } from './edge/types'

// Components
import DeviceSettings from './edge/DeviceSettings'
import CalibrationWizard from './edge/CalibrationWizard'

const EdgeManagement: FC = () => {
  const [activeTab, setActiveTab] = useState<'device' | 'calibration'>('device')
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0)
  
  const [edgeConfig, setEdgeConfig] = useState<EdgeConfig>({
    device_ip: '192.168.1.100',
    device_port: '8080',
    stream_port: '8554',
    model_path: '/app/runtime/weldvision.bin'
  })

  // When calibration completes, we want to refresh the device settings list
  const handleCalibrationComplete = () => {
    setRefreshTrigger(prev => prev + 1)
    setActiveTab('device')
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700 max-w-[1600px] mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-950/50 p-8 rounded-[2rem] border border-white/5 shadow-2xl backdrop-blur-3xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] -mr-48 -mt-48 transition-opacity group-hover:opacity-100" />
        
        <div className="relative z-10">
          <h2 className="text-4xl font-black text-white tracking-tighter">Edge Management</h2>
          <p className="text-slate-500 mt-2 font-medium flex items-center gap-2">
            RDK X5 Hardware Control & 
            <span className="text-blue-400 font-black uppercase tracking-widest text-[10px] bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">Stereo Sync</span>
          </p>
        </div>
        
        {/* Connection Status Indicator */}
        <div className="relative z-10 flex items-center gap-4 bg-slate-900/50 p-4 rounded-2xl border border-white/5 shadow-inner">
           <div className="flex flex-col items-end">
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Global Status</p>
             <p className="text-sm font-bold text-white font-mono">{edgeConfig.device_ip}</p>
           </div>
           <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
             <Wifi className="w-6 h-6 text-emerald-500" />
           </div>
        </div>
      </div>

      {/* Tab Navigation (Glassmorphism) */}
      <div className="flex gap-2 p-1.5 bg-slate-950/50 backdrop-blur-xl rounded-2xl border border-white/5 w-fit shadow-xl">
        <button
          onClick={() => setActiveTab('device')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
            activeTab === 'device' 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
              : 'text-slate-500 hover:text-white hover:bg-white/5'
          }`}
        >
          <Settings className="w-4 h-4" />
          Device Engine
        </button>
        <button
          onClick={() => setActiveTab('calibration')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
            activeTab === 'calibration' 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
              : 'text-slate-500 hover:text-white hover:bg-white/5'
          }`}
        >
          <Camera className="w-4 h-4" />
          Calibration Wizard
        </button>
      </div>

      {/* Main Content Area */}
      <div className="transition-all duration-500">
        {activeTab === 'device' ? (
          <DeviceSettings
            edgeConfig={edgeConfig}
            setEdgeConfig={setEdgeConfig}
            onNavigateToCalibration={() => setActiveTab('calibration')}
            refreshTrigger={refreshTrigger}
          />
        ) : (
          <CalibrationWizard
            deviceIp={edgeConfig.device_ip}
            onComplete={handleCalibrationComplete}
          />
        )}
      </div>
    </div>
  )
}

export default EdgeManagement
