import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Calendar,
  Clock,
  Trash2,
  Plus,
  ArrowLeft,
  Sparkles,
  ArrowUpDown,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '../../context/ToastContext';
import { localCollectionRepository } from '../../data/localCollectionRepository';
import PhotoSelectionStep from '../../components/events/PhotoSelectionStep';
import FullScreenImageViewer from '../../components/common/FullScreenImageViewer';
import DeleteCollectionModal from '../../components/events/DeleteCollectionModal';

export const CustomStoryLayout = ({ collection, onReload }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  // Add more photos modal state
  const [isAddPhotosModalOpen, setIsAddPhotosModalOpen] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState(new Set());

  // Sorting state
  const [sortOrder, setSortOrder] = useState(collection.sortOrder || 'newest');

  // Deletion modals
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [photoToRemove, setPhotoToRemove] = useState(null);

  if (!collection) return null;

  let allPhotos = [...(collection.photos || [])];

  // Apply client-side sorting
  if (sortOrder === 'oldest') {
    allPhotos.sort((a, b) => new Date(a.takenAt || 0) - new Date(b.takenAt || 0));
  } else if (sortOrder === 'newest') {
    allPhotos.sort((a, b) => new Date(b.takenAt || 0) - new Date(a.takenAt || 0));
  } else if (sortOrder === 'name') {
    allPhotos.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  const coverUrl = collection.coverPhoto?.photoUrl || collection.coverPhoto?.downloadUrl;

  const handleOpenViewer = (photo) => {
    const idx = allPhotos.findIndex((p) => p.photoId === photo.photoId);
    setViewerIndex(idx >= 0 ? idx : 0);
    setViewerOpen(true);
  };

  const handleSortChange = async (newSort) => {
    setSortOrder(newSort);
    try {
      await localCollectionRepository.updateCollectionMetadata(collection.id, {
        sortOrder: newSort,
      });
      if (onReload) onReload();
    } catch (err) {
      console.error('Failed to update sort order:', err);
    }
  };

  const handleAddPhotos = async () => {
    if (selectedToAdd.size === 0) return;
    try {
      await localCollectionRepository.addPhotosToCollection(
        collection.id,
        Array.from(selectedToAdd)
      );
      showToast(`Added ${selectedToAdd.size} photo(s) to collection`, 'success');
      setIsAddPhotosModalOpen(false);
      setSelectedToAdd(new Set());
      if (onReload) onReload();
    } catch (err) {
      console.error('Failed to add photos to collection:', err);
      showToast('Failed to add photos', 'error');
    }
  };

  const handleRemovePhoto = async () => {
    if (!photoToRemove) return;
    try {
      await localCollectionRepository.removePhotoFromCollection(collection.id, photoToRemove.photoId);
      showToast('Photo removed from collection (kept on map & gallery)', 'success');
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
          ? 'Collection and photos deleted'
          : 'Collection deleted (photos kept safely in gallery & map)',
        'success'
      );
      setIsDeleteModalOpen(false);
      navigate('/events', { replace: true });
    } catch (err) {
      console.error('Failed to delete collection:', err);
      showToast('Failed to delete collection', 'error');
    }
  };

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
              {allPhotos.length} photos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddPhotosModalOpen(true)}
            className="px-3.5 py-1.5 rounded-full border border-pinpic-border-light dark:border-pinpic-outline-dark hover:bg-black/5 dark:hover:bg-white/5 font-semibold text-xs flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden sm:inline">Add Photos</span>
          </button>

          <button
            onClick={() => navigate(`/map?collectionId=${collection.id}`)}
            className="px-4 py-1.5 rounded-full bg-blue-600 text-white font-semibold text-xs hover:opacity-95 transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Map View</span>
          </button>

          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="p-2 rounded-full text-red-500 hover:bg-red-500/10 transition-colors"
            aria-label="Delete Collection"
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
            <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-4xl">
              ✨
            </div>
          )}

          {/* Dark Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex flex-col justify-end p-6 sm:p-8 text-white">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-600 text-white backdrop-blur-sm">
                ✨ Custom Collection
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

            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() => navigate(`/map?collectionId=${collection.id}`)}
                className="px-4 py-2 rounded-full bg-white text-gray-900 font-bold text-xs hover:bg-white/90 transition-all shadow-md flex items-center gap-1.5 active:scale-95"
              >
                <MapPin className="w-4 h-4 text-blue-600" />
                <span>View Pins on Map</span>
              </button>

              <button
                onClick={() => setIsAddPhotosModalOpen(true)}
                className="px-4 py-2 rounded-full bg-blue-600 text-white font-bold text-xs hover:opacity-90 transition-all shadow-md flex items-center gap-1.5 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Add More Photos</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Area & Toolbar */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-4">
        {/* Sorting Toolbar */}
        <div className="flex items-center justify-between pb-2 border-b border-pinpic-border-light dark:border-pinpic-outline-dark">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-pinpic-text-secondary-light" />
            <span className="text-xs font-bold text-pinpic-text-secondary-light">Sort:</span>
            <div className="flex items-center gap-1 text-xs">
              <button
                onClick={() => handleSortChange('newest')}
                className={`px-2.5 py-1 rounded-full font-semibold transition-colors ${
                  sortOrder === 'newest'
                    ? 'bg-blue-600 text-white'
                    : 'text-pinpic-text-secondary-light hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                Newest
              </button>
              <button
                onClick={() => handleSortChange('oldest')}
                className={`px-2.5 py-1 rounded-full font-semibold transition-colors ${
                  sortOrder === 'oldest'
                    ? 'bg-blue-600 text-white'
                    : 'text-pinpic-text-secondary-light hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                Oldest
              </button>
              <button
                onClick={() => handleSortChange('name')}
                className={`px-2.5 py-1 rounded-full font-semibold transition-colors ${
                  sortOrder === 'name'
                    ? 'bg-blue-600 text-white'
                    : 'text-pinpic-text-secondary-light hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                Name
              </button>
            </div>
          </div>

          <span className="text-xs text-pinpic-text-secondary-light">
            {allPhotos.length} photos
          </span>
        </div>

        {allPhotos.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-pinpic-border-light dark:border-pinpic-outline-dark rounded-3xl p-8 space-y-3">
            <p className="text-sm text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark">
              No photos currently in this custom collection.
            </p>
            <button
              onClick={() => setIsAddPhotosModalOpen(true)}
              className="px-5 py-2 rounded-full font-bold text-xs bg-blue-600 text-white inline-flex items-center gap-1.5 shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Add Uploaded Photos</span>
            </button>
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

                  {/* Top Action Pill (Remove from Collection) */}
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPhotoToRemove(photo);
                      }}
                      title="Remove photo from collection"
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
                    <span className="truncate font-semibold text-white">{photo.name}</span>
                    {photoDate && (
                      <div className="flex items-center gap-1 truncate text-white/80">
                        <Calendar className="w-2.5 h-2.5 flex-shrink-0" />
                        <span>{format(photoDate, 'MMM d, yyyy')}</span>
                      </div>
                    )}
                    {locationText && (
                      <div className="flex items-center gap-1 truncate text-white/80 font-medium">
                        <MapPin className="w-2.5 h-2.5 text-blue-300 flex-shrink-0" />
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

      {/* Add Photos Modal */}
      {isAddPhotosModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-pinpic-surface-light dark:bg-pinpic-surface-container-dark rounded-3xl p-6 shadow-2xl border border-pinpic-border-light dark:border-pinpic-outline-dark space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-pinpic-border-light dark:border-pinpic-outline-dark">
              <h3 className="font-bold text-base">Add Uploaded Photos to Collection</h3>
              <button
                onClick={() => setIsAddPhotosModalOpen(false)}
                className="p-1 rounded-full hover:bg-black/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <PhotoSelectionStep
                selectedPhotoIds={selectedToAdd}
                onTogglePhoto={(id) => {
                  setSelectedToAdd((prev) => {
                    const next = new Set(prev);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  });
                }}
                onSelectAll={(ids) => setSelectedToAdd(new Set(ids))}
                onClearAll={() => setSelectedToAdd(new Set())}
                onNext={handleAddPhotos}
                onBack={() => setIsAddPhotosModalOpen(false)}
              />
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
              Remove photo from this collection?
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

export default CustomStoryLayout;
