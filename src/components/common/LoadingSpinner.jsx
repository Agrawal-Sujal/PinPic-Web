import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner = ({ text = 'Loading...', size = 'md' }) => {
  const sizeMap = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 gap-3">
      <Loader2 className={`${sizeMap[size] || sizeMap.md} animate-spin text-pinpic-coral`} />
      {text && (
        <p className="text-sm font-medium text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;

