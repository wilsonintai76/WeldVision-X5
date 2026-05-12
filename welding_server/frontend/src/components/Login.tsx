import React, { useState, FC, ChangeEvent, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import authAPI from '../services/authAPI';
import { Eye, EyeOff, LogIn, KeyRound, X, ArrowLeft } from 'lucide-react';
import packageJson from '../../package.json';

const Login: FC = () => {
  const [formData, setFormData] = useState({
    identifier: '',
    pin: '',
  });
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();
  const { setCurrentUser } = useAuth();

  // Forgot password modal state
  const [showForgotPassword, setShowForgotPassword] = useState<boolean>(false);
  const [forgotUsername, setForgotUsername] = useState<string>('');
  const [forgotLoading, setForgotLoading] = useState<boolean>(false);
  const [forgotMessage, setForgotMessage] = useState<{ type: string; text: string }>({ type: '', text: '' });

  // Force change password modal state
  const [showForceChangePassword, setShowForceChangePassword] = useState<boolean>(false);
  const [changePasswordData, setChangePasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [changeLoading, setChangeLoading] = useState<boolean>(false);
  const [changeError, setChangeError] = useState<string>('');

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authAPI.login(formData);

      // Check if user must change password
      if (response.user.must_change_password) {
        setShowForceChangePassword(true);
        setLoading(false);
        return;
      }

      setCurrentUser(response.user);
      navigate('/app');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle forgot password
  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotMessage({ type: '', text: '' });

    try {
      await authAPI.forgotPin(forgotUsername);
      setForgotMessage({
        type: 'success',
        text: 'If your ID is registered, your PIN has been reset to your registration number.',
      });
      setForgotUsername('');
    } catch (err: any) {
      setForgotMessage({
        type: 'error',
        text: err.message || 'PIN reset failed.',
      });
    } finally {
      setForgotLoading(false);
    }
  };

  // Handle force change password
  const handleForceChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setChangeLoading(true);
    setChangeError('');

    if (changePasswordData.newPassword !== changePasswordData.confirmPassword) {
      setChangeError('Passwords do not match');
      setChangeLoading(false);
      return;
    }

    if (changePasswordData.newPassword.length !== 4) {
      setChangeError('PIN must be exactly 4 digits');
      setChangeLoading(false);
      return;
    }

    try {
      const response = await authAPI.forceChangePassword(
        changePasswordData.newPassword,
        changePasswordData.confirmPassword
      );

      // Session is established — just sync user state into React context
      setCurrentUser(response.user);
      navigate('/app');
    } catch (err: any) {
      setChangeError(err.message || 'Password change failed.');
    } finally {
      setChangeLoading(false);
    }
  };

  const closeForgotPasswordModal = () => {
    setShowForgotPassword(false);
    setForgotUsername('');
    setForgotMessage({ type: '', text: '' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      {/* Back to Landing Page */}
      <Link
        to="/"
        className="absolute top-6 left-6 flex items-center gap-2 text-slate-500 hover:text-white text-sm transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to Home
      </Link>
      <div className="max-w-md w-full">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white">
            WeldVision X5
          </h2>
          <div className="flex justify-center mt-2">
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-0.5 rounded-full tracking-widest uppercase">
              v{packageJson.version}
            </span>
          </div>
          <p className="mt-4 text-slate-400">
            Sign in to your account
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-900/20 border border-red-600/30 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="identifier" className="block text-sm font-medium text-slate-300 mb-2">
                ID / Registration Number
              </label>
              <input
                id="identifier"
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
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                PIN (4 Digits)
              </label>
              <div className="relative">
                <input
                  id="password"
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
                  Sign in
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800 text-center">
            <p className="text-slate-400 text-sm">
              Don't have an account?{' '}
              <Link 
                to="/register" 
                className="text-emerald-400 hover:text-emerald-300 font-medium"
              >
                Sign up
              </Link>
            </p>
          </div>
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
                <h3 className="text-lg font-semibold text-white">
                  Forgot Password
                </h3>
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
              <div className={`px-4 py-3 rounded-lg mb-4 text-sm ${forgotMessage.type === 'success'
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
              <h3 className="text-lg font-semibold text-white">
                Change Your Password
              </h3>
            </div>

            <div className="bg-yellow-900/20 border border-yellow-600/30 text-yellow-300 px-4 py-3 rounded-lg mb-4 text-sm">
              <p>You are required to change your password before continuing. Please enter a new password.</p>
            </div>

            {changeError && (
              <div className="bg-red-900/20 border border-red-600/30 text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
                {changeError}
              </div>
            )}

            <form onSubmit={handleForceChangePassword}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  New PIN (4 Digits)
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  pattern="\d{4}"
                  value={changePasswordData.newPassword}
                  onChange={(e) => setChangePasswordData({
                    ...changePasswordData,
                    newPassword: e.target.value
                  })}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Enter 4-digit new PIN"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Confirm New PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  pattern="\d{4}"
                  value={changePasswordData.confirmPassword}
                  onChange={(e) => setChangePasswordData({
                    ...changePasswordData,
                    confirmPassword: e.target.value
                  })}
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
    </div>
  );
}

export default Login


