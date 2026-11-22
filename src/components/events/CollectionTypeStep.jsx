import React from 'react';
import { Plane, MapPin, Calendar, Sun, Sparkles, Check, ChevronRight } from 'lucide-react';

export const COLLECTION_TYPES = [
  {
    id: 'trip',
    title: 'Trip',
    subtitle: 'Multi-day journey, day-by-day story & replay route on map',
    icon: Plane,
    badge: 'Multi-Day',
    available: true,
    color: 'text-pinpic-coral dark:text-pinpic-coral-dark',
    bgColor: 'bg-pinpic-coral/10 dark:bg-pinpic-coral-dark/10',
    borderColor: 'border-pinpic-coral dark:border-pinpic-coral-dark',
  },
  {
    id: 'visit',
    title: 'Visit',
    subtitle: 'A memory with people, earlier visits link & area focus (no path)',
    icon: MapPin,
    badge: 'Destination',
    available: true,
    color: 'text-pinpic-teal dark:text-pinpic-teal-dark',
    bgColor: 'bg-pinpic-teal/10 dark:bg-pinpic-teal-dark/10',
    borderColor: 'border-pinpic-teal dark:border-pinpic-teal-dark',
  },
  {
    id: 'event',
    title: 'Event',
    subtitle: 'Weddings, fests, birthdays grouped by time of day (morning, ceremony, evening)',
    icon: Calendar,
    badge: 'Occasion',
    available: true,
    color: 'text-purple-500 dark:text-purple-400',
    bgColor: 'bg-purple-500/10 dark:bg-purple-400/10',
    borderColor: 'border-purple-500 dark:border-purple-400',
  },
  {
    id: 'day_out',
    title: 'Day Out',
    subtitle: 'Single day in the city with stops (cafe, mall, walk) and local route',
    icon: Sun,
    badge: 'Single Day',
    available: true,
    color: 'text-amber-500 dark:text-amber-400',
    bgColor: 'bg-amber-500/10 dark:bg-amber-400/10',
    borderColor: 'border-amber-500 dark:border-amber-400',
  },
  {
    id: 'custom',
    title: 'Custom',
    subtitle: 'Freeform collection from anywhere, any city or month (no route assumptions)',
    icon: Sparkles,
    badge: 'Freeform',
    available: true,
    color: 'text-blue-500 dark:text-blue-400',
    bgColor: 'bg-blue-500/10 dark:bg-blue-400/10',
    borderColor: 'border-blue-500 dark:border-blue-400',
  },
];

export const CollectionTypeStep = ({ selectedType, onSelectType, onNext }) => {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark">
          Select Collection Type
        </h3>
        <p className="text-xs text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark mt-1">
          Choose how you want your photos and map experience structured.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 max-h-[55vh] overflow-y-auto pr-1">
        {COLLECTION_TYPES.map((type) => {
          const Icon = type.icon;
          const isSelected = selectedType === type.id;

          return (
            <div
              key={type.id}
              onClick={() => onSelectType(type.id)}
              className={`relative flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer select-none hover:shadow-md ${
                isSelected
                  ? 'border-pinpic-coral dark:border-pinpic-coral-dark bg-pinpic-coral/5 dark:bg-pinpic-coral-dark/5 shadow-sm ring-1 ring-pinpic-coral/20'
                  : 'border-pinpic-border-light dark:border-pinpic-outline-dark bg-pinpic-surface-light dark:bg-pinpic-surface-container-dark hover:border-pinpic-coral/50'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${type.bgColor}`}>
                  <Icon className={`w-5 h-5 ${type.color}`} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark">
                      {type.title}
                    </span>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark"
                    >
                      {type.badge}
                    </span>
                  </div>
                  <p className="text-xs text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark mt-0.5 line-clamp-1">
                    {type.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center ml-3 flex-shrink-0">
                {isSelected ? (
                  <div className="w-6 h-6 rounded-full bg-pinpic-coral dark:bg-pinpic-coral-dark flex items-center justify-center text-white">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border border-pinpic-border-light dark:border-pinpic-outline-dark" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-2 flex justify-end">
        <button
          onClick={onNext}
          disabled={!selectedType}
          className="px-6 py-2.5 rounded-full font-semibold text-sm bg-pinpic-coral dark:bg-pinpic-coral-dark text-white hover:opacity-95 transition-all shadow-md active:scale-95 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>Continue to Select Photos</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default CollectionTypeStep;
