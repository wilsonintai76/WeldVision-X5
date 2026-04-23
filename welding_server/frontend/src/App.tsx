import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom'
import packageJson from '../package.json'
import {
  Loader2
} from 'lucide-react'
import AppLayout from './components/layout/AppLayout'

// Components
import Dashboard from './components/Dashboard'
import MLOps from './components/MLOps'
import EdgeManagement from './components/EdgeManagement'
import Rubrics from './components/Rubrics'
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
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
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

  return <>{children}</>
}

const MainApp: React.FC = () => {
  const { user, logout, permissions } = useAuth()
  const [activeTab, setActiveTab] = useState<string>('dashboard')

  // Role-based access
  const canAccessMLOps = permissions?.can_access_mlops
  const canManageUsers = permissions?.can_manage_users
  const canCreateEvaluation = permissions?.can_create_evaluation

  return (
    <AppLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      user={user}
      logout={logout}
      permissions={permissions}
      version={packageJson.version}
    >
      {activeTab === 'dashboard' && <Dashboard />}
      {activeTab === 'mlops' && canAccessMLOps && <MLOps />}
      
      {/* Course & Student Management */}
      {activeTab === 'courses' && (canManageUsers || canCreateEvaluation) && <CourseManagement />}
      
      {/* Other Components */}
      {activeTab === 'rubrics' && canCreateEvaluation && <Rubrics />}
      {activeTab === 'history' && <History />}
      {activeTab === 'edge' && canAccessMLOps && <EdgeManagement />}
      {activeTab === 'users' && canManageUsers && <UserManagement />}
      {activeTab === 'help' && <Help />}
    </AppLayout>
  )
}

const LandingWrapper: React.FC = () => {
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

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
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
