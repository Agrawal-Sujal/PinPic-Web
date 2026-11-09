import api from './client';

export const userApi = {
  getProfile: async () => {
    const response = await api.get('/users/profile');
    return response.data;
  },

  updateProfile: async (profileData) => {
    // profileData: { name, mobileNumber, locale, pictureUrl }
    const response = await api.post('/users/profile', profileData);
    return response.data;
  },

  searchUsers: async (query) => {
    const response = await api.get('/users/search', {
      params: { query },
    });
    return response.data;
  },

  getUserProfile: async (userId) => {
    const response = await api.get(`/users/${userId}/profile`);
    return response.data;
  },

  getUserPhotos: async (userId) => {
    const response = await api.get(`/users/${userId}/photos`);
    return response.data;
  },

  getUserClusters: async (userId) => {
    const response = await api.get(`/users/${userId}/clusters`);
    return response.data;
  },

  followUser: async (followingId) => {
    const response = await api.post(`/users/follow/${followingId}`);
    return response.data;
  },

  unfollowUser: async (followingId) => {
    const response = await api.delete(`/users/follow/${followingId}`);
    return response.data;
  },

  initiateProfilePhotoUpload: async (filename) => {
    const response = await api.post('/profile-photo/initiate-upload', { name: filename });
    return response.data;
  },

  confirmProfilePhotoUpload: async (s3Key) => {
    const response = await api.post('/profile-photo/confirm-upload', { s3Key });
    return response.data;
  },
};

