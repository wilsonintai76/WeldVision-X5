import React, { useState } from 'react'
import { Menu, Cpu, UploadCloud } from 'lucide-react'
import Sidebar from './Sidebar'
import { useModelNotifications } from '../../hooks/useModelNotifications'

interface AppLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: any;
  logout: () => Promise<void>;
  permissions: any;
  version: string;
}

const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  activeTab,
  setActiveTab,
  user,
  logout,
  permissions,
  version
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { newCompiledModels, newOnnxModels } = useModelNotifications()

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    setSidebarOpen(false)
  }

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        user={user}
        logout={logout}
        permissions={permissions}
        version={version}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-md flex items-center justify-center">
              <span className="text-white text-xs font-bold">W</span>
            </div>
            <span className="text-white font-semibold text-sm">WeldVision X5</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-slate-950 flex flex-col">
          
          {/* Notifications Banner */}
          {(newCompiledModels.length > 0 || newOnnxModels.length > 0) && (
            <div className="shrink-0 bg-slate-900 border-b border-slate-800 p-3 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-md">
              <div className="flex flex-col gap-1">
                {newCompiledModels.length > 0 && (
                  <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                    <Cpu className="w-4 h-4" /> 
                    {newCompiledModels.length} new compiled Horizon .bin {newCompiledModels.length === 1 ? 'model' : 'models'} ready for Edge (RDK) deployment!
                  </div>
                )}
                {newOnnxModels.length > 0 && (
                  <div className="flex items-center gap-2 text-blue-400 text-sm font-semibold">
                    <UploadCloud className="w-4 h-4" /> 
                    {newOnnxModels.length} new ONNX data {newOnnxModels.length === 1 ? 'model' : 'models'} available.
                  </div>
                )}
              </div>
              <button 
                onClick={() => handleTabChange('mlops')}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-md whitespace-nowrap transition-colors"
              >
                Go to MLOps
              </button>
            </div>
          )}

          <div className="flex-1">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default AppLayout
