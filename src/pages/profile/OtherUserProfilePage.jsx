import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, UserPlus, UserCheck, Grid } from 'lucide-react';
import { userApi } from '../../api/userApi';
import { useToast } from '../../context/ToastContext';
import FullScreenImageViewer from '../../components/common/FullScreenImageViewer';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export const OtherUserProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [profile, setProfile] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  useEffect(() => {
    const fetchOtherUser = async () => {
      try {
        setLoading(true);
        const [profileRes, photosRes] = await Promise.all([
          userApi.getUserProfile(userId),
          userApi.getUserPhotos(userId).catch(() => []),
        ]);
        setProfile(profileRes);
        setPhotos(photosRes || []);
      } catch (err) {
        console.error('Error fetching user profile:', err);
        showToast('Failed to load user profile', 'error');
      } finally {
        setLoading(false);
      }
    };

    if (userId) fetchOtherUser();
  }, [userId]);

  const handleToggleFollow = async () => {
    if (!profile) return;
    try {
      setFollowLoading(true);
      if (profile.isFollowing) {
        await userApi.unfollowUser(profile.id);
        setProfile(prev => ({ ...prev, isFollowing: false, followerCount: prev.followerCount - 1 }));
        showToast(`Unfollowed @${profile.username}`, 'info');
      } else {
        await userApi.followUser(profile.id);
        setProfile(prev => ({ ...prev, isFollowing: true, followerCount: prev.followerCount + 1 }));
        showToast(`Following @${profile.username}`, 'success');
      }
    } catch (err) {
      console.error('Follow error:', err);
      showToast('Action failed', 'error');
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner text="Loading profile..." />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen p-8 text-center">
        <p>User not found.</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-pinpic-coral underline font-bold">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pinpic-bg-light dark:bg-pinpic-bg-dark text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark pb-28 pt-4 px-4 sm:px-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 py-3 border-b border-pinpic-border-light dark:border-pinpic-outline-dark mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold truncate">@{profile.username}</h1>
      </div>

      {/* Profile Header Details */}
      <div className="pb-6">
        <div className="flex items-center gap-6">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-pinpic-coral/10 border-2 border-pinpic-coral/30 flex-shrink-0 shadow-md">
            {profile.pictureUrl ? (
              <img src={profile.pictureUrl} alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-pinpic-coral font-bold text-2xl">
                {profile.name?.charAt(0) || profile.username?.charAt(0) || 'U'}
              </div>
            )}
          </div>

          <div className="flex-1 flex justify-around text-center">
            <div>
              <span className="block text-lg sm:text-xl font-extrabold">{photos.length}</span>
              <span className="text-xs text-pinpic-text-secondary-light font-medium">Photos</span>
            </div>
            <div>
              <span className="block text-lg sm:text-xl font-extrabold">{profile.followerCount || 0}</span>
              <span className="text-xs text-pinpic-text-secondary-light font-medium">Followers</span>
            </div>
            <div>
              <span className="block text-lg sm:text-xl font-extrabold">{profile.followingCount || 0}</span>
              <span className="text-xs text-pinpic-text-secondary-light font-medium">Following</span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <h3 className="font-bold text-base">{profile.name || profile.username}</h3>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 flex gap-3">
          <button
            onClick={handleToggleFollow}
            disabled={followLoading}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm ${
              profile.isFollowing
                ? 'bg-black/5 dark:bg-white/10 text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark hover:bg-black/10'
                : 'bg-pinpic-coral text-white hover:bg-pinpic-coral/90'
            }`}
          >
            {profile.isFollowing ? (
              <>
                <UserCheck className="w-4 h-4" />
                <span>Following</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Follow</span>
              </>
            )}
          </button>

          <button
            onClick={() => navigate(`/user/${profile.id}/map`)}
            className="flex-1 py-2.5 px-4 rounded-xl bg-pinpic-teal hover:bg-pinpic-teal/90 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <MapPin className="w-4 h-4" />
            <span>View on Map</span>
          </button>
        </div>
      </div>

      {/* Photos Section */}
      <div className="border-t border-pinpic-border-light dark:border-pinpic-outline-dark pt-4 mb-4 flex items-center gap-2 text-xs font-bold text-pinpic-coral uppercase tracking-wider">
        <Grid className="w-4 h-4" />
        <span>Photos</span>
      </div>

      {photos.length === 0 ? (
        <div className="text-center py-16 text-pinpic-text-secondary-light text-xs">
          No public photos available.
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

export default OtherUserProfilePage;

