import React, { useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  X,
  MapPin,
  Clock,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';

export const TripReplayOverlay = ({
  photos = [],
  currentIndex = 0,
  isPlaying = false,
  playbackSpeed = 1,
  onPlayPause,
  onPrevious,
  onNext,
  onSpeedChange,
  onClose,
  onSelectPhoto,
}) => {
  const currentPhoto = photos[currentIndex];

  useEffect(() => {
    if (!isPlaying) return;
    const intervalTime = 2500 / playbackSpeed;
    const timer = setTimeout(() => {
      if (currentIndex < photos.length - 1) {
        onNext();
      } else {
        onPlayPause(false); // Stop at the end
      }
    }, intervalTime);

    return () => clearTimeout(timer);
  }, [isPlaying, currentIndex, photos.length, playbackSpeed, onNext, onPlayPause]);

  if (!currentPhoto) return null;

  const photoDate = currentPhoto.takenAt ? new Date(currentPhoto.takenAt) : null;
  const locationText = currentPhoto.location?.locationName || 'Travel Stop';
  const progressPercent = ((currentIndex + 1) / photos.length) * 100;

  return (
    <div className="absolute bottom-24 left-4 right-4 sm:left-auto sm:right-6 sm:w-[420px] z-40 bg-pinpic-surface-light/95 dark:bg-pinpic-surface-container-dark/95 border border-pinpic-border-light dark:border-pinpic-outline-dark rounded-3xl p-4 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-6">
      {/* Top Header / Progress Indicator */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-pinpic-border-light/60 dark:border-pinpic-outline-dark/60">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-pinpic-coral animate-ping" />
          <span className="text-xs font-bold text-pinpic-coral dark:text-pinpic-coral-dark uppercase tracking-wider">
            Replaying Trip
          </span>
          <span className="text-xs font-semibold text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark">
            Stop {currentIndex + 1} of {photos.length}
          </span>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-full text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          aria-label="Exit Replay"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Bar Line */}
      <div className="w-full h-1 bg-black/10 dark:bg-white/10 rounded-full mb-3 overflow-hidden">
        <div
          className="h-full bg-pinpic-coral transition-all duration-300 rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Main Stop Card */}
      <div className="flex gap-3.5 items-center">
        {/* Photo Thumbnail */}
        <div
          onClick={() => onSelectPhoto && onSelectPhoto(currentPhoto)}
          className="relative w-20 h-20 rounded-2xl overflow-hidden bg-black/10 flex-shrink-0 cursor-pointer shadow-md group"
        >
          <img
            src={currentPhoto.photoUrl || currentPhoto.downloadUrl}
            alt={currentPhoto.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
          <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
            #{currentIndex + 1}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-extrabold text-sm text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark truncate">
            {currentPhoto.name || 'Photo Moment'}
          </h4>

          <div className="flex items-center gap-1.5 text-xs text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark mt-1 truncate">
            <MapPin className="w-3.5 h-3.5 text-pinpic-teal flex-shrink-0" />
            <span className="truncate font-medium">{locationText}</span>
          </div>

          {photoDate && (
            <div className="flex items-center gap-1.5 text-xs text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark mt-0.5">
              <Clock className="w-3.5 h-3.5 text-pinpic-coral flex-shrink-0" />
              <span>{format(photoDate, 'MMM d • h:mm a')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-between pt-3 mt-3 border-t border-pinpic-border-light/60 dark:border-pinpic-outline-dark/60">
        <button
          onClick={() => onSpeedChange(playbackSpeed === 1 ? 2 : 1)}
          className="text-xs font-bold px-2.5 py-1 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
        >
          {playbackSpeed}x Speed
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onPrevious}
            disabled={currentIndex === 0}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous Stop"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={() => onPlayPause(!isPlaying)}
            className="w-10 h-10 rounded-full bg-pinpic-coral dark:bg-pinpic-coral-dark text-white flex items-center justify-center hover:opacity-90 shadow-md transition-all active:scale-95"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={onNext}
            disabled={currentIndex === photos.length - 1}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Next Stop"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={() => onSelectPhoto && onSelectPhoto(currentPhoto)}
          className="text-xs font-bold text-pinpic-coral dark:text-pinpic-coral-dark hover:underline"
        >
          View Full
        </button>
      </div>
    </div>
  );
};

export default TripReplayOverlay;
