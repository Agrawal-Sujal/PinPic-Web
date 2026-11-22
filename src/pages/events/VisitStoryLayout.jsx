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
  Users,
  ChevronRight,
  History,
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '../../context/ToastContext';
import { localCollectionRepository } from '../../data/localCollectionRepository';
import FullScreenImageViewer from '../../components/common/FullScreenImageViewer';
import DeleteCollectionModal from '../../components/events/DeleteCollectionModal';

export const VisitStoryLayout = ({ collection, onReload }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  // Attendees inline editing state
  const [isEditingAttendees, setIsEditingAttendees] = useState(false);
  const [attendeesText, setAttendeesText] = useState(collection.whoWasThere || '');

  // Earlier visits drawer state
  const [isEarlierVisitsOpen, setIsEarlierVisitsOpen] = useState(false);

  // Deletion modals
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [photoToRemove, setPhotoToRemove] = useState(null);

  if (!collection) return null;

  const allPhotos = collection.photos || [];
  const coverUrl = collection.coverPhoto?.photoUrl || collection.coverPhoto?.downloadUrl;
  const earlierVisits = collection.earlierVisits || [];

  const handleOpenViewer = (photo) => {
    const idx = allPhotos.findIndex((p) => p.photoId === photo.photoId);
    setViewerIndex(idx >= 0 ? idx : 0);
    setViewerOpen(true);
  };

  const handleSaveAttendees = async () => {
    try {
      await localCollectionRepository.updateCollectionMetadata(collection.id, {
        whoWasThere: attendeesText.trim(),
      });
      showToast('Attendees updated', 'success');
      setIsEditingAttendees(false);
      if (onReload) onReload();
    } catch (err) {
      console.error('Failed to update attendees:', err);
      showToast('Failed to save attendees', 'error');
    }
  };

  const handleRemovePhoto = async () => {
    if (!photoToRemove) return;
    try {
      await localCollectionRepository.removePhotoFromCollection(collection.id, photoToRemove.photoId);
      showToast('Photo removed from visit (kept on map & gallery)', 'success');
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
          ? 'Visit and photos deleted'
          : 'Visit deleted (photos kept safely in gallery & map)',
        'success'
      );
      setIsDeleteModalOpen(false);
      navigate('/events', { replace: true });
    } catch (err) {
      console.error('Failed to delete collection:', err);
      showToast('Failed to delete visit', 'error');
    }
  };

  const formattedDateRange =
    collection.startDate && collection.endDate
      ? format(new Date(collection.startDate), 'MMM d, yyyy') ===
        format(new Date(collection.endDate), 'MMM d, yyyy')
        ? format(new Date(collection.startDate), 'MMMM d, yyyy')
        : `${format(new Date(collection.startDate), 'MMM d')} – ${format(
            new Date(collection.endDate),
            'MMM d, yyyy'
          )}`
      : 'Visit';

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
            className="px-4 py-1.5 rounded-full bg-pinpic-teal dark:bg-pinpic-teal-dark text-white font-semibold text-xs hover:opacity-95 transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>View on Map</span>
          </button>

          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="p-2 rounded-full text-red-500 hover:bg-red-500/10 transition-colors"
            aria-label="Delete Visit"
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
            <div className="w-full h-full bg-gradient-to-br from-pinpic-teal to-blue-600 flex items-center justify-center text-white text-4xl">
              📍
            </div>
          )}

          {/* Dark Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex flex-col justify-end p-6 sm:p-8 text-white">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-pinpic-teal text-white backdrop-blur-sm">
                📍 Visit
              </span>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm">
                {formattedDateRange}
              </span>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm">
                {allPhotos.length} {allPhotos.length === 1 ? 'photo' : 'photos'}
              </span>

              {/* Earlier Visits Chip */}
              {earlierVisits.length > 0 && (
                <button
                  onClick={() => setIsEarlierVisitsOpen(true)}
                  className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/90 hover:bg-amber-500 text-white backdrop-blur-sm transition-all flex items-center gap-1 shadow-md active:scale-95"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>
                    {earlierVisits.length} earlier visit{earlierVisits.length > 1 ? 's' : ''} here
                  </span>
                </button>
              )}
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              {collection.title}
            </h2>

            {/* Who was there line */}
            <div className="mt-2 flex items-center gap-2 text-white/95 text-xs sm:text-sm">
              <Users className="w-4 h-4 text-pinpic-teal-dark flex-shrink-0" />
              {isEditingAttendees ? (
                <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md p-1.5 rounded-xl border border-white/20">
                  <input
                    type="text"
                    value={attendeesText}
                    onChange={(e) => setAttendeesText(e.target.value)}
                    placeholder="e.g. Nani, Kabir, Rohit"
                    className="px-2 py-0.5 text-xs bg-transparent border-b border-white/40 focus:outline-none focus:border-white text-white"
                  />
                  <button
                    onClick={handleSaveAttendees}
                    className="p-1 rounded bg-pinpic-teal text-white"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </button>
                  <button
                    onClick={() => setIsEditingAttendees(false)}
                    className="p-1 rounded hover:bg-white/20 text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>
                    {collection.whoWasThere ? (
                      <>
                        <span className="font-semibold">With: </span>
                        <span>{collection.whoWasThere}</span>
                      </>
                    ) : (
                      <span className="italic opacity-80">+ Add who was there</span>
                    )}
                  </span>
                  <button
                    onClick={() => {
                      setAttendeesText(collection.whoWasThere || '');
                      setIsEditingAttendees(true);
                    }}
                    className="p-1 rounded-full hover:bg-white/20 transition-colors"
                  >
                    <Edit2 className="w-3 h-3 text-white/80" />
                  </button>
                </div>
              )}
            </div>

            {collection.description && (
              <p className="text-sm text-white/80 mt-2 max-w-2xl line-clamp-2">
                {collection.description}
              </p>
            )}

            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() => navigate(`/map?collectionId=${collection.id}`)}
                className="px-4 py-2 rounded-full bg-white text-gray-900 font-bold text-xs hover:bg-white/90 transition-all shadow-md flex items-center gap-1.5 active:scale-95"
              >
                <MapPin className="w-4 h-4 text-pinpic-teal" />
                <span>View Pins on Map</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Photo Grid Area */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-base sm:text-lg">Photos & Moments</h3>
          <span className="text-xs text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark">
            {allPhotos.length} photos
          </span>
        </div>

        {allPhotos.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-pinpic-border-light dark:border-pinpic-outline-dark rounded-3xl p-8">
            <p className="text-sm text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark">
              No photos currently in this visit.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {allPhotos.map((photo) => {
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

                  {/* Top Action Pill (Remove from Visit) */}
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPhotoToRemove(photo);
                      }}
                      title="Remove photo from this visit"
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
                        <span>{format(photoDate, 'MMM d • h:mm a')}</span>
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
        )}
      </main>

      {/* Earlier Visits Slide-over Sheet / Modal */}
      {isEarlierVisitsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-pinpic-surface-light dark:bg-pinpic-surface-container-dark rounded-3xl p-6 shadow-2xl border border-pinpic-border-light dark:border-pinpic-outline-dark space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-pinpic-border-light dark:border-pinpic-outline-dark">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-base text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark">
                  Earlier Visits Here
                </h3>
              </div>
              <button
                onClick={() => setIsEarlierVisitsOpen(false)}
                className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark">
              Other visit collections near this area:
            </p>

            <div className="space-y-3">
              {earlierVisits.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setIsEarlierVisitsOpen(false);
                    navigate(`/events/${item.id}`);
                  }}
                  className="flex items-center justify-between p-3 rounded-2xl border border-pinpic-border-light dark:border-pinpic-outline-dark hover:border-pinpic-teal/50 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/10 flex-shrink-0">
                      {item.coverPhoto ? (
                        <img
                          src={item.coverPhoto.photoUrl || item.coverPhoto.downloadUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm">📍</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm truncate text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark">
                        {item.title}
                      </h4>
                      <p className="text-xs text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark">
                        {item.startDate ? format(new Date(item.startDate), 'MMM yyyy') : 'Past Visit'} • {item.photoCount} photos
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
              Remove photo from this visit?
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

export default VisitStoryLayout;
