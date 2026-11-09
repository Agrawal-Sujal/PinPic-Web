import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import LogoHeader from '../../components/common/LogoHeader';

export const SignUp = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Please enter your name', 'error');
      return;
    }
    if (!email || !password) {
      showToast('Please fill all required fields', 'error');
      return;
    }
    if (password.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }
    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await register(name.trim(), email, password);
      showToast('Account created successfully!', 'success');
      navigate('/setup-username');
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data || 'Failed to create account';
      showToast(typeof errMsg === 'string' ? errMsg : 'Registration failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-pinpic-bg-light dark:bg-pinpic-bg-dark relative overflow-hidden">
      <div className="w-full max-w-md bg-pinpic-surface-light dark:bg-pinpic-surface-dark border border-pinpic-border-light dark:border-pinpic-outline-dark rounded-3xl p-8 sm:p-10 shadow-xl backdrop-blur-sm z-10">
        <div className="flex flex-col items-center mb-8">
          <LogoHeader size="lg" className="mb-3" />
          <p className="text-sm text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark text-center font-medium">
            Turn your camera roll into an interactive map
          </p>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark">
            Create Account
          </h1>
          <p className="text-sm text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark mt-1">
            Join PinPic and start pinning your memories
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark mb-1.5">
              Full Name
            </label>
            <div className="relative flex items-center">
              <User className="absolute left-3.5 w-5 h-5 text-pinpic-text-secondary-light/60 dark:text-pinpic-text-secondary-dark/60 pointer-events-none" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                required
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-pinpic-surface-container-dark border border-pinpic-border-light dark:border-pinpic-outline-dark text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark placeholder:text-pinpic-text-secondary-light/50 focus:outline-none focus:ring-2 focus:ring-pinpic-coral transition-all text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark mb-1.5">
              Email
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 w-5 h-5 text-pinpic-text-secondary-light/60 dark:text-pinpic-text-secondary-dark/60 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-pinpic-surface-container-dark border border-pinpic-border-light dark:border-pinpic-outline-dark text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark placeholder:text-pinpic-text-secondary-light/50 focus:outline-none focus:ring-2 focus:ring-pinpic-coral transition-all text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark mb-1.5">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 w-5 h-5 text-pinpic-text-secondary-light/60 dark:text-pinpic-text-secondary-dark/60 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                className="w-full pl-11 pr-11 py-3 rounded-2xl bg-white dark:bg-pinpic-surface-container-dark border border-pinpic-border-light dark:border-pinpic-outline-dark text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark placeholder:text-pinpic-text-secondary-light/50 focus:outline-none focus:ring-2 focus:ring-pinpic-coral transition-all text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 p-1 text-pinpic-text-secondary-light/70 dark:text-pinpic-text-secondary-dark/70 hover:text-pinpic-text-primary-light"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark mb-1.5">
              Confirm Password
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 w-5 h-5 text-pinpic-text-secondary-light/60 dark:text-pinpic-text-secondary-dark/60 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                required
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-pinpic-surface-container-dark border border-pinpic-border-light dark:border-pinpic-outline-dark text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark placeholder:text-pinpic-text-secondary-light/50 focus:outline-none focus:ring-2 focus:ring-pinpic-coral transition-all text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-3 py-3.5 px-4 rounded-2xl bg-pinpic-coral hover:bg-pinpic-coral/90 text-white font-semibold text-sm shadow-md shadow-pinpic-coral/25 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {submitting ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-bold text-pinpic-coral dark:text-pinpic-coral-dark hover:underline ml-1"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;

