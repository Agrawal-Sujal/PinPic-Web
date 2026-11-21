import api from './client';

export const syncApi = {
  pushMutations: async (pushRequest) => {
    const response = await api.post('/sync/push', pushRequest);
    return response.data;
  },

  pullDeltas: async ({ cursor = 0, limit = 200, deviceId = null } = {}) => {
    const response = await api.get('/sync/pull', {
      params: { cursor, limit, deviceId },
    });
    return response.data;
  },
};


