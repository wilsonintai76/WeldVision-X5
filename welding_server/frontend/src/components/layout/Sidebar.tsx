import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Home,
  Monitor,
  History as HistoryIcon,
  ChevronDown,
  ChevronRight,
  Rocket,
  Wifi,
  BookOpen,
  ClipboardCheck,
  Shield,
  User,
  LogOut,
  Cpu
} from 'lucide-react'
import { useAppUpdate } from '../../hooks/useAppUpdate'

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: any;
  logout: () => Promise<void>;
  permissions: any;
  version: string;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  user,
  logout,
  permissions,
  version
}) => {
  const navigate = useNavigate()
  const [expandedSections, setExpandedSections] = useState({
    mlops: true,
    system: false
  })
  const { updateAvailable } = useAppUpdate()

  const toggleSection = (section: 'mlops' | 'system') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const canAccessMLOps = permissions?.can_access_mlops
  const canManageUsers = permissions?.can_manage_users
  const canCreateEvaluation = permissions?.can_create_evaluation
  const isStudent = permissions?.is_student

  return (
    <aside className="w-56 bg-slate-900 border-r border-slate-800 flex flex-col h-screen">
      {/* Logo/Brand Section */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-lg flex items-center justify-center">
            <Cpu className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">WeldVision</h1>
            <p className="text-slate-500 text-xs">X5 Edge System</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {/* Home - Back to Landing */}
        <div className="px-3 mb-2">
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <Home className="w-4 h-4" />
            <span className="text-sm">Home</span>
          </button>
        </div>

        {/* Live Monitoring - Top Level */}
        <div className="px-3 mb-4">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${activeTab === 'dashboard'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
          >
            <Monitor className="w-5 h-5" />
            <span className="font-medium text-sm">Live Monitoring</span>
          </button>
        </div>

        {/* History - Top Level */}
        <div className="px-3 mb-4">
          <button
            onClick={() => setActiveTab('history')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${activeTab === 'history'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
          >
            <HistoryIcon className="w-5 h-5" />
            <span className="font-medium text-sm">Assessment History</span>
          </button>
        </div>

        {/* MLOps Studio Section - Hidden for Students */}
        {!isStudent && (
          <div className="mb-2">
            <button
              onClick={() => toggleSection('mlops')}
              className="w-full flex items-center justify-between px-4 py-2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <span className="text-xs font-semibold uppercase tracking-wider">AI Workspace</span>
              {expandedSections.mlops ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            {expandedSections.mlops && (
              <div className="mt-1 space-y-0.5 px-3">
                {canAccessMLOps && (
                  <div className="py-2">
                    <button
                      onClick={() => setActiveTab('mlops')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${activeTab === 'mlops'
                        ? 'bg-slate-800 text-emerald-400 border-l-2 border-emerald-400'
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                        }`}
                    >
                      <Rocket className="w-4 h-4" />
                      <span className="text-sm">Upload → Convert → Deploy</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* System Section */}
        <div className="mb-2">
          <button
            onClick={() => toggleSection('system')}
            className="w-full flex items-center justify-between px-4 py-2 text-slate-500 hover:text-slate-300 transition-colors"
          >
            <span className="text-xs font-semibold uppercase tracking-wider">System</span>
            {expandedSections.system ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>

          {expandedSections.system && (
            <div className="mt-1 space-y-0.5 px-3">
              {/* Admin Only: Edge Management (Consolidated) */}
              {canAccessMLOps && (
                <>
                  <button
                    onClick={() => setActiveTab('edge')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${activeTab === 'edge'
                      ? 'bg-slate-800 text-emerald-400 border-l-2 border-emerald-400'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                      }`}
                  >
                    <Wifi className="w-4 h-4" />
                    <span className="text-sm">Edge Management</span>
                  </button>
                </>
              )}

              {/* Instructor+ : Course & Students, Rubrics */}
              {canCreateEvaluation && (
                <>
                  <button
                    onClick={() => setActiveTab('courses')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${activeTab === 'courses'
                      ? 'bg-slate-800 text-emerald-400 border-l-2 border-emerald-400'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                      }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span className="text-sm">Course & Students</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('rubrics')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${activeTab === 'rubrics'
                      ? 'bg-slate-800 text-emerald-400 border-l-2 border-emerald-400'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                      }`}
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    <span className="text-sm">Assessment Rubrics</span>
                  </button>
                </>
              )}

              {/* Admin Only: User Management */}
              {canManageUsers && (
                <>
                  <button
                    onClick={() => setActiveTab('users')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${activeTab === 'users'
                      ? 'bg-slate-800 text-emerald-400 border-l-2 border-emerald-400'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                      }`}
                  >
                    <Shield className="w-4 h-4" />
                    <span className="text-sm">User Management</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Help & Documentation */}
        <div className="mb-2">
          <div className="px-3 mt-4">
            <button
              onClick={() => setActiveTab('help')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${activeTab === 'help'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
            >
              <BookOpen className="w-5 h-5" />
              <span className="font-medium text-sm">Guide & Help</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Footer - User Info & Logout */}
      <div className="p-4 border-t border-slate-800">
        {/* User Info */}
        <div className="bg-slate-800/50 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.name || user?.username}</p>
              <p className="text-slate-500 text-xs capitalize">{user?.role}</p>
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white py-2 rounded-lg transition-colors mb-4"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm">Logout</span>
        </button>

        {/* System Version */}
        <div className="text-center flex items-center justify-center gap-1.5">
          <span className="text-[10px] font-medium text-slate-600 bg-slate-800/30 px-2 py-0.5 rounded-full border border-slate-800/50 uppercase tracking-widest">
            v{version}
          </span>
          {updateAvailable && (
            <span className="relative flex h-2 w-2" title="New version available">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          )}
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
