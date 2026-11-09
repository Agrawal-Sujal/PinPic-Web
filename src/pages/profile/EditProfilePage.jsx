import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, User, Phone, Globe, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { userApi } from '../../api/userApi';
import { photoApi } from '../../api/photoApi';

export const EditProfilePage = () => {
  const { user, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || '');
  const [mobileNumber, setMobileNumber] = useState(user?.mobileNumber || '');
  const [locale, setLocale] = useState(user?.locale || 'en_US');
  const [pictureUrl, setPictureUrl] = useState(user?.pictureUrl || '');
  const [saving, setSaving] = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);

  const fileInputRef = useRef(null);

  const handleProfilePicChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingPic(true);
      // 1. Request presigned upload URL for profile picture
      const { s3Key, presignedUrl } = await userApi.initiateProfilePhotoUpload(file.name);

      // 2. Upload file directly to S3
      await photoApi.uploadToS3(presignedUrl, file);

      // 3. Confirm upload
      const confirmRes = await userApi.confirmProfilePhotoUpload(s3Key);
      if (confirmRes?.pictureUrl) {
        setPictureUrl(confirmRes.pictureUrl);
      } else {
        setPictureUrl(URL.createObjectURL(file));
      }

      showToast('Profile photo updated!', 'success');
      await refreshProfile();
    } catch (err) {
      console.error('Profile photo upload error:', err);
      showToast('Failed to upload profile photo', 'error');
    } finally {
      setUploadingPic(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await userApi.updateProfile({
        name: name.trim(),
        mobileNumber: mobileNumber.trim() || null,
        locale: locale.trim() || 'en_US',
        pictureUrl: pictureUrl || null,
      });

      showToast('Profile updated successfully!', 'success');
      await refreshProfile();
      navigate('/profile');
    } catch (err) {
      console.error('Update profile error:', err);
      showToast(err.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-pinpic-bg-light dark:bg-pinpic-bg-dark text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark pb-28 pt-4 px-4 sm:px-6 max-w-xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center gap-3 py-3 border-b border-pinpic-border-light dark:border-pinpic-outline-dark mb-6">
        <button
          onClick={() => navigate('/profile')}
          className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold tracking-tight">Edit Profile</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Picture Center */}
        <div className="flex flex-col items-center">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-pinpic-coral/10 border-2 border-pinpic-coral shadow-md">
              {pictureUrl ? (
                <img src={pictureUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-pinpic-coral font-bold text-3xl">
                  {name?.charAt(0) || user?.username?.charAt(0) || 'U'}
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={uploadingPic}
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 rounded-full bg-pinpic-coral text-white shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              {uploadingPic ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleProfilePicChange}
              className="hidden"
            />
          </div>
          <span className="text-xs text-pinpic-text-secondary-light mt-2 font-medium">
            Tap camera to change photo
          </span>
        </div>

        {/* Fields */}
        <div className="space-y-4 bg-pinpic-surface-light dark:bg-pinpic-surface-container-dark p-6 rounded-3xl border border-pinpic-border-light dark:border-pinpic-outline-dark shadow-sm">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-pinpic-text-secondary-light mb-1.5">
              Full Name
            </label>
            <div className="relative flex items-center">
              <User className="absolute left-3.5 w-4 h-4 text-pinpic-text-secondary-light" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Name"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-pinpic-surface-dark border border-pinpic-border-light dark:border-pinpic-outline-dark text-sm focus:outline-none focus:ring-2 focus:ring-pinpic-coral"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-pinpic-text-secondary-light mb-1.5">
              Mobile Number
            </label>
            <div className="relative flex items-center">
              <Phone className="absolute left-3.5 w-4 h-4 text-pinpic-text-secondary-light" />
              <input
                type="tel"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="+1 555-0100"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-pinpic-surface-dark border border-pinpic-border-light dark:border-pinpic-outline-dark text-sm focus:outline-none focus:ring-2 focus:ring-pinpic-coral"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-pinpic-text-secondary-light mb-1.5">
              Locale
            </label>
            <div className="relative flex items-center">
              <Globe className="absolute left-3.5 w-4 h-4 text-pinpic-text-secondary-light" />
              <input
                type="text"
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                placeholder="en_US"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-pinpic-surface-dark border border-pinpic-border-light dark:border-pinpic-outline-dark text-sm focus:outline-none focus:ring-2 focus:ring-pinpic-coral"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 rounded-2xl bg-pinpic-coral hover:bg-pinpic-coral/90 text-white font-bold text-sm shadow-md shadow-pinpic-coral/25 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {saving ? 'Saving Changes...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
};

export default EditProfilePage;

