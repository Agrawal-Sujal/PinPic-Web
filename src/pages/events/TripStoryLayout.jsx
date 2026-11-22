import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Play,
  Calendar,
  Clock,
  Trash2,
  Edit2,
  Check,
  X,
  Plus,
  ArrowLeft,
  Share2,
  ChevronRight,
  Maximize2,
  Info,
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '../../context/ToastContext';
import { localCollectionRepository } from '../../data/localCollectionRepository';
import FullScreenImageViewer from '../../components/common/FullScreenImageViewer';
import DeleteCollectionModal from '../../components/events/DeleteCollectionModal';

export const TripStoryLayout = ({ collection, onReload }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Full screen viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  // Day note inline editing state
  const [editingDayKey, setEditingDayKey] = useState(null);
  const [dayNoteText, setDayNoteText] = useState('');

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Photo removal confirmation
  const [photoToRemove, setPhotoToRemove] = useState(null);

  if (!collection) return null;

  const days = collection.days || [];
  const allPhotos = collection.photos || [];
  const coverUrl = collection.coverPhoto?.photoUrl || collection.coverPhoto?.downloadUrl;

  const handleOpenViewer = (photo) => {
    const idx = allPhotos.findIndex((p) => p.photoId === photo.photoId);
    setViewerIndex(idx >= 0 ? idx : 0);
    setViewerOpen(true);
  };

  const handleStartEditNote = (dayKey, currentNote) => {
    setEditingDayKey(dayKey);
    setDayNoteText(currentNote || '');
  };

  const handleSaveDayNote = async (dayKey) => {
    try {
      await localCollectionRepository.updateDayNote(collection.id, dayKey, dayNoteText.trim());
      showToast('Day note updated', 'success');
      setEditingDayKey(null);
      if (onReload) onReload();
    } catch (err) {
      console.error('Failed to update day note:', err);
      showToast('Failed to save day note', 'error');
    }
  };

  const handleRemovePhoto = async () => {
    if (!photoToRemove) return;
    try {
      await localCollectionRepository.removePhotoFromCollection(collection.id, photoToRemove.photoId);
      showToast('Photo removed from trip (kept on map & gallery)', 'success');
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
          ? 'Trip and photos deleted'
          : 'Trip deleted (photos kept safely in gallery & map)',
        'success'
      );
      setIsDeleteModalOpen(false);
      navigate('/events', { replace: true });
    } catch (err) {
      console.error('Failed to delete collection:', err);
      showToast('Failed to delete trip', 'error');
    }
  };

  const formattedDateRange =
    collection.startDate && collection.endDate
      ? format(new Date(collection.startDate), 'MMM d, yyyy') ===
        format(new Date(collection.endDate), 'MMM d, yyyy')
        ? `${format(new Date(collection.startDate), 'MMM d, yyyy')} • 1 Day`
        : `${format(new Date(collection.startDate), 'MMM d')} – ${format(
            new Date(collection.endDate),
            'MMM d, yyyy'
          )} • ${collection.durationDays || days.length} Days`
      : 'Trip Timeline';

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
              {formattedDateRange}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/map?collectionId=${collection.id}`)}
            className="px-3.5 py-1.5 rounded-full bg-pinpic-teal dark:bg-pinpic-teal-dark text-white font-semibold text-xs hover:opacity-95 transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">View on Map</span>
          </button>

          <button
            onClick={() => navigate(`/map?collectionId=${collection.id}&replay=true`)}
            className="px-3.5 py-1.5 rounded-full bg-pinpic-coral dark:bg-pinpic-coral-dark text-white font-semibold text-xs hover:opacity-95 transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span className="hidden sm:inline">Replay</span>
          </button>

          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="p-2 rounded-full text-red-500 hover:bg-red-500/10 transition-colors"
            aria-label="Delete Trip"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Hero Cover Header */}
      <div className="relative w-full max-w-5xl mx-auto px-4 sm:px-6 pt-4">
        <div className="relative w-full h-64 sm:h-80 rounded-3xl overflow-hidden shadow-xl bg-black/10">
          {coverUrl ? (
            <img src={coverUrl} alt={collection.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-pinpic-coral to-pinpic-teal flex items-center justify-center text-white text-4xl">
              ✈️
            </div>
          )}

          {/* Dark Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex flex-col justify-end p-6 sm:p-8 text-white">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-pinpic-coral text-white backdrop-blur-sm">
                ✈️ Trip
              </span>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm">
                {formattedDateRange}
              </span>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm">
                {allPhotos.length} {allPhotos.length === 1 ? 'photo' : 'photos'}
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

            {/* Quick Actions in Cover */}
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() => navigate(`/map?collectionId=${collection.id}`)}
                className="px-4 py-2 rounded-full bg-white text-gray-900 font-bold text-xs hover:bg-white/90 transition-all shadow-md flex items-center gap-1.5 active:scale-95"
              >
                <MapPin className="w-4 h-4 text-pinpic-teal" />
                <span>Explore on Map</span>
              </button>

              <button
                onClick={() => navigate(`/map?collectionId=${collection.id}&replay=true`)}
                className="px-4 py-2 rounded-full bg-pinpic-coral text-white font-bold text-xs hover:opacity-90 transition-all shadow-md flex items-center gap-1.5 active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Replay Trip Route</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Day-by-Day Story Timeline */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 space-y-10">
        {days.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-pinpic-border-light dark:border-pinpic-outline-dark rounded-3xl p-8">
            <p className="text-sm text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark">
              No photos currently in this trip story.
            </p>
          </div>
        ) : (
          days.map((day) => {
            const isEditingNote = editingDayKey === day.dateKey;

            return (
              <section
                key={day.dateKey}
                className="bg-pinpic-surface-light dark:bg-pinpic-surface-container-dark rounded-3xl p-5 sm:p-6 border border-pinpic-border-light dark:border-pinpic-outline-dark shadow-sm space-y-4"
              >
                {/* Day Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-pinpic-border-light dark:border-pinpic-outline-dark pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-pinpic-coral/15 text-pinpic-coral dark:text-pinpic-coral-dark font-black flex items-center justify-center text-sm shadow-sm flex-shrink-0">
                      D{day.dayNumber}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base sm:text-lg text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark">
                        Day {day.dayNumber}
                      </h3>
                      <p className="text-xs text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark font-medium flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-pinpic-coral" />
                        <span>{day.formattedDate}</span>
                        <span>•</span>
                        <span>{day.photos.length} photos</span>
                      </p>
                    </div>
                  </div>

                  {/* Day Note Trigger / Display */}
                  {!isEditingNote && (
                    <button
                      onClick={() => handleStartEditNote(day.dateKey, day.note)}
                      className="self-start sm:self-auto text-xs font-semibold text-pinpic-coral dark:text-pinpic-coral-dark hover:underline flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>{day.note ? 'Edit Day Note' : '+ Add Day Note'}</span>
                    </button>
                  )}
                </div>

                {/* Day Note Box */}
                {isEditingNote ? (
                  <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 space-y-2 border border-pinpic-coral/30">
                    <textarea
                      rows={2}
                      value={dayNoteText}
                      onChange={(e) => setDayNoteText(e.target.value)}
                      placeholder={`What happened on Day ${day.dayNumber}? (e.g. Scuba diving, breakfast at Curlies, sunset cruise)`}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-pinpic-surface-dark border border-pinpic-border-light dark:border-pinpic-outline-dark focus:outline-none focus:ring-2 focus:ring-pinpic-coral resize-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingDayKey(null)}
                        className="px-3 py-1 rounded-full text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveDayNote(day.dateKey)}
                        className="px-4 py-1 rounded-full text-xs font-bold bg-pinpic-coral text-white flex items-center gap-1"
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>Save Note</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  day.note && (
                    <div className="p-3.5 rounded-2xl bg-pinpic-coral/5 dark:bg-pinpic-coral-dark/5 border border-pinpic-coral/15 text-xs text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark italic leading-relaxed">
                      "{day.note}"
                    </div>
                  )
                )}

                {/* Photos Grid for this Day */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
                  {day.photos.map((photo) => {
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

                        {/* Top Action Pill (Remove from Trip) */}
                        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPhotoToRemove(photo);
                            }}
                            title="Remove photo from this trip"
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
                              <Clock className="w-2.5 h-2.5 text-pinpic-coral-dark flex-shrink-0" />
                              <span>{format(photoDate, 'h:mm a')}</span>
                            </div>
                          )}
                          {locationText && (
                            <div className="flex items-center gap-1 truncate text-white/80 font-medium">
                              <MapPin className="w-2.5 h-2.5 text-pinpic-teal-dark flex-shrink-0" />
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

      {/* Remove Photo from Trip Confirmation Modal */}
      {photoToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-pinpic-surface-light dark:bg-pinpic-surface-container-dark rounded-3xl p-6 shadow-2xl border border-pinpic-border-light dark:border-pinpic-outline-dark space-y-3">
            <h4 className="font-bold text-sm text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark">
              Remove photo from this trip?
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

export default TripStoryLayout;
