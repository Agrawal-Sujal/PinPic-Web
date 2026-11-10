import React from 'react';
import { Loader2 } from 'lucide-react';

export const ImportProgressModal = ({
  isOpen,
  current = 0,
  total = 0,
}) => {
  if (!isOpen) return null;

  const percentage = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-pinpic-surface-light dark:bg-pinpic-surface-container-dark rounded-3xl border border-pinpic-border-light dark:border-pinpic-outline-dark shadow-2xl p-6 flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200">
        
        {/* Animated Spinner Icon */}
        <div className="p-3.5 rounded-full bg-pinpic-coral/10 text-pinpic-coral">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>

        {/* Title */}
        <div className="text-center">
          <h3 className="font-bold text-lg text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark">
            Importing Photos
          </h3>
          <p className="text-xs text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark mt-1">
            Detecting GPS locations and preparing photos...
          </p>
        </div>

        {/* Progress Bar & Counter */}
        {total > 0 && (
          <div className="w-full space-y-2 mt-1">
            <div className="w-full h-2.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-pinpic-coral rounded-full transition-all duration-300 ease-out"
                style={{ width: `${percentage}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark font-medium">
              <span>
                Importing {current} of {total}
              </span>
              <span className="font-bold text-pinpic-coral">
                {percentage}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportProgressModal;
