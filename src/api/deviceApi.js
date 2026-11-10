import api from './client';

export const deviceApi = {
  registerDevice: async ({ device, userId }) => {
    const response = await api.post('/devices', { device, userId });
    return response.data;
  },

  getDevice: async (deviceId) => {
    const response = await api.get(`/devices/${deviceId}`);
    return response.data;
  },
};

export default deviceApi;
