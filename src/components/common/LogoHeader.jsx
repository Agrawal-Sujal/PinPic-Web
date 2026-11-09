import React from 'react';

export const LogoHeader = ({ size = 'md', className = '' }) => {
  const sizeMap = {
    sm: { img: 'h-6 w-6', text: 'text-xl' },
    md: { img: 'h-8 w-8', text: 'text-2xl' },
    lg: { img: 'h-12 w-12', text: 'text-4xl' },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`inline-flex items-center justify-center gap-2 select-none ${className}`}>
      <img
        src="/app_logo.png"
        alt="PinPic Logo"
        className={`${currentSize.img} object-contain drop-shadow-sm`}
      />
      <div className={`font-extrabold tracking-tight ${currentSize.text}`}>
        <span className="text-pinpic-coral dark:text-pinpic-coral-dark">Pin</span>
        <span className="text-pinpic-teal dark:text-pinpic-teal-dark">Pic</span>
      </div>
    </div>
  );
};

export default LogoHeader;

