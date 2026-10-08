import { useEffect, useState } from "react";
import { apiClient } from "./apiClient";

/* Face Attendance (BOTLens integration) — backend: /api/hrms/face (face_controller.js). */

export interface FaceStatus {
  serviceUp: boolean;
  employees: number;
  enrolled: number;
  threshold: number;
  cooldownSeconds: number;
}

export interface FaceEnrollment {
  _id: string;
  name: string;
  employeeCode: string;
  avatar: string;
  mobile: string;
  branch: string;
  enrolled: boolean;
  photoCount: number;
  photoUrl: string;
  enrolledAt: string | null;
}

export interface KioskMatch {
  userId: string;
  name: string;
  employeeCode: string;
  avatar: string;
  similarity: number;
  nextAction: "punch-in" | "punch-out";
  onLunch: boolean;
}

export interface KioskFace {
  box: [number, number, number, number];
  pose: { yaw: string; pitch: string };
  match: KioskMatch | null;
}

export interface KioskPunchResult {
  success: boolean;
  skipped?: boolean;
  action?: "punch-in" | "punch-out";
  employee?: { _id: string; name: string; employeeCode: string; avatar: string };
  time?: string;
  message: string;
}

export const faceService = {
  getStatus: async (): Promise<FaceStatus> => (await apiClient.get("/face/status", { silent: true })).data,

  // enabled = the super admin switched Face Attendance on for this company.
  getMyFace: async (): Promise<{ enabled: boolean; enrolled: boolean; enrolledAt: string | null }> =>
    (await apiClient.get("/face/me", { silent: true })).data,

  listEnrollments: async (params?: { search?: string; branchId?: string }): Promise<FaceEnrollment[]> =>
    (await apiClient.get("/face/enrollments", { params, silent: true })).data || [],

  getEnrollment: async (userId: string): Promise<{ enrolled: boolean; photoCount: number; photoUrl: string; enrolledAt: string | null }> =>
    (await apiClient.get(`/face/enrollments/${userId}`, { silent: true })).data,

  enroll: async (userId: string, photos: Blob[]) => {
    const fd = new FormData();
    photos.forEach((p, i) => fd.append("photos", p, `face-${i + 1}.jpg`));
    return apiClient.post(`/face/enrollments/${userId}`, fd, { silent: true });
  },

  removeEnrollment: (userId: string) => apiClient.delete(`/face/enrollments/${userId}`, { silent: true }),

  recognize: async (frame: Blob): Promise<{ width: number; height: number; faces: KioskFace[] }> => {
    const fd = new FormData();
    fd.append("frame", frame, "frame.jpg");
    return (await apiClient.post("/face/kiosk/recognize", fd, { silent: true })).data;
  },

  // Rejections (cooldown, lunch open, face not confirmed) come back as a result, not a throw.
  kioskPunch: async (userId: string, frame: Blob): Promise<KioskPunchResult> => {
    const fd = new FormData();
    fd.append("userId", userId);
    fd.append("frame", frame, "frame.jpg");
    try {
      return (await apiClient.post("/face/kiosk/punch", fd, { silent: true })) as any;
    } catch (err: any) {
      return { success: false, ...(err?.responseData || {}), message: err?.responseData?.message || err?.message || "Punch failed" };
    }
  },
};

// Face Attendance is a per-company add-on (Super Admin > Companies > Add-on
// features). One request per page load, shared by every caller; false until known.
let enabledPromise: Promise<boolean> | null = null;
export function useFaceAttendanceEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    enabledPromise ??= faceService.getMyFace().then((d) => !!d?.enabled).catch(() => {
      enabledPromise = null;
      return false;
    });
    let alive = true;
    enabledPromise.then((v) => alive && setEnabled(v));
    return () => { alive = false; };
  }, []);
  return enabled;
}

// Grab the current video frame as a JPEG, unmirrored (the <video> is only
// mirrored on screen with CSS, so returned face boxes are in camera coordinates).
export const captureFrame = (video: HTMLVideoElement, maxWidth = 640, quality = 0.85): Promise<Blob | null> => {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return Promise.resolve(null);
  const scale = Math.min(1, maxWidth / w);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", quality));
};
