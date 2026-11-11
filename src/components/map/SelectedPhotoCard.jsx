import React from 'react';
import { X, MapPin, Calendar, Maximize2, Shield } from 'lucide-react';
import { format } from 'date-fns';

export const SelectedPhotoCard = ({ photo, onClose, onViewFull }) => {
  if (!photo) return null;

  const photoDate = photo.takenAt ? new Date(photo.takenAt) : null;
  const locationText = photo.location?.locationName ||
    (photo.location?.latitude != null && photo.location?.longitude != null
      ? `${photo.location.latitude.toFixed(4)}, ${photo.location.longitude.toFixed(4)}`
      : 'Unknown location');

  return (
    <div className="absolute bottom-24 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-30 bg-pinpic-surface-light dark:bg-pinpic-surface-container-dark border border-pinpic-border-light dark:border-pinpic-outline-dark rounded-3xl p-4 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5">
      <div className="flex gap-4">
        {/* Thumbnail */}
        <div
          onClick={onViewFull}
          className="relative w-24 h-24 rounded-2xl overflow-hidden bg-black/5 flex-shrink-0 cursor-pointer group shadow-sm"
        >
          <img
            src={photo.downloadUrl || photo.url}
            alt={photo.name || 'Photo'}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Maximize2 className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-1">
            <h4 className="font-bold text-sm text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark truncate">
              {photo.name || 'Untitled Moment'}
            </h4>
            <button
              onClick={onClose}
              className="p-1 rounded-full text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark hover:bg-black/5 dark:hover:bg-white/5"
              aria-label="Close details"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1 my-1">
            <div className="flex items-center gap-1.5 text-xs text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark truncate">
              <MapPin className="w-3.5 h-3.5 text-pinpic-teal dark:text-pinpic-teal-dark flex-shrink-0" />
              <span className="truncate">{locationText}</span>
            </div>

            {photoDate && (
              <div className="flex items-center gap-1.5 text-xs text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark">
                <Calendar className="w-3.5 h-3.5 text-pinpic-coral dark:text-pinpic-coral-dark flex-shrink-0" />
                <span>{format(photoDate, 'MMM d, yyyy')}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark">
              {photo.visibility || 'PUBLIC'}
            </span>
            <button
              onClick={onViewFull}
              className="text-xs font-bold text-pinpic-coral dark:text-pinpic-coral-dark hover:underline flex items-center gap-1"
            >
              View Full
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectedPhotoCard;

