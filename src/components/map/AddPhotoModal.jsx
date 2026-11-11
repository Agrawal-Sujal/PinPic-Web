import React, { useState, useRef } from 'react';
import { X, Upload, MapPin, Calendar, Globe, Lock, Users, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { localPhotoRepository } from '../../data/localPhotoRepository';
import { extractPhotoMetadata } from '../../utils/exifMetadata';

export const AddPhotoModal = ({ isOpen, onClose, initialLocation, onPhotoUploaded }) => {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [name, setName] = useState('');
  const [latitude, setLatitude] = useState(initialLocation?.lat ? initialLocation.lat.toString() : '');
  const [longitude, setLongitude] = useState(initialLocation?.lng ? initialLocation.lng.toString() : '');
  const [locationName, setLocationName] = useState('');
  const [visibility, setVisibility] = useState('PUBLIC');
  const [takenAt, setTakenAt] = useState(new Date().toISOString().slice(0, 16));
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef(null);
  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setName(file.name.replace(/\.[^/.]+$/, ''));

    // Try extracting EXIF/XMP GPS coordinates and taken date
    try {
      const metadata = await extractPhotoMetadata(file);
      if (metadata.latitude !== null && metadata.longitude !== null) {
        setLatitude(metadata.latitude.toFixed(6));
        setLongitude(metadata.longitude.toFixed(6));
        showToast('Extracted GPS location from photo EXIF!', 'success');
      }
      if (metadata.dateObject) {
        const d = metadata.dateObject;
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        setTakenAt(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
      }
    } catch (err) {
      console.warn('No EXIF data found or failed to parse:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      showToast('Please select a photo to pin', 'error');
      return;
    }

    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);
    if (isNaN(latNum) || isNaN(lngNum)) {
      showToast('Please provide valid latitude and longitude coordinates', 'error');
      return;
    }

    try {
      setUploading(true);

      const saved = await localPhotoRepository.savePhotosWithCluster({
        photos: [
          {
            name: name.trim() || selectedFile.name,
            file: selectedFile,
            previewUrl,
            takenAt: new Date(takenAt).toISOString(),
          },
        ],
        location: {
          latitude: latNum,
          longitude: lngNum,
          locationName: locationName.trim() || null,
        },
        dateStr: new Date(takenAt).toISOString(),
        userId: user?.userId,
        visibility,
      });

      showToast('Photo pinned locally! Syncing in background...', 'success');
      if (onPhotoUploaded) onPhotoUploaded(saved);
      onClose();
    } catch (err) {
      console.error('Photo save error:', err);
      showToast('Failed to save photo', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in">
      <div className="w-full max-w-lg bg-pinpic-surface-light dark:bg-pinpic-surface-container-dark rounded-3xl border border-pinpic-border-light dark:border-pinpic-outline-dark shadow-2xl p-6 my-8 animate-in zoom-in-95">
        <div className="flex items-center justify-between pb-4 border-b border-pinpic-border-light dark:border-pinpic-outline-dark">
          <h3 className="font-bold text-lg text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark">
            Pin New Photo
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-pinpic-text-secondary-light"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* File Selector / Preview */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="relative border-2 border-dashed border-pinpic-border-light dark:border-pinpic-outline-dark hover:border-pinpic-coral rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-black/[0.02] dark:bg-white/[0.02]"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            {previewUrl ? (
              <div className="relative w-full h-48 rounded-xl overflow-hidden">
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center text-white text-xs font-semibold">
                  Click to change photo
                </div>
              </div>
            ) : (
              <div className="py-8 text-center flex flex-col items-center gap-2">
                <div className="p-3.5 rounded-full bg-pinpic-coral/10 text-pinpic-coral">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark">
                  Click to choose a photo
                </p>
                <p className="text-xs text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark">
                  JPG, PNG, WebP • Auto-detects GPS location
                </p>
              </div>
            )}
          </div>

          {/* Photo Name */}
          <div>
            <label className="block text-xs font-semibold text-pinpic-text-secondary-light mb-1">
              Title / Caption
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sunset at the Beach"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-pinpic-surface-dark border border-pinpic-border-light dark:border-pinpic-outline-dark text-sm focus:outline-none focus:ring-2 focus:ring-pinpic-coral"
            />
          </div>

          {/* Coordinates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-pinpic-text-secondary-light mb-1">
                Latitude
              </label>
              <input
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="e.g. 19.0760"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-pinpic-surface-dark border border-pinpic-border-light dark:border-pinpic-outline-dark text-sm focus:outline-none focus:ring-2 focus:ring-pinpic-coral"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-pinpic-text-secondary-light mb-1">
                Longitude
              </label>
              <input
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="e.g. 72.8777"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-pinpic-surface-dark border border-pinpic-border-light dark:border-pinpic-outline-dark text-sm focus:outline-none focus:ring-2 focus:ring-pinpic-coral"
              />
            </div>
          </div>

          {/* Location Name & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-pinpic-text-secondary-light mb-1">
                Location Name (Optional)
              </label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Marine Drive"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-pinpic-surface-dark border border-pinpic-border-light dark:border-pinpic-outline-dark text-sm focus:outline-none focus:ring-2 focus:ring-pinpic-coral"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-pinpic-text-secondary-light mb-1">
                Date & Time Taken
              </label>
              <input
                type="datetime-local"
                value={takenAt}
                onChange={(e) => setTakenAt(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-pinpic-surface-dark border border-pinpic-border-light dark:border-pinpic-outline-dark text-sm focus:outline-none focus:ring-2 focus:ring-pinpic-coral"
              />
            </div>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-xs font-semibold text-pinpic-text-secondary-light mb-1.5">
              Visibility
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'PUBLIC', label: 'Public', icon: Globe },
                { id: 'FRIENDS', label: 'Followers', icon: Users },
                { id: 'PRIVATE', label: 'Private', icon: Lock },
              ].map(opt => {
                const Icon = opt.icon;
                const isSelected = visibility === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setVisibility(opt.id)}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-pinpic-coral text-white border-pinpic-coral shadow-sm'
                        : 'bg-white dark:bg-pinpic-surface-dark border-pinpic-border-light dark:border-pinpic-outline-dark text-pinpic-text-secondary-light'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={uploading}
            className="w-full py-3.5 rounded-2xl bg-pinpic-coral hover:bg-pinpic-coral/90 text-white font-bold text-sm shadow-lg shadow-pinpic-coral/25 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 mt-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Uploading to S3...</span>
              </>
            ) : (
              <span>Pin Photo to Map</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddPhotoModal;

