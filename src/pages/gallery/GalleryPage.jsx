import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CheckSquare,
  Square,
  Trash2,
  Eye,
  Plus,
  RefreshCw,
  Image as ImageIcon,
  Check,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { localPhotoRepository } from '../../data/localPhotoRepository';
import { useSyncStatus } from '../../hooks/useSyncStatus';
import ChangeVisibilityModal from '../../components/gallery/ChangeVisibilityModal';
import ImportProgressModal from '../../components/gallery/ImportProgressModal';
import FullScreenImageViewer from '../../components/common/FullScreenImageViewer';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export const GalleryPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { isSyncing, triggerSync } = useSyncStatus();

  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isVisibilityModalOpen, setIsVisibilityModalOpen] = useState(false);

  // Multi-photo import progress state matching Android ImportProgressDialog
  const [importState, setImportState] = useState({
    isImporting: false,
    current: 0,
    total: 0,
  });

  const fileInputRef = useRef(null);

  // Full-screen viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const fetchPhotos = useCallback(async () => {
    try {
      setLoading(true);
      const res = await localPhotoRepository.getAllPhotos(user?.userId);
      setPhotos(res || []);
    } catch (err) {
      console.error('Error fetching photos from local repository:', err);
      showToast('Failed to load gallery photos', 'error');
    } finally {
      setLoading(false);
    }
  }, [user?.userId, showToast]);

  useEffect(() => {
    fetchPhotos();
    const unsubscribe = localPhotoRepository.subscribe(() => {
      fetchPhotos();
    });
    return unsubscribe;
  }, [fetchPhotos]);

  const toggleSelectPhoto = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.size === 0) setIsSelectionMode(false);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === photos.length) {
      setSelectedIds(new Set());
      setIsSelectionMode(false);
    } else {
      setSelectedIds(new Set(photos.map((p) => p.localPhotoId || p.photoId || p.id)));
      setIsSelectionMode(true);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} selected photo(s)?`)) return;

    try {
      await localPhotoRepository.deletePhotos(Array.from(selectedIds));
      showToast(`Deleted ${selectedIds.size} photo(s)`, 'success');
      setSelectedIds(new Set());
      setIsSelectionMode(false);
      fetchPhotos();
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Failed to delete photos', 'error');
    }
  };

  const handleApplyVisibility = async (newVisibility) => {
    try {
      await localPhotoRepository.updatePhotosVisibility(Array.from(selectedIds), newVisibility);
      showToast(`Updated visibility to ${newVisibility}`, 'success');
      setIsVisibilityModalOpen(false);
      setSelectedIds(new Set());
      setIsSelectionMode(false);
      fetchPhotos();
    } catch (err) {
      console.error('Visibility update error:', err);
      showToast('Failed to update visibility', 'error');
    }
  };

  const handlePhotoClick = (index, photoId) => {
    if (isSelectionMode) {
      toggleSelectPhoto(photoId);
    } else {
      setViewerIndex(index);
      setViewerOpen(true);
    }
  };

  const handleOpenPhotoPicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFilesSelected = async (e) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    setImportState({
      isImporting: true,
      current: 0,
      total: files.length,
    });

    try {
      const inserted = await localPhotoRepository.importPhotos(files, {
        onProgress: (current, total) => {
          setImportState((prev) => ({ ...prev, current, total }));
        },
        userId: user?.userId,
      });

      showToast(`Successfully imported ${inserted.length} photo(s)`, 'success');
      fetchPhotos();
    } catch (err) {
      console.error('Failed to import photos:', err);
      showToast('Failed to import photos', 'error');
    } finally {
      setImportState({
        isImporting: false,
        current: 0,
        total: 0,
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="min-h-screen bg-pinpic-bg-light dark:bg-pinpic-bg-dark text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark pb-28 pt-4 px-4 sm:px-6 max-w-5xl mx-auto">
      {/* Top Header / Action Toolbar */}
      <div className="flex items-center justify-between py-3 mb-4 border-b border-pinpic-border-light dark:border-pinpic-outline-dark">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gallery</h1>
          <p className="text-xs text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark mt-0.5">
            {photos.length} captured moments
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isSelectionMode ? (
            <>
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10"
              >
                {selectedIds.size === photos.length ? 'Deselect All' : 'Select All'}
              </button>
              <button
                onClick={() => {
                  setIsSelectionMode(false);
                  setSelectedIds(new Set());
                }}
                className="text-xs font-semibold px-3 py-1.5 rounded-full text-pinpic-coral hover:bg-pinpic-coral/10"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  fetchPhotos();
                  triggerSync(user?.userId);
                }}
                title={isSyncing ? 'Syncing changes...' : 'Refresh & Sync'}
                className="p-2 rounded-full border border-pinpic-border-light dark:border-pinpic-outline-dark hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isSyncing || loading ? 'animate-spin text-pinpic-coral' : ''}`}
                />
              </button>
              <button
                onClick={handleOpenPhotoPicker}
                className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-full bg-pinpic-coral text-white shadow-sm hover:bg-pinpic-coral/90 transition-transform active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Upload</span>
              </button>
              {photos.length > 0 && (
                <button
                  onClick={() => setIsSelectionMode(true)}
                  className="text-xs font-semibold px-3 py-2 rounded-full border border-pinpic-border-light dark:border-pinpic-outline-dark hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  Select
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Floating Selection Action Bar */}
      {isSelectionMode && selectedIds.size > 0 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-2.5 rounded-full bg-pinpic-surface-light dark:bg-pinpic-surface-container-dark border border-pinpic-border-light dark:border-pinpic-outline-dark shadow-2xl backdrop-blur-md animate-in slide-in-from-top-4">
          <span className="text-xs font-bold text-pinpic-coral">
            {selectedIds.size} Selected
          </span>
          <div className="h-4 w-px bg-pinpic-border-light dark:bg-pinpic-outline-dark" />
          <button
            onClick={() => setIsVisibilityModalOpen(true)}
            className="flex items-center gap-1 text-xs font-semibold text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark hover:text-pinpic-coral transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Visibility</span>
          </button>
          <button
            onClick={handleDeleteSelected}
            className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      )}

      {/* Content State */}
      {loading ? (
        <LoadingSpinner text="Loading your photos..." />
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 rounded-full bg-pinpic-coral/10 text-pinpic-coral mb-3">
            <ImageIcon className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-base mb-1">No Photos Yet</h3>
          <p className="text-xs text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark max-w-xs mb-5">
            Your photos will show up here once you upload or pin them to the map.
          </p>
          <button
            onClick={handleOpenPhotoPicker}
            className="flex items-center gap-2 py-2.5 px-4 rounded-full bg-pinpic-coral text-white text-xs font-bold shadow-md hover:bg-pinpic-coral/90"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Upload Photos</span>
          </button>
        </div>
      ) : (
        /* Responsive Photos Grid */
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3">
          {photos.map((photo, idx) => {
            const photoId = photo.photoId || photo.id;
            const isSelected = selectedIds.has(photoId);

            return (
              <div
                key={photoId}
                onClick={() => handlePhotoClick(idx, photoId)}
                className={`relative aspect-square rounded-2xl overflow-hidden cursor-pointer group shadow-sm bg-black/5 transition-all select-none ${
                  isSelected
                    ? 'ring-4 ring-pinpic-coral scale-95'
                    : 'hover:opacity-90 active:scale-98'
                }`}
              >
                <img
                  src={photo.downloadUrl || photo.url}
                  alt={photo.name || 'Photo'}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />

                {/* Selection Overlay Checkbox */}
                {isSelectionMode && (
                  <div className="absolute top-2 right-2">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-pinpic-coral text-white shadow-md'
                          : 'bg-black/40 text-white/70 border-2 border-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                )}

                {/* Gradient Date Overlay on Hover */}
                {!isSelectionMode && photo.takenAt && (
                  <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[10px] text-white font-medium truncate">
                      {photo.name || format(new Date(photo.takenAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Hidden Multi-Photo File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFilesSelected}
        className="hidden"
      />

      {/* Visibility Modal */}
      <ChangeVisibilityModal
        isOpen={isVisibilityModalOpen}
        selectedCount={selectedIds.size}
        onClose={() => setIsVisibilityModalOpen(false)}
        onApply={handleApplyVisibility}
      />

      {/* Import Progress Modal */}
      <ImportProgressModal
        isOpen={importState.isImporting}
        current={importState.current}
        total={importState.total}
      />

      {/* Full-Screen Image Viewer */}
      <FullScreenImageViewer
        photos={photos}
        initialIndex={viewerIndex}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        onDelete={async (photoId) => {
          try {
            await localPhotoRepository.deletePhotos([photoId]);
            showToast('Photo deleted', 'success');
            fetchPhotos();
          } catch (err) {
            console.error('Delete photo error:', err);
            showToast('Failed to delete photo', 'error');
          }
        }}
      />
    </div>
  );
};

export default GalleryPage;

