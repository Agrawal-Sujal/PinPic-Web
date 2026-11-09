import api from './client';
import axios from 'axios';

export const photoApi = {
  initiateUpload: async (filename) => {
    const response = await api.post('/photos/initiate-upload', { name: filename });
    return response.data; // { s3Key, presignedUrl }
  },

  uploadToS3: async (presignedUrl, file) => {
    // Direct PUT to AWS S3 without Authorization header
    await axios.put(presignedUrl, file, {
      headers: {
        'Content-Type': file.type || 'image/jpeg',
      },
    });
  },

  confirmUpload: async ({ s3Key, name, takenAt, location, clusterId }) => {
    const response = await api.post('/photos/confirm-upload', {
      s3Key,
      name,
      takenAt,
      location,
      clusterId,
    });
    return response.data;
  },

  deletePhoto: async (photoId) => {
    const response = await api.delete(`/photos/${photoId}`);
    return response.data;
  },

  deletePhotosBatch: async (photoIds) => {
    const response = await api.post('/photos/delete-batch', { photoIds });
    return response.data;
  },

  getUserPhotos: async (userId) => {
    const response = await api.get(`/photos/user/${userId}`);
    return response.data;
  },

  getUserClusters: async (userId) => {
    const response = await api.get(`/photos/user/${userId}/clusters`);
    return response.data;
  },
};

