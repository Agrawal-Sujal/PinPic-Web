import api from './client';

export const syncApi = {
  syncBatch: async (batchRequest) => {
    const response = await api.post('/sync/batch', batchRequest);
    return response.data;
  },

  pullOperations: async ({ lastOperationId = 0, batchSize = 50, deviceId = null } = {}) => {
    const response = await api.get('/sync/pull', {
      params: { lastOperationId, batchSize, deviceId },
    });
    return response.data;
  },
};

