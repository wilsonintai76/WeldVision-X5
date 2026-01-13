import { useState } from 'react'
import { Activity, Database, Settings as SettingsIcon, Sliders, Tag } from 'lucide-react'
import Dashboard from './components/Dashboard'
import MLOps from './components/MLOps'
import Management from './components/Management'
import Settings from './components/Settings'
import Labeling from './components/Labeling'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')

  return (
    <div className="flex h-screen bg-industrial-darker">
      {/* Sidebar */}
      <aside className="w-64 bg-industrial-dark border-r border-industrial-gray flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-white mb-1">WeldVision X5</h1>
          <p className="text-sm text-slate-400">Edge Computing System</p>
        </div>

        <nav className="mt-6 flex-1 overflow-y-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-colors ${
              activeTab === 'dashboard'
                ? 'bg-industrial-blue text-white border-l-4 border-blue-500'
                : 'text-slate-300 hover:bg-industrial-slate hover:text-white'
            }`}
          >
            <Activity className="w-5 h-5" />
            <span className="font-medium">Live Monitoring</span>
          </button>

          <button
            onClick={() => setActiveTab('mlops')}
            className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-colors ${
              activeTab === 'mlops'
                ? 'bg-industrial-blue text-white border-l-4 border-blue-500'
                : 'text-slate-300 hover:bg-industrial-slate hover:text-white'
            }`}
          >
            <Database className="w-5 h-5" />
            <span className="font-medium">MLOps Center</span>
          </button>

          <button
            onClick={() => setActiveTab('labeling')}
            className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-colors ${
              activeTab === 'labeling'
                ? 'bg-industrial-blue text-white border-l-4 border-blue-500'
                : 'text-slate-300 hover:bg-industrial-slate hover:text-white'
            }`}
          >
            <Tag className="w-5 h-5" />
            <span className="font-medium">Data Labeling</span>
          </button>

          <button
            onClick={() => setActiveTab('management')}
            className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-colors ${
              activeTab === 'management'
                ? 'bg-industrial-blue text-white border-l-4 border-blue-500'
                : 'text-slate-300 hover:bg-industrial-slate hover:text-white'
            }`}
          >
            <SettingsIcon className="w-5 h-5" />
            <span className="font-medium">Management</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-colors ${
              activeTab === 'settings'
                ? 'bg-industrial-blue text-white border-l-4 border-blue-500'
                : 'text-slate-300 hover:bg-industrial-slate hover:text-white'
            }`}
          >
            <Sliders className="w-5 h-5" />
            <span className="font-medium">Calibration</span>
          </button>
        </nav>

        {/* Footer */}
        <div className="mt-auto p-6 border-t border-industrial-gray">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>System Online</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">RDK X5 Edge Device</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'mlops' && <MLOps />}
        {activeTab === 'labeling' && <Labeling />}
        {activeTab === 'management' && <Management />}
        {activeTab === 'settings' && <Settings />}
      </main>
    </div>
  )
}

export default App
