import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

/**
 * Clean Date Picker modal following PinPic-Web design system.
 * Returns date in DD/MM/YYYY format.
 */
export const DatePickerModal = ({ isOpen, onClose, initialDate, onSelectDate }) => {
  // Parse initialDate (expected DD/MM/YYYY or YYYY-MM-DD or Date)
  const parseInitialDate = () => {
    if (!initialDate) return new Date();
    if (initialDate instanceof Date) return initialDate;

    // Check DD/MM/YYYY
    const ddmmyyyy = initialDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyy) {
      const d = parseInt(ddmmyyyy[1], 10);
      const m = parseInt(ddmmyyyy[2], 10) - 1;
      const y = parseInt(ddmmyyyy[3], 10);
      return new Date(y, m, d);
    }

    const parsed = new Date(initialDate);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  };

  const [currentMonth, setCurrentMonth] = useState(() => parseInitialDate());
  const [selectedDay, setSelectedDay] = useState(() => parseInitialDate());

  if (!isOpen) return null;

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDay(today);
  };

  // Calendar calculations
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days = [];
  // Previous month trailing days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    days.push({
      day: daysInPrevMonth - i,
      month: month - 1,
      year: month === 0 ? year - 1 : year,
      isCurrentMonth: false,
    });
  }
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      day: i,
      month,
      year,
      isCurrentMonth: true,
    });
  }
  // Next month leading days to complete 35 or 42 grid cells
  const remaining = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    days.push({
      day: i,
      month: month + 1,
      year: month === 11 ? year + 1 : year,
      isCurrentMonth: false,
    });
  }

  const isToday = (d, m, y) => {
    const today = new Date();
    return today.getDate() === d && today.getMonth() === m && today.getFullYear() === y;
  };

  const isSelected = (d, m, y) => {
    return (
      selectedDay.getDate() === d &&
      selectedDay.getMonth() === m &&
      selectedDay.getFullYear() === y
    );
  };

  const handleConfirm = () => {
    const dd = String(selectedDay.getDate()).padStart(2, '0');
    const mm = String(selectedDay.getMonth() + 1).padStart(2, '0');
    const yyyy = selectedDay.getFullYear();
    const formatted = `${dd}/${mm}/${yyyy}`;
    onSelectDate(formatted);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-sm bg-pinpic-surface-light dark:bg-pinpic-surface-container-dark rounded-3xl border border-pinpic-border-light dark:border-pinpic-outline-dark shadow-2xl p-5 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-pinpic-border-light dark:border-pinpic-outline-dark">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-pinpic-coral/10 text-pinpic-coral">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark">
              Select Date
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-pinpic-text-secondary-light"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between py-3">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-pinpic-text-secondary-light transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark">
              {monthNames[month]} {year}
            </span>
            <button
              onClick={goToToday}
              className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-pinpic-coral/10 text-pinpic-coral hover:bg-pinpic-coral/20"
            >
              Today
            </button>
          </div>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-pinpic-text-secondary-light transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Days of Week */}
        <div className="grid grid-cols-7 text-center pb-2">
          {daysOfWeek.map((day, idx) => (
            <span
              key={idx}
              className="text-xs font-semibold text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark"
            >
              {day}
            </span>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {days.map((item, idx) => {
            const active = isSelected(item.day, item.month, item.year);
            const today = isToday(item.day, item.month, item.year);

            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setSelectedDay(new Date(item.year, item.month, item.day));
                  if (!item.isCurrentMonth) {
                    setCurrentMonth(new Date(item.year, item.month, 1));
                  }
                }}
                className={`h-9 w-9 mx-auto rounded-xl flex items-center justify-center text-xs font-medium transition-all ${
                  active
                    ? 'bg-pinpic-coral text-white font-bold shadow-md shadow-pinpic-coral/30 scale-105'
                    : today
                    ? 'border border-pinpic-coral text-pinpic-coral font-bold'
                    : item.isCurrentMonth
                    ? 'text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark hover:bg-black/5 dark:hover:bg-white/5'
                    : 'text-pinpic-text-secondary-light/40 dark:text-pinpic-text-secondary-dark/30'
                }`}
              >
                {item.day}
              </button>
            );
          })}
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

export default DatePickerModal;
