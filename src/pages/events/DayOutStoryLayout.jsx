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
  Sun,
  Share2,
  Navigation,
  Compass,
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '../../context/ToastContext';
import { localCollectionRepository } from '../../data/localCollectionRepository';
import FullScreenImageViewer from '../../components/common/FullScreenImageViewer';
import DeleteCollectionModal from '../../components/events/DeleteCollectionModal';

export const DayOutStoryLayout = ({ collection, onReload }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  // Stop naming state
  const [editingStopIndex, setEditingStopIndex] = useState(null);
  const [stopNameInput, setStopNameInput] = useState('');

  // Share card modal state
  const [isShareCardOpen, setIsShareCardOpen] = useState(false);

  // Deletion modals
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [photoToRemove, setPhotoToRemove] = useState(null);

  if (!collection) return null;

  const allPhotos = collection.photos || [];
  const coverUrl = collection.coverPhoto?.photoUrl || collection.coverPhoto?.downloadUrl;
  const stops = collection.stops || [];

  const handleOpenViewer = (photo) => {
    const idx = allPhotos.findIndex((p) => p.photoId === photo.photoId);
    setViewerIndex(idx >= 0 ? idx : 0);
    setViewerOpen(true);
  };

  const handleSaveStopName = async (index) => {
    try {
      const names = { ...(collection.stopNames || {}), [String(index)]: stopNameInput.trim() };
      await localCollectionRepository.updateCollectionMetadata(collection.id, {
        stopNames: names,
      });
      showToast('Stop name updated', 'success');
      setEditingStopIndex(null);
      if (onReload) onReload();
    } catch (err) {
      console.error('Failed to update stop name:', err);
      showToast('Failed to save stop name', 'error');
    }
  };

  const handleRemovePhoto = async () => {
    if (!photoToRemove) return;
    try {
      await localCollectionRepository.removePhotoFromCollection(collection.id, photoToRemove.photoId);
      showToast('Photo removed from day out (kept on map & gallery)', 'success');
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
          ? 'Day Out and photos deleted'
          : 'Day Out deleted (photos kept safely in gallery & map)',
        'success'
      );
      setIsDeleteModalOpen(false);
      navigate('/events', { replace: true });
    } catch (err) {
      console.error('Failed to delete collection:', err);
      showToast('Failed to delete day out', 'error');
    }
  };

  const dateStr = collection.startDate
    ? format(new Date(collection.startDate), 'EEEE, MMMM d, yyyy')
    : 'Day Out';

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
              {dateStr}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsShareCardOpen(true)}
            className="px-3.5 py-1.5 rounded-full border border-pinpic-border-light dark:border-pinpic-outline-dark hover:bg-black/5 dark:hover:bg-white/5 font-semibold text-xs flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Share2 className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Share Card</span>
          </button>

          <button
            onClick={() => navigate(`/map?collectionId=${collection.id}`)}
            className="px-4 py-1.5 rounded-full bg-amber-500 text-white font-semibold text-xs hover:opacity-95 transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>View Route</span>
          </button>

          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="p-2 rounded-full text-red-500 hover:bg-red-500/10 transition-colors"
            aria-label="Delete Day Out"
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
            <div className="w-full h-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white text-4xl">
              ☀️
            </div>
          )}

          {/* Dark Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex flex-col justify-end p-6 sm:p-8 text-white">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500 text-white backdrop-blur-sm">
                ☀️ Day Out
              </span>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm">
                {dateStr}
              </span>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm">
                {stops.length} stops • {allPhotos.length} photos
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
                <Navigation className="w-4 h-4 text-amber-500" />
                <span>Explore City Route</span>
              </button>

              <button
                onClick={() => setIsShareCardOpen(true)}
                className="px-4 py-2 rounded-full bg-amber-500 text-white font-bold text-xs hover:opacity-90 transition-all shadow-md flex items-center gap-1.5 active:scale-95"
              >
                <Share2 className="w-4 h-4" />
                <span>Shareable Card</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stop-by-Stop Vertical Timeline */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        {stops.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-pinpic-border-light dark:border-pinpic-outline-dark rounded-3xl p-8">
            <p className="text-sm text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark">
              No stops currently in this day out story.
            </p>
          </div>
        ) : (
          <div className="relative border-l-2 border-amber-500/30 ml-4 sm:ml-6 pl-6 sm:pl-8 space-y-8">
            {stops.map((stop) => {
              const isEditing = editingStopIndex === stop.stopIndex;

              return (
                <div key={stop.stopIndex} className="relative space-y-3">
                  {/* Timeline Stop Badge */}
                  <div className="absolute -left-[37px] sm:-left-[45px] top-0 w-8 h-8 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center shadow-md">
                    {stop.stopIndex + 1}
                  </div>

                  {/* Stop Header with Time and Place */}
                  <div className="flex items-center justify-between">
                    <div>
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={stopNameInput}
                            onChange={(e) => setStopNameInput(e.target.value)}
                            placeholder="e.g. Blue Tokai Cafe"
                            className="px-2.5 py-1 text-sm font-bold bg-black/5 dark:bg-white/5 border border-amber-500 rounded-lg focus:outline-none"
                          />
                          <button
                            onClick={() => handleSaveStopName(stop.stopIndex)}
                            className="p-1 rounded bg-amber-500 text-white"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </button>
                          <button
                            onClick={() => setEditingStopIndex(null)}
                            className="p-1 rounded hover:bg-black/5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-base sm:text-lg">
                            {stop.time ? `${stop.time} · ` : ''}{stop.placeName}
                          </h3>
                          <button
                            onClick={() => {
                              setStopNameInput(stop.placeName);
                              setEditingStopIndex(stop.stopIndex);
                            }}
                            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 text-pinpic-text-secondary-light"
                            title="Edit place name"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      <p className="text-xs text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark">
                        {stop.photos.length} photos at this stop
                      </p>
                    </div>
                  </div>

                  {/* Photos Grid for this Stop */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {stop.photos.map((photo) => (
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

                        {/* Remove from day out */}
                        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPhotoToRemove(photo);
                            }}
                            title="Remove photo from this day out"
                            className="p-1.5 rounded-full bg-black/60 hover:bg-red-500 text-white transition-colors backdrop-blur-sm shadow-md"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Shareable Summary Card Modal */}
      {isShareCardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-3xl p-6 shadow-2xl relative space-y-4 animate-in zoom-in-95">
            <button
              onClick={() => setIsShareCardOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xl">☀️</span>
              <span className="text-xs font-bold uppercase tracking-wider bg-white/25 px-2.5 py-0.5 rounded-full">
                PinPic Day Out
              </span>
            </div>

            <div>
              <h3 className="font-black text-2xl leading-tight">{collection.title}</h3>
              <p className="text-xs text-white/80 font-medium mt-1">{dateStr}</p>
            </div>

            {/* Route Stops Ribbon */}
            <div className="p-3 rounded-2xl bg-black/20 backdrop-blur-sm space-y-1.5 text-xs font-semibold">
              <div className="text-[10px] uppercase tracking-wider text-white/70">The Route</div>
              <div className="flex flex-wrap items-center gap-1.5">
                {stops.map((s, idx) => (
                  <React.Fragment key={s.stopIndex}>
                    <span className="bg-white/20 px-2 py-0.5 rounded-md truncate max-w-[120px]">
                      {s.placeName}
                    </span>
                    {idx < stops.length - 1 && <span>➔</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Featured Mini Collage (3 thumbnails) */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {allPhotos.slice(0, 3).map((p) => (
                <div key={p.photoId} className="aspect-square rounded-xl overflow-hidden shadow-md">
                  <img src={p.photoUrl || p.downloadUrl} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>

            <div className="pt-2 text-center text-[10px] text-white/75 font-medium">
              Made with PinPic • Relive your city moments
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
              Remove photo from this day out?
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

export default DayOutStoryLayout;
