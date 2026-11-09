import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Edit3, Grid, User, MapPin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { userApi } from '../../api/userApi';
import FullScreenImageViewer from '../../components/common/FullScreenImageViewer';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export const ProfilePage = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(user || {});
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  useEffect(() => {
    const loadProfileAndPhotos = async () => {
      try {
        setLoading(true);
        const [profileData, userPhotos] = await Promise.all([
          userApi.getProfile().catch(() => user),
          user?.userId ? userApi.getUserPhotos(user.userId).catch(() => []) : [],
        ]);
        if (profileData) setProfile(profileData);
        setPhotos(userPhotos || []);
      } catch (err) {
        console.error('Profile fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProfileAndPhotos();
  }, [user?.userId]);

  return (
    <div className="min-h-screen bg-pinpic-bg-light dark:bg-pinpic-bg-dark text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark pb-28 pt-4 px-4 sm:px-6 max-w-3xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between py-3 border-b border-pinpic-border-light dark:border-pinpic-outline-dark">
        <h2 className="text-xl font-bold truncate">@{profile.username || 'user'}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/settings')}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-pinpic-teal dark:text-pinpic-teal-dark transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Profile Header Details */}
      <div className="py-6">
        <div className="flex items-center gap-6">
          {/* Avatar */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-pinpic-coral/10 border-2 border-pinpic-coral/30 flex-shrink-0 shadow-md">
            {profile.pictureUrl ? (
              <img src={profile.pictureUrl} alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-pinpic-coral font-bold text-2xl">
                {profile.name?.charAt(0) || profile.username?.charAt(0) || 'U'}
              </div>
            )}
          </div>

          {/* Stats Bar */}
          <div className="flex-1 flex justify-around text-center">
            <div>
              <span className="block text-lg sm:text-xl font-extrabold">{photos.length}</span>
              <span className="text-xs text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark font-medium">
                Photos
              </span>
            </div>
            <div>
              <span className="block text-lg sm:text-xl font-extrabold">{profile.followerCount || 0}</span>
              <span className="text-xs text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark font-medium">
                Followers
              </span>
            </div>
            <div>
              <span className="block text-lg sm:text-xl font-extrabold">{profile.followingCount || 0}</span>
              <span className="text-xs text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark font-medium">
                Following
              </span>
            </div>
          </div>
        </div>

        {/* Bio / Name */}
        <div className="mt-4">
          <h3 className="font-bold text-base">{profile.name || profile.username}</h3>
          <p className="text-xs text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark mt-0.5">
            {profile.email}
          </p>
        </div>

        {/* Action Button */}
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => navigate('/profile/edit')}
            className="flex-1 py-2.5 px-4 rounded-xl bg-pinpic-surface-light dark:bg-pinpic-surface-container-dark border border-pinpic-border-light dark:border-pinpic-outline-dark hover:border-pinpic-coral font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <Edit3 className="w-4 h-4 text-pinpic-coral" />
            <span>Edit Profile</span>
          </button>
        </div>
      </div>

      {/* Photos Grid Header */}
      <div className="border-t border-pinpic-border-light dark:border-pinpic-outline-dark pt-4 mb-4 flex items-center gap-2 text-xs font-bold text-pinpic-coral uppercase tracking-wider">
        <Grid className="w-4 h-4" />
        <span>My Memories</span>
      </div>

      {/* Grid */}
      {loading ? (
        <LoadingSpinner text="Loading memories..." />
      ) : photos.length === 0 ? (
        <div className="text-center py-16 text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark text-xs">
          No pinned photos yet. Use the Map or Gallery to add photos!
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo, idx) => (
            <div
              key={photo.photoId || photo.id}
              onClick={() => {
                setViewerIndex(idx);
                setViewerOpen(true);
              }}
              className="relative aspect-square rounded-xl overflow-hidden bg-black/5 cursor-pointer group shadow-sm hover:opacity-90"
            >
              <img
                src={photo.downloadUrl || photo.url}
                alt={photo.name || 'Photo'}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      )}

      {/* Full-Screen Image Viewer */}
      <FullScreenImageViewer
        photos={photos}
        initialIndex={viewerIndex}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />
    </div>
  );
};

export default ProfilePage;

