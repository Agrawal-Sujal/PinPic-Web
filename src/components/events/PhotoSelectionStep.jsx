import React, { useState, useEffect } from 'react';
import { Check, Calendar, MapPin, CheckSquare, Square, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { localPhotoRepository } from '../../data/localPhotoRepository';
import LoadingSpinner from '../common/LoadingSpinner';

export const PhotoSelectionStep = ({ selectedPhotoIds, onTogglePhoto, onSelectAll, onClearAll, onNext, onBack }) => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadPhotos = async () => {
      try {
        setLoading(true);
        const res = await localPhotoRepository.getAllPhotos();
        if (isMounted) {
          setPhotos(res || []);
        }
      } catch (err) {
        console.error('Failed to load photos for collection selection:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadPhotos();
    return () => {
      isMounted = false;
    };
  }, []);

  const isAllSelected = photos.length > 0 && selectedPhotoIds.size === photos.length;
  const count = selectedPhotoIds.size;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark">
            Select Photos from Local DB
          </h3>
          <p className="text-xs text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark mt-0.5">
            Choose uploaded photos to include in your trip timeline.
          </p>
        </div>

        {photos.length > 0 && (
          <button
            onClick={() => (isAllSelected ? onClearAll() : onSelectAll(photos.map((p) => p.photoId)))}
            className="text-xs font-semibold px-3 py-1.5 rounded-full border border-pinpic-border-light dark:border-pinpic-outline-dark text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-1.5"
          >
            {isAllSelected ? <CheckSquare className="w-3.5 h-3.5 text-pinpic-coral" /> : <Square className="w-3.5 h-3.5" />}
            <span>{isAllSelected ? 'Deselect All' : 'Select All'}</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner text="Loading local photos..." />
        </div>
      ) : photos.length === 0 ? (
        <div className="py-12 text-center border-2 border-dashed border-pinpic-border-light dark:border-pinpic-outline-dark rounded-2xl p-6">
          <div className="w-12 h-12 mx-auto rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark mb-3">
            <ImageIcon className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-sm text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark">
            No Uploaded Photos Found
          </h4>
          <p className="text-xs text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark mt-1 max-w-xs mx-auto">
            You need photos in your local database first. Upload some photos via the Map or Gallery tab to create a collection.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-[50vh] overflow-y-auto p-1 rounded-xl">
          {photos.map((photo) => {
            const id = photo.photoId;
            const isSelected = selectedPhotoIds.has(id);
            const photoDate = photo.takenAt ? new Date(photo.takenAt) : null;
            const locationText = photo.location?.locationName;

            return (
              <div
                key={id}
                onClick={() => onTogglePhoto(id)}
                className={`group relative aspect-square rounded-xl overflow-hidden cursor-pointer select-none transition-all duration-200 ${
                  isSelected
                    ? 'ring-3 ring-pinpic-coral dark:ring-pinpic-coral-dark scale-[0.98]'
                    : 'hover:opacity-95'
                }`}
              >
                <img
                  src={photo.photoUrl || photo.downloadUrl}
                  alt={photo.name || 'Photo'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />

                {/* Selection Checkbox Pill */}
                <div
                  className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all shadow-md ${
                    isSelected
                      ? 'bg-pinpic-coral dark:bg-pinpic-coral-dark text-white scale-100'
                      : 'bg-black/40 text-transparent hover:bg-black/60 group-hover:scale-100'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>

                {/* Metadata overlay on hover or selected */}
                <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white text-[10px] leading-tight flex flex-col justify-end opacity-90 group-hover:opacity-100 transition-opacity">
                  {photoDate && (
                    <div className="flex items-center gap-1 truncate font-medium">
                      <Calendar className="w-2.5 h-2.5 flex-shrink-0 text-pinpic-coral-dark" />
                      <span className="truncate">{format(photoDate, 'MMM d, yyyy')}</span>
                    </div>
                  )}
                  {locationText && (
                    <div className="flex items-center gap-1 truncate text-white/80">
                      <MapPin className="w-2.5 h-2.5 flex-shrink-0 text-pinpic-teal-dark" />
                      <span className="truncate">{locationText}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Navigation Bar */}
      <div className="pt-2 flex items-center justify-between border-t border-pinpic-border-light dark:border-pinpic-outline-dark">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-full font-semibold text-xs border border-pinpic-border-light dark:border-pinpic-outline-dark text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Change Type</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark">
            {count} {count === 1 ? 'photo' : 'photos'} selected
          </span>
          <button
            onClick={onNext}
            disabled={count === 0}
            className="px-5 py-2.5 rounded-full font-semibold text-sm bg-pinpic-coral dark:bg-pinpic-coral-dark text-white hover:opacity-95 transition-all shadow-md active:scale-95 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>Next: Trip Details</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhotoSelectionStep;
