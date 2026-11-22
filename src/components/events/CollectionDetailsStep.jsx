import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, Sparkles, Check, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { localCollectionRepository } from '../../data/localCollectionRepository';

export const CollectionDetailsStep = ({
  selectedPhotoIds,
  selectedType = 'trip',
  onBack,
  onCreate,
  isSubmitting,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverPhotoId, setCoverPhotoId] = useState(null);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [dateRangeText, setDateRangeText] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchSelectedPhotos = async () => {
      const ids = Array.from(selectedPhotoIds);
      const list = await localCollectionRepository.getPhotosForIds(ids);
      if (!isMounted) return;

      // Sort chronologically ascending for sensible default
      list.sort((a, b) => new Date(a.takenAt || 0) - new Date(b.takenAt || 0));
      setSelectedPhotos(list);

      // Default cover photo is the first photo
      if (list.length > 0 && !coverPhotoId) {
        setCoverPhotoId(list[0].photoId);
      }

      // Calculate date range
      const timestamps = list
        .map((p) => (p.takenAt ? new Date(p.takenAt).getTime() : null))
        .filter((t) => t != null && !isNaN(t))
        .sort((a, b) => a - b);

      if (timestamps.length > 0) {
        const start = new Date(timestamps[0]);
        const end = new Date(timestamps[timestamps.length - 1]);
        const startStr = format(start, 'MMM d, yyyy');
        const endStr = format(end, 'MMM d, yyyy');

        const diffDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
        setDateRangeText(startStr === endStr ? `${startStr} (1 Day)` : `${startStr} – ${endStr} (${diffDays} Days)`);

        // Default title suggestion if empty
        if (!title) {
          setTitle(`${diffDays} Days Trip`);
        }
      } else {
        setDateRangeText('Undated Trip');
        if (!title) setTitle('My Trip');
      }
    };

    fetchSelectedPhotos();
    return () => {
      isMounted = false;
    };
  }, [selectedPhotoIds]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    onCreate({
      type: selectedType,
      title: title.trim(),
      description: description.trim(),
      coverPhotoId: coverPhotoId || selectedPhotos[0]?.photoId,
      photoIds: Array.from(selectedPhotoIds),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark">
          Trip Story Details
        </h3>
        <p className="text-xs text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark mt-0.5">
          Name your trip, select a cover photo, and add optional memories.
        </p>
      </div>

      {/* Title Input */}
      <div>
        <label className="block text-xs font-bold text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark uppercase tracking-wider mb-1">
          Trip Title <span className="text-pinpic-coral">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. 4 days in Goa"
          required
          autoFocus
          className="w-full px-4 py-2.5 rounded-xl border border-pinpic-border-light dark:border-pinpic-outline-dark bg-pinpic-surface-light dark:bg-pinpic-surface-container-dark text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark font-medium text-sm focus:outline-none focus:ring-2 focus:ring-pinpic-coral transition-all"
        />
      </div>

      {/* Date Range Badge */}
      {dateRangeText && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-pinpic-coral/5 dark:bg-pinpic-coral-dark/5 border border-pinpic-coral/20 text-xs text-pinpic-coral dark:text-pinpic-coral-dark font-semibold">
          <Calendar className="w-4 h-4 flex-shrink-0" />
          <span>Calculated Timeline: {dateRangeText}</span>
        </div>
      )}

      {/* Cover Photo Selection */}
      <div>
        <label className="block text-xs font-bold text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark uppercase tracking-wider mb-1.5">
          Cover Photo <span className="text-[11px] font-normal normal-case opacity-75">(Tap any photo to select as cover)</span>
        </label>

        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 pt-1 max-w-full">
          {selectedPhotos.map((photo) => {
            const isCover = coverPhotoId === photo.photoId;
            return (
              <div
                key={photo.photoId}
                onClick={() => setCoverPhotoId(photo.photoId)}
                className={`group relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer transition-all ${
                  isCover
                    ? 'ring-3 ring-pinpic-coral dark:ring-pinpic-coral-dark scale-100 shadow-md'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                <img
                  src={photo.photoUrl || photo.downloadUrl}
                  alt={photo.name}
                  className="w-full h-full object-cover"
                />
                {isCover && (
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-0.5 text-white">
                    <Check className="w-4 h-4 text-pinpic-coral stroke-[3]" />
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-pinpic-coral px-1.5 py-0.5 rounded-full">
                      Cover
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Description Textarea */}
      <div>
        <label className="block text-xs font-bold text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark uppercase tracking-wider mb-1">
          Trip Story Description <span className="text-[11px] font-normal normal-case opacity-75">(Optional)</span>
        </label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What made this trip memorable? (e.g. Coastal drive, beach sunsets, and fort discoveries)"
          className="w-full px-4 py-2.5 rounded-xl border border-pinpic-border-light dark:border-pinpic-outline-dark bg-pinpic-surface-light dark:bg-pinpic-surface-container-dark text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark text-sm focus:outline-none focus:ring-2 focus:ring-pinpic-coral transition-all resize-none"
        />
      </div>

      {/* Action Footer */}
      <div className="pt-2 flex items-center justify-between border-t border-pinpic-border-light dark:border-pinpic-outline-dark">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-full font-semibold text-xs border border-pinpic-border-light dark:border-pinpic-outline-dark text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Photos</span>
        </button>

        <button
          type="submit"
          disabled={!title.trim() || isSubmitting}
          className="px-6 py-2.5 rounded-full font-semibold text-sm bg-pinpic-coral dark:bg-pinpic-coral-dark text-white hover:opacity-95 transition-all shadow-md active:scale-95 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <span>Creating Trip...</span>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Create Trip Story</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default CollectionDetailsStep;
