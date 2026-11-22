import React, { useState } from 'react';
import { Trash2, AlertTriangle, X, Check } from 'lucide-react';

export const DeleteCollectionModal = ({ isOpen, collection, onClose, onConfirm }) => {
  const [deletePhotos, setDeletePhotos] = useState(false); // Default MUST be false (keep photos)

  if (!isOpen || !collection) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-pinpic-surface-light dark:bg-pinpic-surface-container-dark rounded-3xl p-6 shadow-2xl border border-pinpic-border-light dark:border-pinpic-outline-dark animate-in zoom-in-95 duration-200 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark">
                Delete Collection
              </h3>
              <p className="text-xs text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark">
                "{collection.title}"
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark">
          What would you like to do with the {collection.photoCount || collection.photos?.length || 0} photo(s) in this collection?
        </p>

        {/* Options (Keep photos is DEFAULT) */}
        <div className="space-y-2.5">
          {/* Option 1: Keep photos (DEFAULT) */}
          <div
            onClick={() => setDeletePhotos(false)}
            className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
              !deletePhotos
                ? 'border-pinpic-coral dark:border-pinpic-coral-dark bg-pinpic-coral/5 dark:bg-pinpic-coral-dark/5'
                : 'border-pinpic-border-light dark:border-pinpic-outline-dark hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full mt-0.5 flex items-center justify-center border transition-all ${
                !deletePhotos
                  ? 'border-pinpic-coral dark:border-pinpic-coral-dark bg-pinpic-coral dark:bg-pinpic-coral-dark text-white'
                  : 'border-pinpic-border-light dark:border-pinpic-outline-dark'
              }`}
            >
              {!deletePhotos && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark">
                  Keep photos (Recommended)
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-green-500/15 text-green-600 dark:text-green-400">
                  Default
                </span>
              </div>
              <p className="text-[11px] text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark mt-0.5">
                Remove this collection story only. All photos stay on your map and in your gallery.
              </p>
            </div>
          </div>

          {/* Option 2: Delete photos */}
          <div
            onClick={() => setDeletePhotos(true)}
            className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
              deletePhotos
                ? 'border-red-500 bg-red-500/5 dark:bg-red-500/10'
                : 'border-pinpic-border-light dark:border-pinpic-outline-dark hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full mt-0.5 flex items-center justify-center border transition-all ${
                deletePhotos
                  ? 'border-red-500 bg-red-500 text-white'
                  : 'border-pinpic-border-light dark:border-pinpic-outline-dark'
              }`}
            >
              {deletePhotos && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
            <div>
              <span className="font-bold text-xs text-red-600 dark:text-red-400">
                Also delete photos
              </span>
              <p className="text-[11px] text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark mt-0.5">
                Permanently delete all photos in this collection from your library and map.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full font-semibold text-xs border border-pinpic-border-light dark:border-pinpic-outline-dark text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(deletePhotos)}
            className="px-5 py-2 rounded-full font-semibold text-xs bg-red-500 hover:bg-red-600 text-white transition-colors shadow-md flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Collection</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteCollectionModal;
