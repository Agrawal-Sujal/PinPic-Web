import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapPin, Image, Search, MessageSquare, User } from 'lucide-react';

export const navItems = [
  { id: 'map', path: '/map', label: 'Map', icon: MapPin },
  { id: 'gallery', path: '/gallery', label: 'Gallery', icon: Image },
  { id: 'search', path: '/search', label: 'Search', icon: Search },
  { id: 'chat', path: '/chat', label: 'Chat', icon: MessageSquare },
  { id: 'profile', path: '/profile', label: 'Profile', icon: User },
];

export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Hide on certain subroutes if needed, or keep persistent
  const activeItem = navItems.find(item => location.pathname === item.path) || navItems[1];

  return (
    <div className="fixed bottom-5 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none">
      <nav
        aria-label="Main Navigation"
        className="pointer-events-auto flex items-center justify-between w-full max-w-sm h-16 px-5 rounded-full backdrop-blur-lg bg-pinpic-surface-light/95 dark:bg-pinpic-surface-container-dark/95 border border-pinpic-border-light/80 dark:border-pinpic-outline-dark/80 shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              aria-label={item.label}
              className={`relative flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all duration-200 active:scale-95 group ${
                isActive
                  ? 'text-pinpic-coral dark:text-pinpic-coral-dark'
                  : 'text-pinpic-text-secondary-light/70 dark:text-pinpic-text-secondary-dark/70 hover:text-pinpic-text-primary-light dark:hover:text-pinpic-text-primary-dark'
              }`}
            >
              <Icon
                className={`w-6 h-6 transition-transform duration-200 ${
                  isActive ? 'scale-110 stroke-[2.5]' : 'scale-100 stroke-[1.8] group-hover:scale-105'
                }`}
              />
              {isActive && (
                <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-pinpic-coral dark:bg-pinpic-coral-dark animate-in zoom-in-50" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default BottomNav;

