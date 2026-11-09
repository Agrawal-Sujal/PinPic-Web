import React, { useState } from 'react';
import { X, Clock as ClockIcon } from 'lucide-react';

/**
 * Clean 12-hour Time Picker modal following PinPic-Web design system.
 * Returns time in 'hh:mm a' format (e.g. '03:45 PM').
 */
export const TimePickerModal = ({ isOpen, onClose, initialTime, onSelectTime }) => {
  // Parse initialTime (expected 'hh:mm a' or 'HH:mm' or current time)
  const parseInitialTime = () => {
    const now = new Date();
    let defaultHour = now.getHours();
    let defaultMinute = now.getMinutes();
    let defaultPeriod = defaultHour >= 12 ? 'PM' : 'AM';

    defaultHour = defaultHour % 12 || 12;

    if (initialTime) {
      const match12 = initialTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
      if (match12) {
        let h = parseInt(match12[1], 10);
        let m = parseInt(match12[2], 10);
        let p = match12[3] ? match12[3].toUpperCase() : defaultPeriod;
        return { hour: Math.max(1, Math.min(12, h)), minute: Math.max(0, Math.min(59, m)), period: p };
      }
    }

    return { hour: defaultHour, minute: defaultMinute, period: defaultPeriod };
  };

  const [time, setTime] = useState(() => parseInitialTime());
  const [activeUnit, setActiveUnit] = useState('hour'); // 'hour' | 'minute'

  if (!isOpen) return null;

  const handleHourChange = (newHour) => {
    setTime((prev) => ({ ...prev, hour: newHour }));
    setActiveUnit('minute'); // Auto advance to minutes
  };

  const handleMinuteChange = (newMinute) => {
    setTime((prev) => ({ ...prev, minute: newMinute }));
  };

  const togglePeriod = (p) => {
    setTime((prev) => ({ ...prev, period: p }));
  };

  const setNow = () => {
    const now = new Date();
    let h = now.getHours();
    const m = now.getMinutes();
    const p = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    setTime({ hour: h, minute: m, period: p });
  };

  const handleConfirm = () => {
    const hh = String(time.hour).padStart(2, '0');
    const mm = String(time.minute).padStart(2, '0');
    const formatted = `${hh}:${mm} ${time.period}`;
    onSelectTime(formatted);
    onClose();
  };

  const hours = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const commonMinutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-sm bg-pinpic-surface-light dark:bg-pinpic-surface-container-dark rounded-3xl border border-pinpic-border-light dark:border-pinpic-outline-dark shadow-2xl p-5 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-pinpic-border-light dark:border-pinpic-outline-dark">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-pinpic-coral/10 text-pinpic-coral">
              <ClockIcon className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark">
              Select Time
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-pinpic-text-secondary-light"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Digital Time Display Banner */}
        <div className="flex items-center justify-center gap-2 my-4 p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04]">
          <button
            type="button"
            onClick={() => setActiveUnit('hour')}
            className={`px-3 py-2 rounded-xl text-3xl font-extrabold transition-all ${
              activeUnit === 'hour'
                ? 'bg-pinpic-coral text-white shadow-md shadow-pinpic-coral/30'
                : 'text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            {String(time.hour).padStart(2, '0')}
          </button>

          <span className="text-2xl font-bold text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark">
            :
          </span>

          <button
            type="button"
            onClick={() => setActiveUnit('minute')}
            className={`px-3 py-2 rounded-xl text-3xl font-extrabold transition-all ${
              activeUnit === 'minute'
                ? 'bg-pinpic-coral text-white shadow-md shadow-pinpic-coral/30'
                : 'text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            {String(time.minute).padStart(2, '0')}
          </button>

          <div className="flex flex-col gap-1 ml-2">
            {['AM', 'PM'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => togglePeriod(p)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  time.period === p
                    ? 'bg-pinpic-coral text-white shadow-sm'
                    : 'bg-white dark:bg-pinpic-surface-dark border border-pinpic-border-light dark:border-pinpic-outline-dark text-pinpic-text-secondary-light hover:text-pinpic-text-primary-light dark:hover:text-pinpic-text-primary-dark'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Unit Selector (Hours or Minutes Grid) */}
        <div className="py-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark">
              {activeUnit === 'hour' ? 'Choose Hour' : 'Choose Minute'}
            </span>
            <button
              type="button"
              onClick={setNow}
              className="text-[11px] font-semibold text-pinpic-coral hover:underline"
            >
              Current Time
            </button>
          </div>

          {activeUnit === 'hour' ? (
            <div className="grid grid-cols-4 gap-2">
              {hours.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => handleHourChange(h)}
                  className={`h-10 rounded-xl text-sm font-semibold transition-all ${
                    time.hour === h
                      ? 'bg-pinpic-coral text-white font-bold shadow-md shadow-pinpic-coral/25'
                      : 'bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/5 dark:hover:bg-white/5 text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark border border-pinpic-border-light dark:border-pinpic-outline-dark'
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2">
                {commonMinutes.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleMinuteChange(m)}
                    className={`h-10 rounded-xl text-sm font-semibold transition-all ${
                      time.minute === m
                        ? 'bg-pinpic-coral text-white font-bold shadow-md shadow-pinpic-coral/25'
                        : 'bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/5 dark:hover:bg-white/5 text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark border border-pinpic-border-light dark:border-pinpic-outline-dark'
                    }`}
                  >
                    {String(m).padStart(2, '0')}
                  </button>
                ))}
              </div>

              {/* Slider for exact minute */}
              <div className="pt-2 px-1">
                <div className="flex items-center justify-between text-xs text-pinpic-text-secondary-light mb-1">
                  <span>Exact minute:</span>
                  <span className="font-bold text-pinpic-coral">{time.minute}m</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="59"
                  value={time.minute}
                  onChange={(e) => handleMinuteChange(parseInt(e.target.value, 10))}
                  className="w-full accent-pinpic-coral cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-4 mt-2 border-t border-pinpic-border-light dark:border-pinpic-outline-dark">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl text-pinpic-text-secondary-light hover:bg-black/5 dark:hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-pinpic-coral text-white hover:bg-pinpic-coral/95 shadow-md shadow-pinpic-coral/20 active:scale-95 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimePickerModal;
