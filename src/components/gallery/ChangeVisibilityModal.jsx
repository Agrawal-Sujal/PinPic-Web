import React, { useState } from 'react';
import { X, Lock, Users, Globe } from 'lucide-react';

export const ChangeVisibilityModal = ({
  isOpen,
  selectedCount = 1,
  initialVisibility = 'PUBLIC',
  onClose,
  onApply,
}) => {
  const [selectedVisibility, setSelectedVisibility] = useState(initialVisibility);

  if (!isOpen) return null;

  const options = [
    {
      id: 'PRIVATE',
      title: 'Make Private',
      subtitle: 'Only you can see these photos',
      icon: Lock,
      color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900',
    },
    {
      id: 'FRIENDS',
      title: 'Share with Friends',
      subtitle: 'Visible to your followers and friends',
      icon: Users,
      color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900',
    },
    {
      id: 'PUBLIC',
      title: 'Make Public',
      subtitle: 'Visible to everyone on PinPic',
      icon: Globe,
      color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in">
      <div className="w-full sm:max-w-md bg-pinpic-surface-light dark:bg-pinpic-surface-container-dark rounded-t-3xl sm:rounded-3xl border border-pinpic-border-light dark:border-pinpic-outline-dark shadow-2xl p-6 animate-in slide-in-from-bottom-5">
        <div className="flex items-center justify-between pb-3 border-b border-pinpic-border-light dark:border-pinpic-outline-dark">
          <div>
            <h3 className="font-bold text-lg text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark">
              Change Visibility
            </h3>
            <p className="text-xs text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark mt-0.5">
              Apply to {selectedCount} selected {selectedCount === 1 ? 'photo' : 'photos'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-pinpic-text-secondary-light"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 my-5">
          {options.map((opt) => {
            const Icon = opt.icon;
            const isSelected = selectedVisibility === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => setSelectedVisibility(opt.id)}
                className={`flex items-center gap-4 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-pinpic-coral bg-pinpic-coral/5 dark:bg-pinpic-coral/10 shadow-sm'
                    : 'border-pinpic-border-light dark:border-pinpic-outline-dark hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                }`}
              >
                <div className={`p-2.5 rounded-full border ${opt.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark">
                    {opt.title}
                  </h4>
                  <p className="text-xs text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark">
                    {opt.subtitle}
                  </p>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    isSelected
                      ? 'border-pinpic-coral bg-pinpic-coral'
                      : 'border-neutral-300 dark:border-neutral-600'
                  }`}
                >
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => onApply(selectedVisibility)}
          className="w-full py-3.5 rounded-2xl bg-pinpic-coral hover:bg-pinpic-coral/90 text-white font-bold text-sm shadow-lg shadow-pinpic-coral/25 active:scale-[0.98] transition-all"
        >
          Apply to {selectedCount} {selectedCount === 1 ? 'Photo' : 'Photos'}
        </button>
      </div>
    </div>
  );
};

export default ChangeVisibilityModal;

