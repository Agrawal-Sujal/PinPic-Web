import React, { useRef } from 'react';
import { MapPin, Image as ImageIcon, Calendar, Clock, Plus, X, Upload, Loader2 } from 'lucide-react';

/**
 * Bottom Sheet for the 3-step Add Photo flow matching Android's AddPhotoBottomSheetContent:
 * (a) SELECT_LOCATION: "Select a Location - Tap anywhere on the map to drop a pin."
 * (b) LOCATION_SELECTED: Pin placed, "Select Photos" button.
 * (c) PHOTOS_SELECTED: Photos preview grid + "Add more", Date input, Time input, "Add Photos" button.
 */
export const AddPhotoBottomSheet = ({
  addPhotoMode,
  selectedLocation,
  pendingPhotos = [],
  onSelectPhotos,
  onRemovePhoto,
  dateText,
  onDateTextChange,
  onOpenDatePicker,
  timeText,
  onTimeTextChange,
  onOpenTimePicker,
  onSubmit,
  onCancel,
  isUploading = false,
  uploadProgress = { current: 0, total: 0 },
}) => {
  const fileInputRef = useRef(null);

  if (addPhotoMode === 'NONE') return null;

  const handleFileInputChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onSelectPhotos(files);
    }
    // Reset file input value so selecting the same files again triggers onChange
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFilePicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="fixed bottom-24 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-[460px] z-30 pointer-events-auto">
      {/* Hidden Multiple File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />

      <div className="bg-pinpic-surface-light dark:bg-pinpic-surface-container-dark rounded-3xl border border-pinpic-border-light dark:border-pinpic-outline-dark shadow-2xl backdrop-blur-md p-5 animate-in slide-in-from-bottom-5 transition-all">
        {/* Step 1: SELECT_LOCATION */}
        {addPhotoMode === 'SELECT_LOCATION' && (
          <div className="flex flex-col items-center text-center py-2">
            <div className="p-3.5 rounded-2xl bg-pinpic-coral/10 text-pinpic-coral mb-3 animate-bounce">
              <MapPin className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-base text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark">
              Select a Location
            </h3>
            <p className="text-xs text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark mt-1 max-w-xs">
              Tap anywhere on the map to drop a pin for your photo.
            </p>
          </div>
        )}

        {/* Step 2: LOCATION_SELECTED */}
        {addPhotoMode === 'LOCATION_SELECTED' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-pinpic-border-light dark:border-pinpic-outline-dark">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-2 rounded-xl bg-pinpic-coral/10 text-pinpic-coral flex-shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <span className="text-xs font-bold text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark block">
                    Location Selected
                  </span>
                  <span className="text-[11px] text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark truncate block">
                    {selectedLocation?.lat?.toFixed(5)}, {selectedLocation?.lng?.toFixed(5)}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-pinpic-text-secondary-light">
                Tap map to move pin
              </span>
            </div>

            <button
              type="button"
              onClick={triggerFilePicker}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-pinpic-coral hover:bg-pinpic-coral/95 text-white font-bold text-sm shadow-lg shadow-pinpic-coral/25 active:scale-98 transition-all"
            >
              <Upload className="w-4 h-4 stroke-[2.5]" />
              <span>Select Photos</span>
            </button>
          </div>
        )}

        {/* Step 3: PHOTOS_SELECTED */}
        {addPhotoMode === 'PHOTOS_SELECTED' && (
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-0.5">
            {/* Header: Photo count + Add More */}
            <div className="flex items-center justify-between pb-3 border-b border-pinpic-border-light dark:border-pinpic-outline-dark">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-pinpic-coral/10 text-pinpic-coral">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark">
                    Selected {pendingPhotos.length} {pendingPhotos.length === 1 ? 'photo' : 'photos'}
                  </h4>
                  <p className="text-[11px] text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark">
                    At {selectedLocation?.lat?.toFixed(4)}, {selectedLocation?.lng?.toFixed(4)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={triggerFilePicker}
                className="flex items-center gap-1 text-xs font-bold text-pinpic-coral hover:underline px-2.5 py-1 rounded-lg hover:bg-pinpic-coral/10 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Add more</span>
              </button>
            </div>

            {/* 3-Column Image Preview Grid */}
            <div className="grid grid-cols-3 gap-2 max-h-44 overflow-y-auto p-1 bg-black/[0.02] dark:bg-white/[0.02] rounded-2xl border border-pinpic-border-light dark:border-pinpic-outline-dark">
              {pendingPhotos.map((item, idx) => (
                <div
                  key={idx}
                  className="relative aspect-square rounded-xl overflow-hidden bg-black/5 group shadow-sm"
                >
                  <img
                    src={item.previewUrl}
                    alt={item.name || `Photo ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {/* Remove Photo Button */}
                  <button
                    type="button"
                    onClick={() => onRemovePhoto(idx)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/60 hover:bg-black/80 text-white transition-opacity shadow-sm"
                    title="Remove photo"
                  >
                    <X className="w-3 h-3 stroke-[2.5]" />
                  </button>
                </div>
              ))}
            </div>

            {/* Date and Time Pickers Section */}
            <div className="space-y-3 pt-1">
              {/* Date Input */}
              <div>
                <label className="block text-xs font-semibold text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark mb-1">
                  Date (DD/MM/YYYY)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={dateText}
                    onChange={(e) => onDateTextChange(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-white dark:bg-pinpic-surface-dark border border-pinpic-border-light dark:border-pinpic-outline-dark text-xs font-medium focus:outline-none focus:ring-2 focus:ring-pinpic-coral text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark"
                  />
                  <button
                    type="button"
                    onClick={onOpenDatePicker}
                    className="absolute right-2 p-1.5 rounded-lg text-pinpic-text-secondary-light hover:text-pinpic-coral hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    title="Open calendar"
                  >
                    <Calendar className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Time Input */}
              <div>
                <label className="block text-xs font-semibold text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark mb-1">
                  Time (12 hr format)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={timeText}
                    onChange={(e) => onTimeTextChange(e.target.value)}
                    placeholder="hh:mm a (e.g. 03:45 PM)"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-white dark:bg-pinpic-surface-dark border border-pinpic-border-light dark:border-pinpic-outline-dark text-xs font-medium focus:outline-none focus:ring-2 focus:ring-pinpic-coral text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark"
                  />
                  <button
                    type="button"
                    onClick={onOpenTimePicker}
                    className="absolute right-2 p-1.5 rounded-lg text-pinpic-text-secondary-light hover:text-pinpic-coral hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    title="Open clock"
                  >
                    <Clock className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={onSubmit}
                disabled={isUploading || pendingPhotos.length === 0}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-pinpic-coral hover:bg-pinpic-coral/95 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-pinpic-coral/25 active:scale-98 transition-all"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>
                      Uploading photos... ({uploadProgress.current}/{uploadProgress.total})
                    </span>
                  </>
                ) : (
                  <span>Add Photos</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddPhotoBottomSheet;
