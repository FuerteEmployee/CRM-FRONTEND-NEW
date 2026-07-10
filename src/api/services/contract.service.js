import { apiClient } from '../client';

export const contractService = {
  getContracts: (params) => apiClient.get('/contracts', { params }),
  getContractById: (id) => apiClient.get(`/contracts/${id}`),
  createContract: (data) => apiClient.post('/contracts', data),
  updateContract: (id, data) => apiClient.patch(`/contracts/${id}`, data),
  deleteContract: (id) => apiClient.delete(`/contracts/${id}`),
  importContracts: (rows) => apiClient.post('/contracts/import', rows),
  signContract: (id, data) => apiClient.post(`/contracts/${id}/sign`, data),
};
