import { useState } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom'
import {
  Upload,
  Image,
  Database,
  BarChart3,
  Tag,
  Rocket,
  Sliders,
  ChevronDown,
  ChevronRight,
  Monitor,
  Cpu,
  Users,
  Wifi,
  ClipboardCheck,
  BookOpen,
  Home,
  LogOut,
  User,
  Shield,
  Loader2,
  History as HistoryIcon
} from 'lucide-react'

// Components
import Dashboard from './components/Dashboard'
import MLOps from './components/MLOps'
import EdgeManagement from './components/EdgeManagement'
import Labeling from './components/Labeling'
import Analytics from './components/Analytics'
import Rubrics from './components/Rubrics'
import Settings from './components/Settings'
import Help from './components/Help'
import LandingPage from './components/LandingPage'
import Login from './components/Login'
import Register from './components/Register'
import UserManagement from './components/UserManagement'
import CourseManagement from './components/CourseManagement'
import History from './components/History'

// Auth Context
import { AuthProvider, useAuth } from './context/AuthContext'

// Protected Route Component
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

function MainApp() {
  const navigate = useNavigate()
  const { user, logout, permissions } = useAuth()

  const [activeTab, setActiveTab] = useState('dashboard')
  const [expandedSections, setExpandedSections] = useState({
    mlops: true,
    system: false
  })

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  // Role-based access
  const canAccessMLOps = permissions.can_access_mlops
  const canManageUsers = permissions.can_manage_users
  const canCreateEvaluation = permissions.can_create_evaluation
  const isStudent = permissions.is_student

  return (
    <div className="flex h-screen bg-slate-950">
      {/* Professional Sidebar */}
      <aside className="w-56 bg-slate-900 border-r border-slate-800 flex flex-col">
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
                <span className="text-xs font-semibold uppercase tracking-wider">MLOps Studio</span>
                {expandedSections.mlops ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {expandedSections.mlops && (
                <div className="mt-1 space-y-0.5 px-3">
                  {/* DATA Subsection */}
                  <div className="py-2">
                    <p className="px-3 text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Data</p>

                    <button
                      onClick={() => setActiveTab('upload')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${activeTab === 'upload'
                        ? 'bg-slate-800 text-emerald-400 border-l-2 border-emerald-400'
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                        }`}
                    >
                      <Upload className="w-4 h-4" />
                      <span className="text-sm">Upload Data</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('annotate')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${activeTab === 'annotate'
                        ? 'bg-slate-800 text-emerald-400 border-l-2 border-emerald-400'
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                        }`}
                    >
                      <Image className="w-4 h-4" />
                      <span className="text-sm">Annotate</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('datasets')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${activeTab === 'datasets'
                        ? 'bg-slate-800 text-emerald-400 border-l-2 border-emerald-400'
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                        }`}
                    >
                      <Database className="w-4 h-4" />
                      <span className="text-sm">Datasets</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('analytics')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${activeTab === 'analytics'
                        ? 'bg-slate-800 text-emerald-400 border-l-2 border-emerald-400'
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                        }`}
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span className="text-sm">Analytics</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('classes')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${activeTab === 'classes'
                        ? 'bg-slate-800 text-emerald-400 border-l-2 border-emerald-400'
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                        }`}
                    >
                      <Tag className="w-4 h-4" />
                      <span className="text-sm">Classes & Tags</span>
                    </button>
                  </div>

                  {/* MODEL PIPELINE Subsection - Admin Only */}
                  {canAccessMLOps && (
                    <div className="py-2 border-t border-slate-800">
                      <p className="px-3 text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Model Pipeline</p>

                      <button
                        onClick={() => setActiveTab('mlops')}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${activeTab === 'mlops'
                          ? 'bg-slate-800 text-emerald-400 border-l-2 border-emerald-400'
                          : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                          }`}
                      >
                        <Rocket className="w-4 h-4" />
                        <span className="text-sm">Train → Convert → Deploy</span>
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
                {/* Admin Only: Calibration & Edge */}
                {canAccessMLOps && (
                  <>
                    <button
                      onClick={() => setActiveTab('calibration')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${activeTab === 'calibration'
                        ? 'bg-slate-800 text-emerald-400 border-l-2 border-emerald-400'
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                        }`}
                    >
                      <Sliders className="w-4 h-4" />
                      <span className="text-sm">Stereo Calibration</span>
                    </button>

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
                <p className="text-white text-sm font-medium truncate">{user?.username}</p>
                <p className="text-slate-500 text-xs capitalize">{user?.role}</p>
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white py-2 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-slate-950">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'upload' && <Labeling initialView="upload" />}
        {activeTab === 'annotate' && <Labeling initialView="annotate" />}
        {activeTab === 'datasets' && <Labeling initialView="datasets" />}
        {activeTab === 'analytics' && <Analytics />}
        {activeTab === 'classes' && <Labeling initialView="classes" />}
        {activeTab === 'mlops' && canAccessMLOps && <MLOps />}
        {activeTab === 'calibration' && canAccessMLOps && <Settings />}

        {/* Course & Student Management */}
        {activeTab === 'courses' && (canManageUsers || canCreateEvaluation) && <CourseManagement />}

        {/* Other Components */}
        {activeTab === 'rubrics' && canCreateEvaluation && <Rubrics />}
        {activeTab === 'history' && <History />}
        {activeTab === 'edge' && canAccessMLOps && <EdgeManagement />}
        {activeTab === 'users' && canManageUsers && <UserManagement />}
        {activeTab === 'help' && <Help />}
      </main>
    </div >
  )
}

function LandingWrapper() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  const handleEnterApp = () => {
    if (isAuthenticated) {
      navigate('/app')
    } else {
      navigate('/login')
    }
  }

  return <LandingPage onEnterApp={handleEnterApp} />
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<LandingWrapper />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/app/*" element={
            <ProtectedRoute>
              <MainApp />
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
