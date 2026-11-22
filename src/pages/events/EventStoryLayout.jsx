import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Calendar,
  Clock,
  Trash2,
  Edit2,
  Check,
  X,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '../../context/ToastContext';
import { localCollectionRepository } from '../../data/localCollectionRepository';
import FullScreenImageViewer from '../../components/common/FullScreenImageViewer';
import DeleteCollectionModal from '../../components/events/DeleteCollectionModal';

export const EventStoryLayout = ({ collection, onReload }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  // Time bucket label editing state
  const [editingBucketId, setEditingBucketId] = useState(null);
  const [bucketLabelText, setBucketLabelText] = useState('');

  // Deletion modals
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [photoToRemove, setPhotoToRemove] = useState(null);

  if (!collection) return null;

  const allPhotos = collection.photos || [];
  const coverUrl = collection.coverPhoto?.photoUrl || collection.coverPhoto?.downloadUrl;
  const timeBuckets = collection.timeBuckets || [];

  const handleOpenViewer = (photo) => {
    const idx = allPhotos.findIndex((p) => p.photoId === photo.photoId);
    setViewerIndex(idx >= 0 ? idx : 0);
    setViewerOpen(true);
  };

  const handleSaveBucketLabel = async (bucketId) => {
    try {
      const labels = { ...(collection.timeBucketLabels || {}), [bucketId]: bucketLabelText.trim() };
      await localCollectionRepository.updateCollectionMetadata(collection.id, {
        timeBucketLabels: labels,
      });
      showToast('Phase name updated', 'success');
      setEditingBucketId(null);
      if (onReload) onReload();
    } catch (err) {
      console.error('Failed to update bucket label:', err);
      showToast('Failed to save phase name', 'error');
    }
  };

  const handleRemovePhoto = async () => {
    if (!photoToRemove) return;
    try {
      await localCollectionRepository.removePhotoFromCollection(collection.id, photoToRemove.photoId);
      showToast('Photo removed from event (kept on map & gallery)', 'success');
      setPhotoToRemove(null);
      if (onReload) onReload();
    } catch (err) {
      console.error('Failed to remove photo:', err);
      showToast('Failed to remove photo', 'error');
    }
  };

  const handleDeleteCollection = async (deletePhotos) => {
    try {
      await localCollectionRepository.deleteCollection(collection.id, deletePhotos);
      showToast(
        deletePhotos
          ? 'Event and photos deleted'
          : 'Event deleted (photos kept safely in gallery & map)',
        'success'
      );
      setIsDeleteModalOpen(false);
      navigate('/events', { replace: true });
    } catch (err) {
      console.error('Failed to delete collection:', err);
      showToast('Failed to delete event', 'error');
    }
  };

  const eventDateStr = collection.startDate
    ? format(new Date(collection.startDate), 'EEEE, MMMM d, yyyy')
    : 'Event';

  return (
    <div className="min-h-screen pb-28 bg-pinpic-bg-light dark:bg-pinpic-bg-dark text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark">
      {/* Top Floating App Bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-8 py-3 backdrop-blur-md bg-pinpic-surface-light/80 dark:bg-pinpic-surface-container-dark/80 border-b border-pinpic-border-light/60 dark:border-pinpic-outline-dark/60">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/events')}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            aria-label="Back to Collections"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-sm sm:text-base truncate max-w-[200px] sm:max-w-md">
              {collection.title}
            </h1>
            <p className="text-[11px] text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark">
              {eventDateStr}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/map?collectionId=${collection.id}`)}
            className="px-4 py-1.5 rounded-full bg-purple-600 text-white font-semibold text-xs hover:opacity-95 transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Venue Map</span>
          </button>

          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="p-2 rounded-full text-red-500 hover:bg-red-500/10 transition-colors"
            aria-label="Delete Event"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Hero Headline Photo Header */}
      <div className="relative w-full max-w-5xl mx-auto px-4 sm:px-6 pt-4">
        <div className="relative w-full h-72 sm:h-96 rounded-3xl overflow-hidden shadow-xl bg-black/10">
          {coverUrl ? (
            <img src={coverUrl} alt={collection.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white text-4xl">
              🎉
            </div>
          )}

          {/* Dark Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent flex flex-col justify-end p-6 sm:p-8 text-white">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-600 text-white backdrop-blur-sm">
                🎉 Event
              </span>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm">
                {eventDateStr}
              </span>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm">
                {allPhotos.length} {allPhotos.length === 1 ? 'highlight' : 'highlights'}
              </span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              {collection.title}
            </h2>

            {collection.description && (
              <p className="text-sm sm:text-base text-white/90 mt-2 max-w-2xl leading-relaxed">
                {collection.description}
              </p>
            )}

            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() => navigate(`/map?collectionId=${collection.id}`)}
                className="px-4 py-2 rounded-full bg-white text-gray-900 font-bold text-xs hover:bg-white/90 transition-all shadow-md flex items-center gap-1.5 active:scale-95"
              >
                <MapPin className="w-4 h-4 text-purple-600" />
                <span>View Venue Location</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Time-of-Day Grouped Highlights */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
        {timeBuckets.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-pinpic-border-light dark:border-pinpic-outline-dark rounded-3xl p-8">
            <p className="text-sm text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark">
              No photos currently in this event.
            </p>
          </div>
        ) : (
          timeBuckets.map((bucket) => {
            const isEditing = editingBucketId === bucket.id;

            return (
              <section
                key={bucket.id}
                className="bg-pinpic-surface-light dark:bg-pinpic-surface-container-dark rounded-3xl p-5 sm:p-6 border border-pinpic-border-light dark:border-pinpic-outline-dark shadow-sm space-y-4"
              >
                {/* Bucket Header */}
                <div className="flex items-center justify-between border-b border-pinpic-border-light dark:border-pinpic-outline-dark pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{bucket.icon}</span>
                    <div>
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={bucketLabelText}
                            onChange={(e) => setBucketLabelText(e.target.value)}
                            className="px-2 py-1 text-sm font-bold bg-black/5 dark:bg-white/5 border border-purple-500 rounded-lg focus:outline-none"
                            placeholder="Phase label (e.g. Haldi)"
                          />
                          <button
                            onClick={() => handleSaveBucketLabel(bucket.id)}
                            className="p-1 rounded bg-purple-600 text-white"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </button>
                          <button
                            onClick={() => setEditingBucketId(null)}
                            className="p-1 rounded hover:bg-black/5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-base sm:text-lg">
                            {bucket.label}
                          </h3>
                          <button
                            onClick={() => {
                              setBucketLabelText(bucket.label);
                              setEditingBucketId(bucket.id);
                            }}
                            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 text-pinpic-text-secondary-light"
                            title="Rename phase"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      <p className="text-xs text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark font-medium">
                        {bucket.timeRange} • {bucket.photos.length} photos
                      </p>
                    </div>
                  </div>
                </div>

                {/* Photos Grid for this Time of Day */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {bucket.photos.map((photo) => {
                    const photoDate = photo.takenAt ? new Date(photo.takenAt) : null;
                    const locationText = photo.location?.locationName;

                    return (
                      <div
                        key={photo.photoId}
                        className="group relative aspect-square rounded-2xl overflow-hidden bg-black/5 cursor-pointer shadow-sm hover:shadow-md transition-all select-none"
                      >
                        <img
                          src={photo.photoUrl || photo.downloadUrl}
                          alt={photo.name}
                          onClick={() => handleOpenViewer(photo)}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />

                        {/* Top Action Pill (Remove from Event) */}
                        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPhotoToRemove(photo);
                            }}
                            title="Remove photo from this event"
                            className="p-1.5 rounded-full bg-black/60 hover:bg-red-500 text-white transition-colors backdrop-blur-sm shadow-md"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Bottom Information Gradient */}
                        <div
                          onClick={() => handleOpenViewer(photo)}
                          className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 via-black/30 to-transparent text-white text-[10px] leading-tight flex flex-col justify-end"
                        >
                          {photoDate && (
                            <div className="flex items-center gap-1 truncate font-semibold text-white">
                              <Clock className="w-2.5 h-2.5 text-purple-400 flex-shrink-0" />
                              <span>{format(photoDate, 'h:mm a')}</span>
                            </div>
                          )}
                          {locationText && (
                            <div className="flex items-center gap-1 truncate text-white/80 font-medium">
                              <MapPin className="w-2.5 h-2.5 text-pinpic-teal flex-shrink-0" />
                              <span className="truncate">{locationText}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </main>

      {/* Full-Screen Image Viewer */}
      {viewerOpen && (
        <FullScreenImageViewer
          photos={allPhotos}
          initialIndex={viewerIndex}
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
        />
      )}

      {/* Delete Collection Modal */}
      <DeleteCollectionModal
        isOpen={isDeleteModalOpen}
        collection={collection}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteCollection}
      />

      {/* Photo Removal Confirmation Modal */}
      {photoToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-pinpic-surface-light dark:bg-pinpic-surface-container-dark rounded-3xl p-6 shadow-2xl border border-pinpic-border-light dark:border-pinpic-outline-dark space-y-3">
            <h4 className="font-bold text-sm text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark">
              Remove photo from this event?
            </h4>
            <p className="text-xs text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark leading-relaxed">
              The photo will be removed from this story, but will safely stay on your map and in your gallery.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setPhotoToRemove(null)}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleRemovePhoto}
                className="px-4 py-1.5 rounded-full text-xs font-bold bg-pinpic-coral text-white shadow-sm"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventStoryLayout;
