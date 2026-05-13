import React, { useState, useEffect, FC, ChangeEvent, FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import authAPI from '../services/authAPI'
import {
  Cpu,
  UserPlus,
  User,
  Lock,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  GraduationCap,
  BookOpen,
  ChevronDown,
  X,
} from 'lucide-react'

interface ClassInfo {
  id: number
  name: string
  semester?: string
}

interface RegisterModalProps {
  isOpen: boolean
  onClose: () => void
}

const RegisterModal: FC<RegisterModalProps> = ({ isOpen, onClose }) => {
  const { register, loading, error, clearError } = useAuth()

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
    password_confirm: '',
    role: 'student' as 'student' | 'instructor',
    class_id: '',
  })
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [loadingClasses, setLoadingClasses] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState('')
  const [success, setSuccess] = useState(false)
  const [registeredRole, setRegisteredRole] = useState<'student' | 'instructor'>('student')

  useEffect(() => {
    if (isOpen) {
      loadClasses()
      setFormData({
        username: '', email: '', full_name: '', password: '',
        password_confirm: '', role: 'student', class_id: '',
      })
      setLocalError('')
      setSuccess(false)
      clearError()
    }
  }, [isOpen])

  const loadClasses = async () => {
    setLoadingClasses(true)
    try {
      const data = await authAPI.getAvailableClasses()
      setClasses(data)
    } catch (err) {
      console.error('Failed to load classes:', err)
    } finally {
      setLoadingClasses(false)
    }
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLocalError('')
    clearError()

    if (!formData.full_name.trim()) { setLocalError('Full name is required'); return }
    if (!formData.username.trim()) {
      setLocalError(formData.role === 'student' ? 'Matric number is required' : 'Staff ID is required')
      return
    }
    if (formData.role === 'instructor' && !/^\d{4}$/.test(formData.username.trim())) {
      setLocalError('Staff ID must be exactly 4 digits (e.g., 1891)'); return
    }
    if (formData.role === 'student' && !/^[A-Za-z0-9]{5,}$/.test(formData.username.trim())) {
      setLocalError('Matric number must be alphanumeric with at least 5 characters (e.g., 05DKM23F2014)'); return
    }
    if (formData.role === 'student' && !formData.class_id) {
      setLocalError('Students must select a class'); return
    }
    if (!formData.password) { setLocalError('PIN is required'); return }
    if (!/^\d{4}$/.test(formData.password)) { setLocalError('PIN must be exactly 4 numeric digits'); return }
    if (formData.password !== formData.password_confirm) { setLocalError('PINs do not match'); return }

    try {
      const dataToSubmit = { ...formData, class_id: formData.class_id ? parseInt(formData.class_id) : null }
      await register(dataToSubmit)
      setRegisteredRole(formData.role)
      setSuccess(true)
    } catch (err: any) {
      setLocalError(err.message)
    }
  }

  if (!isOpen) return null

  const displayError = localError || error

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md my-4 relative">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Create Account</h2>
              <p className="text-xs text-slate-400">Register for WeldVision X5</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {success ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Registration Successful!</h3>
              <p className="text-slate-300 mb-4 text-sm">
                {registeredRole === 'student'
                  ? 'Your student account has been created. You can now log in with your matric number and PIN.'
                  : 'Your account has been created and is pending approval by an administrator.'}
              </p>
              <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-3 mb-6">
                <p className="text-blue-300 text-sm">
                  {registeredRole === 'student'
                    ? 'Log in using your matric number and 4-digit PIN.'
                    : "You'll be able to log in once an administrator approves your account."}
                </p>
              </div>
              <button
                onClick={onClose}
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white px-6 py-3 rounded-lg font-semibold transition-all"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {displayError && (
                <div className="flex items-start gap-3 bg-red-900/20 border border-red-600/30 rounded-lg p-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-300 text-sm whitespace-pre-line">{displayError}</p>
                </div>
              )}

              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">I am a...</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, role: 'student' }))}
                    className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                      formData.role === 'student'
                        ? 'bg-emerald-600/20 border-emerald-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span className="font-medium text-sm">Student</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, role: 'instructor' }))}
                    className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                      formData.role === 'instructor'
                        ? 'bg-blue-600/20 border-blue-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span className="font-medium text-sm">Instructor</span>
                  </button>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors text-sm"
                    placeholder="Enter your full name"
                    disabled={loading}
                    autoComplete="name"
                  />
                </div>
              </div>

              {/* Matric / Staff ID */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  {formData.role === 'student' ? 'Matric Number' : 'Staff ID'} *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors text-sm"
                    placeholder={formData.role === 'student' ? 'e.g., 05DKM23F2014' : 'e.g., 1891'}
                    disabled={loading}
                    autoComplete="username"
                  />
                </div>
                <p className="text-slate-500 text-xs mt-1">
                  {formData.role === 'student' ? 'Alphanumeric, min 5 chars' : '4-digit staff ID'}
                </p>
              </div>

              {/* Class (students only) */}
              {formData.role === 'student' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Select Your Class *</label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <select
                      name="class_id"
                      aria-label="Select Your Class"
                      value={formData.class_id}
                      onChange={handleChange}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 pl-10 pr-8 text-white appearance-none focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors text-sm"
                      disabled={loading || loadingClasses}
                    >
                      <option value="">-- Select a class --</option>
                      {classes.map(cls => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}{cls.semester ? ` (${cls.semester})` : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  </div>
                  {!loadingClasses && classes.length === 0 && (
                    <p className="text-amber-400 text-xs mt-1">No classes available. Contact your administrator.</p>
                  )}
                </div>
              )}

              {/* PIN */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">PIN (4 Digits) *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={4}
                    pattern="\d{4}"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 pl-10 pr-10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors text-sm"
                    placeholder="Enter 4-digit PIN"
                    disabled={loading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm PIN */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Confirm PIN *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={4}
                    pattern="\d{4}"
                    name="password_confirm"
                    value={formData.password_confirm}
                    onChange={handleChange}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors text-sm"
                    placeholder="Repeat your PIN"
                    disabled={loading}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" />Creating account...</>
                ) : (
                  <><UserPlus className="w-5 h-5" />Create Account</>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default RegisterModal
