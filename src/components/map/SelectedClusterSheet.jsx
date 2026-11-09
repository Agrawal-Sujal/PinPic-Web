import React from 'react';
import { X, MapPin } from 'lucide-react';

export const SelectedClusterSheet = ({ cluster, onClose, onSelectPhoto }) => {
  if (!cluster) return null;

  const photos = cluster.photos || [];
  const locationText = cluster.location?.locationName ||
    (cluster.location?.latitude ? `${cluster.location.latitude.toFixed(4)}, ${cluster.location.longitude.toFixed(4)}` : 'Cluster location');

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in">
      <div className="w-full sm:max-w-xl max-h-[80vh] flex flex-col bg-pinpic-surface-light dark:bg-pinpic-surface-container-dark rounded-t-3xl sm:rounded-3xl border border-pinpic-border-light dark:border-pinpic-outline-dark shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-pinpic-border-light dark:border-pinpic-outline-dark">
          <div>
            <h3 className="font-bold text-lg text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark">
              {photos.length} Photos in this spot
            </h3>
            <p className="flex items-center gap-1.5 text-xs text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-pinpic-teal" />
              <span>{locationText}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-pinpic-text-secondary-light"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Photos Grid */}
        <div className="p-4 overflow-y-auto grid grid-cols-3 gap-2.5 max-h-[60vh]">
          {photos.map((photo) => (
            <div
              key={photo.photoId || photo.id}
              onClick={() => onSelectPhoto(photo)}
              className="relative aspect-square rounded-xl overflow-hidden bg-black/5 cursor-pointer group shadow-sm hover:ring-2 hover:ring-pinpic-coral transition-all"
            >
              <img
                src={photo.downloadUrl || photo.url}
                alt={photo.name || 'Photo'}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SelectedClusterSheet;

