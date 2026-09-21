import { apiClient } from '../client';

export const meetingService = {
  getMeetings: () => apiClient.get('/meetings'),
  getMeeting: (id) => apiClient.get(`/meetings/${id}`),
  createMeeting: (data) => apiClient.post('/meetings', data),
  updateMeeting: (id, data) => apiClient.put(`/meetings/${id}`, data),
  summarizeMeeting: (id, transcript) => apiClient.post(`/meetings/${id}/summarize`, { transcript }),
  scribeTurn: (id, recentTranscript, hasExternalParticipant, alreadyAnswered) =>
    apiClient.post(`/meetings/${id}/scribe-turn`, { recentTranscript, hasExternalParticipant, alreadyAnswered }),
  scribeDiagnostic: (id, text, alreadyAnswered) =>
    apiClient.post(`/meetings/${id}/scribe-diagnostic`, { text, alreadyAnswered }),
  deleteMeeting: (id) => apiClient.delete(`/meetings/${id}`),
  importMeetings: (rows) => apiClient.post('/meetings/import', rows),
  setRecordingConsent: (id, given) => apiClient.post(`/meetings/${id}/recording-consent`, { given }),
  uploadRecording: (id, formData) => apiClient.post(`/meetings/${id}/recording`, formData),
  getRecordingUrl: (id, recordingId) => apiClient.get(`/meetings/${id}/recording/${recordingId}/url`),
  deleteRecording: (id, recordingId) => apiClient.delete(`/meetings/${id}/recording/${recordingId}`),
};

