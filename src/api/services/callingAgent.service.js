import { apiClient } from '../client';

export const callingAgentService = {
  getCalls: (params = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 'all')
    ).toString();
    return apiClient.get(`/calling-agent/calls${query ? `?${query}` : ''}`);
  },

  getCallDetail: (id) => apiClient.get(`/calling-agent/calls/${id}`),

  resolveCustomer: (id, customerId) =>
    apiClient.post(`/calling-agent/calls/${id}/resolve-customer`, { customerId }),

  retryTranscription: (id) => apiClient.post(`/calling-agent/calls/${id}/retry-transcription`),
};
