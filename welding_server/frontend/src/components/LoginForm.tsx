import React, { useState, FC, ChangeEvent, FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import authAPI from '../services/authAPI'
import { Eye, EyeOff, LogIn, KeyRound, X } from 'lucide-react'

interface LoginFormProps {
  onSuccess: () => void
  onOpenRegister: () => void
}

const LoginForm: FC<LoginFormProps> = ({ onSuccess, onOpenRegister }) => {
  const [formData, setFormData] = useState({ identifier: '', pin: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setCurrentUser } = useAuth()

  // Forgot password modal
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotUsername, setForgotUsername] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotMessage, setForgotMessage] = useState({ type: '', text: '' })

  // Force change password modal
  const [showForceChangePassword, setShowForceChangePassword] = useState(false)
  const [changePasswordData, setChangePasswordData] = useState({ newPassword: '', confirmPassword: '' })
  const [changeLoading, setChangeLoading] = useState(false)
  const [changeError, setChangeError] = useState('')

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const response = await authAPI.login(formData)
      if (response.user.must_change_password) {
        setShowForceChangePassword(true)
        setLoading(false)
        return
      }
      setCurrentUser(response.user)
      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault()
    setForgotLoading(true)
    setForgotMessage({ type: '', text: '' })
    try {
      await authAPI.forgotPin(forgotUsername)
      setForgotMessage({ type: 'success', text: 'If your ID is registered, your PIN has been reset to your registration number.' })
      setForgotUsername('')
    } catch (err: any) {
      setForgotMessage({ type: 'error', text: err.message || 'PIN reset failed.' })
    } finally {
      setForgotLoading(false)
    }
  }

  const handleForceChangePassword = async (e: FormEvent) => {
    e.preventDefault()
    setChangeLoading(true)
    setChangeError('')
    if (changePasswordData.newPassword !== changePasswordData.confirmPassword) {
      setChangeError('Passwords do not match')
      setChangeLoading(false)
      return
    }
    if (changePasswordData.newPassword.length !== 4) {
      setChangeError('PIN must be exactly 4 digits')
      setChangeLoading(false)
      return
    }
    try {
      const response = await authAPI.forceChangePassword(
        changePasswordData.newPassword,
        changePasswordData.confirmPassword
      )
      setCurrentUser(response.user)
      onSuccess()
    } catch (err: any) {
      setChangeError(err.message || 'Password change failed.')
    } finally {
      setChangeLoading(false)
    }
  }

  const closeForgotPasswordModal = () => {
    setShowForgotPassword(false)
    setForgotUsername('')
    setForgotMessage({ type: '', text: '' })
  }

  return (
    <>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8">
        <h3 className="text-xl font-bold text-white mb-6">Sign In</h3>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-900/20 border border-red-600/30 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="lf-identifier" className="block text-sm font-medium text-slate-300 mb-2">
              ID / Registration Number
            </label>
            <input
              id="lf-identifier"
              name="identifier"
              type="text"
              required
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              placeholder="Enter your ID or registration number"
              value={formData.identifier}
              onChange={handleChange}
            />
          </div>

          <div>
            <label htmlFor="lf-pin" className="block text-sm font-medium text-slate-300 mb-2">
              PIN (4 Digits)
            </label>
            <div className="relative">
              <input
                id="lf-pin"
                name="pin"
                type={showPassword ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={4}
                pattern="\d{4}"
                required
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all pr-12"
                placeholder="Enter 4-digit PIN"
                value={formData.pin}
                onChange={handleChange}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-800 text-center">
          <p className="text-slate-400 text-sm">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={onOpenRegister}
              className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
            >
              Sign up
            </button>
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-600/20 rounded-lg flex items-center justify-center">
                  <KeyRound className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Forgot Password</h3>
              </div>
              <button
                onClick={closeForgotPasswordModal}
                aria-label="Close"
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-blue-900/20 border border-blue-600/30 text-blue-300 px-4 py-3 rounded-lg mb-4 text-sm">
              <p>Enter your ID or registration number. Your PIN will be reset to your ID.</p>
            </div>

            {forgotMessage.text && (
              <div className={`px-4 py-3 rounded-lg mb-4 text-sm ${
                forgotMessage.type === 'success'
                  ? 'bg-emerald-900/20 border border-emerald-600/30 text-emerald-300'
                  : 'bg-red-900/20 border border-red-600/30 text-red-400'
              }`}>
                {forgotMessage.text}
              </div>
            )}

            <form onSubmit={handleForgotPassword}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  ID / Registration Number
                </label>
                <input
                  type="text"
                  value={forgotUsername}
                  onChange={(e) => setForgotUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Enter your ID or registration number"
                  required
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeForgotPasswordModal}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {forgotLoading ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Force Change Password Modal */}
      {showForceChangePassword && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-yellow-600/20 rounded-lg flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-yellow-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Change Your Password</h3>
            </div>
            <div className="bg-yellow-900/20 border border-yellow-600/30 text-yellow-300 px-4 py-3 rounded-lg mb-4 text-sm">
              <p>You are required to change your password before continuing. Please enter a new PIN.</p>
            </div>
            {changeError && (
              <div className="bg-red-900/20 border border-red-600/30 text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
                {changeError}
              </div>
            )}
            <form onSubmit={handleForceChangePassword}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">New PIN (4 Digits)</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  pattern="\d{4}"
                  value={changePasswordData.newPassword}
                  onChange={(e) => setChangePasswordData({ ...changePasswordData, newPassword: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Enter 4-digit new PIN"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">Confirm New PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  pattern="\d{4}"
                  value={changePasswordData.confirmPassword}
                  onChange={(e) => setChangePasswordData({ ...changePasswordData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Confirm 4-digit new PIN"
                  required
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={changeLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {changeLoading ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

export default LoginForm
