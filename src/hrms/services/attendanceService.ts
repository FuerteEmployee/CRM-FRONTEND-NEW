import {apiClient} from "./apiClient";

export const attendanceService = {
  punchIn: async (selfieBlob: Blob | null, location: { lat: number, lng: number, address?: string, accuracy?: number, fixAt?: number }) => {
    const formData = new FormData();
    if (selfieBlob) formData.append("selfie", selfieBlob, "punch-in.jpg");
    formData.append("lat", location.lat.toString());
    formData.append("lng", location.lng.toString());
    if (location.address) formData.append("address", location.address);
    if (location.accuracy !== undefined) formData.append("accuracy", location.accuracy.toString());
    if (location.fixAt !== undefined) formData.append("fixAt", new Date(location.fixAt).toISOString());

    const response = await apiClient.post("/attendance/punch-in", formData);
    return response.data;
  },

  punchOut: async (selfieBlob: Blob | null, location: { lat: number, lng: number, address?: string, accuracy?: number, fixAt?: number }) => {
    const formData = new FormData();
    if (selfieBlob) formData.append("selfie", selfieBlob, "punch-out.jpg");
    formData.append("lat", location.lat.toString());
    formData.append("lng", location.lng.toString());
    if (location.address) formData.append("address", location.address);
    if (location.accuracy !== undefined) formData.append("accuracy", location.accuracy.toString());
    if (location.fixAt !== undefined) formData.append("fixAt", new Date(location.fixAt).toISOString());

    const response = await apiClient.post("/attendance/punch-out", formData);
    return response.data;
  },

  // Lunch in/out require no selfie — sent as plain JSON. accuracy is sent so
  // the server can apply the same geofence gate as punch-in/out. silent: the
  // caller surfaces its own toast (incl. the geofence-denied message) rather
  // than the generic apiClient error toast.
  lunchIn: async (location: { lat: number, lng: number, address?: string, accuracy?: number }) => {
    const response = await apiClient.post("/attendance/lunch-in", location, { silent: true } as any);
    return response.data;
  },

  lunchOut: async (location: { lat: number, lng: number, address?: string, accuracy?: number }) => {
    const response = await apiClient.post("/attendance/lunch-out", location, { silent: true } as any);
    return response.data;
  },

  getTodayAttendance: async () => {
    const response = await apiClient.get("/attendance/today", { silent: true });
    return response.data;
  },

  // Chronological punch-event log for the "Today's Activity" list.
  getTodayEvents: async () => {
    const response = await apiClient.get("/attendance/events/today", { silent: true });
    return response.data;
  },

  getAttendanceHistory: async (params?: { month?: number, year?: number }) => {
    const response = await apiClient.get("/attendance/history", { params });
    return response.data;
  },

  getAll: async (params?: { date?: string, storeId?: string }) => {
    const response = await apiClient.get("/attendance", { params });
    return response.data;
  },

  autoPunchOut: async (location: { lat: number, lng: number, accuracy?: number }) => {
    const response = await apiClient.post("/attendance/auto-punch-out", location);
    return response.data ?? response;
  },

  checkGeoFence: async (lat: number, lng: number) => {
    const response = await apiClient.get("/attendance/geo-fence/check", { params: { lat, lng } });
    return response;
  },

  adminCorrectPunch: async (data: { userId: string; date: string; punchInTime?: string; punchOutTime?: string; note: string; statusOverride?: "Full Day" | "Half Day" | "Absent" }) => {
    const response = await apiClient.patch("/attendance/admin-correct", data);
    return response.data;
  },
};

