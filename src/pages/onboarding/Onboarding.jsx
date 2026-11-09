import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import LogoHeader from '../../components/common/LogoHeader';

const pages = [
  {
    title: 'Welcome to PinPic',
    description: 'Every photo you take is automatically pinned to the place where it happened.\nTurn your memories into an interactive map.',
    imgLight: '/onboarding_camera_light.png',
    imgDark: '/onboarding_camera_dark.png',
  },
  {
    title: 'Rediscover\nEvery Moment',
    description: 'Browse your memories by location.\nTap any pin on the map to instantly revisit the photo you captured there.',
    imgLight: '/onboarding_map_light.png',
    imgDark: '/onboarding_map_dark.png',
  },
  {
    title: 'Share Without\nSwitching Apps',
    description: 'Send photos directly to your friends through built-in chat while keeping every memory linked to its location.',
    imgLight: '/onboarding_chat_light.png',
    imgDark: '/onboarding_chat_dark.png',
  },
];

export const Onboarding = () => {
  const [currentPage, setCurrentPage] = useState(0);
  const { completeOnboarding } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const handleFinish = () => {
    completeOnboarding();
    navigate('/map');
  };

  const handleNext = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(prev => prev + 1);
    } else {
      handleFinish();
    }
  };

  const current = pages[currentPage];

  return (
    <div className="min-h-screen flex flex-col justify-between items-center p-6 bg-pinpic-bg-light dark:bg-pinpic-bg-dark text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark select-none relative overflow-hidden">
      {/* Top Header */}
      <div className="w-full max-w-lg flex items-center justify-between pt-4">
        <LogoHeader size="sm" />
        <button
          onClick={handleFinish}
          className="text-sm font-semibold text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark hover:text-pinpic-coral transition-colors px-3 py-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
        >
          Skip
        </button>
      </div>

      {/* Main Slide Content */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-md w-full text-center py-6">
        <div className="relative w-64 h-64 sm:w-80 sm:h-80 mb-8 flex items-center justify-center">
          <img
            key={currentPage}
            src={isDark ? current.imgDark : current.imgLight}
            alt={current.title}
            className="w-full h-full object-contain animate-in fade-in zoom-in-95 duration-300 drop-shadow-md"
          />
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight whitespace-pre-line mb-3">
          {current.title}
        </h2>
        <p className="text-sm sm:text-base text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark whitespace-pre-line leading-relaxed max-w-sm">
          {current.description}
        </p>
      </div>

      {/* Footer Indicators and CTA */}
      <div className="w-full max-w-md flex flex-col items-center gap-6 pb-6">
        {/* Pager Dots */}
        <div className="flex items-center gap-2">
          {pages.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentPage(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                idx === currentPage
                  ? 'w-8 bg-pinpic-coral dark:bg-pinpic-coral-dark'
                  : 'w-2.5 bg-pinpic-border-light dark:bg-pinpic-outline-dark hover:bg-pinpic-text-secondary-light'
              }`}
            />
          ))}
        </div>

        {/* Continue / Get Started Button */}
        <button
          onClick={handleNext}
          className="w-full py-4 px-6 rounded-2xl bg-pinpic-coral hover:bg-pinpic-coral/90 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-pinpic-coral/25 active:scale-[0.98] transition-all"
        >
          <span>{currentPage === pages.length - 1 ? 'Get Started' : 'Continue'}</span>
          {currentPage === pages.length - 1 ? (
            <Check className="w-5 h-5 stroke-[2.5]" />
          ) : (
            <ArrowRight className="w-5 h-5 stroke-[2.5]" />
          )}
        </button>
      </div>
    </div>
  );
};

export default Onboarding;

