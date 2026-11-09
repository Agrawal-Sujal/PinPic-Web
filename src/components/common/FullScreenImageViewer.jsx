import React, { useState, useEffect } from 'react';
import { X, Info, ChevronLeft, ChevronRight, Trash2, MapPin, Calendar, Lock, Globe, Users } from 'lucide-react';
import { format } from 'date-fns';

export const FullScreenImageViewer = ({
  photos = [],
  initialIndex = 0,
  isOpen = false,
  onClose,
  onDelete,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, isOpen]);

  // Handle keyboard navigation & escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && currentIndex > 0) setCurrentIndex(prev => prev - 1);
      if (e.key === 'ArrowRight' && currentIndex < photos.length - 1) setCurrentIndex(prev => prev + 1);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, photos.length, onClose]);

  if (!isOpen || photos.length === 0) return null;

  const currentPhoto = photos[currentIndex];
  if (!currentPhoto) return null;

  const imageUrl = currentPhoto.downloadUrl || currentPhoto.url || currentPhoto.localUri;
  const photoDate = currentPhoto.takenAt ? new Date(currentPhoto.takenAt) : null;
  const locationText = currentPhoto.location?.locationName ||
    (currentPhoto.location?.latitude ? `${currentPhoto.location.latitude.toFixed(4)}, ${currentPhoto.location.longitude.toFixed(4)}` : null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-200">
      {/* Top Controls Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent text-white">
        <button
          onClick={onClose}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-sm font-semibold tracking-wide">
          {currentIndex + 1} / {photos.length}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInfo(!showInfo)}
            className={`p-2.5 rounded-full transition-colors backdrop-blur-sm ${
              showInfo ? 'bg-pinpic-coral text-white' : 'bg-white/10 hover:bg-white/20'
            }`}
            aria-label="Photo Information"
          >
            <Info className="w-5 h-5" />
          </button>
          {onDelete && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this photo?')) {
                  onDelete(currentPhoto.photoId || currentPhoto.id);
                  if (photos.length <= 1) {
                    onClose();
                  } else if (currentIndex >= photos.length - 1) {
                    setCurrentIndex(prev => Math.max(0, prev - 1));
                  }
                }
              }}
              className="p-2.5 rounded-full bg-red-500/80 hover:bg-red-600 transition-colors text-white backdrop-blur-sm"
              aria-label="Delete Photo"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Image Display */}
      <div className="relative flex items-center justify-center w-full h-full p-4 select-none">
        <img
          src={imageUrl}
          alt={currentPhoto.name || 'Photo'}
          className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl transition-all duration-300"
        />

        {/* Previous Button */}
        {currentIndex > 0 && (
          <button
            onClick={() => setCurrentIndex(prev => prev - 1)}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/15 hover:bg-white/30 text-white backdrop-blur-md transition-transform active:scale-95"
            aria-label="Previous Photo"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Next Button */}
        {currentIndex < photos.length - 1 && (
          <button
            onClick={() => setCurrentIndex(prev => prev + 1)}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/15 hover:bg-white/30 text-white backdrop-blur-md transition-transform active:scale-95"
            aria-label="Next Photo"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Info Overlay Panel */}
      {showInfo && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md mx-4 p-5 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/15 text-white shadow-2xl animate-in slide-in-from-bottom-5">
          <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
            <h3 className="font-bold text-base truncate pr-2">{currentPhoto.name || 'Photo Info'}</h3>
            {currentPhoto.visibility && (
              <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-white/15 font-medium">
                {currentPhoto.visibility === 'PUBLIC' && <Globe className="w-3.5 h-3.5 text-emerald-400" />}
                {currentPhoto.visibility === 'FRIENDS' && <Users className="w-3.5 h-3.5 text-blue-400" />}
                {currentPhoto.visibility === 'PRIVATE' && <Lock className="w-3.5 h-3.5 text-amber-400" />}
                {currentPhoto.visibility}
              </span>
            )}
          </div>

          <div className="space-y-2 text-sm text-neutral-300">
            {photoDate && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-pinpic-coral flex-shrink-0" />
                <span>{format(photoDate, 'PPP p')}</span>
              </div>
            )}
            {locationText && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-pinpic-teal flex-shrink-0" />
                <span className="truncate">{locationText}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FullScreenImageViewer;

