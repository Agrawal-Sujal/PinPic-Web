import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AtSign } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import LogoHeader from '../../components/common/LogoHeader';

export const UsernameSetup = () => {
  const [username, setUsernameInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { setUsername, hasCompletedOnboarding } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername) {
      showToast('Please enter a username', 'error');
      return;
    }
    if (cleanUsername.length < 3) {
      showToast('Username must be at least 3 characters', 'error');
      return;
    }
    if (!/^[a-z0-9_.-]+$/.test(cleanUsername)) {
      showToast('Username can only contain letters, numbers, and . _ -', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await setUsername(cleanUsername);
      showToast('Username set successfully!', 'success');
      if (!hasCompletedOnboarding) {
        navigate('/onboarding');
      } else {
        navigate('/map');
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data || 'Failed to set username';
      showToast(typeof errMsg === 'string' ? errMsg : 'Username might be taken', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-pinpic-bg-light dark:bg-pinpic-bg-dark relative overflow-hidden">
      <div className="w-full max-w-md bg-pinpic-surface-light dark:bg-pinpic-surface-dark border border-pinpic-border-light dark:border-pinpic-outline-dark rounded-3xl p-8 sm:p-10 shadow-xl backdrop-blur-sm z-10">
        <div className="flex flex-col items-center mb-8">
          <LogoHeader size="lg" className="mb-3" />
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark">
            Create your Username
          </h1>
          <p className="text-sm text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark mt-1">
            This is how your friends will see and find you on PinPic
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark mb-1.5">
              Username
            </label>
            <div className="relative flex items-center">
              <AtSign className="absolute left-3.5 w-5 h-5 text-pinpic-text-secondary-light/60 dark:text-pinpic-text-secondary-dark/60 pointer-events-none" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsernameInput(e.target.value.toLowerCase())}
                placeholder="yourname"
                required
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-pinpic-surface-container-dark border border-pinpic-border-light dark:border-pinpic-outline-dark text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark placeholder:text-pinpic-text-secondary-light/50 focus:outline-none focus:ring-2 focus:ring-pinpic-coral transition-all text-sm font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-3 py-3.5 px-4 rounded-2xl bg-pinpic-coral hover:bg-pinpic-coral/90 text-white font-semibold text-sm shadow-md shadow-pinpic-coral/25 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UsernameSetup;

