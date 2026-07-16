import { apiClient } from "./apiClient";

export interface ShiftLunch {
  enabled: boolean;
  mode: "fixed_window" | "flexible_duration";
  startTime: string;
  endTime: string;
  durationMinutes: number;
  deduction: "auto" | "punch";
}

export interface Shift {
  _id: string;
  name: string;
  startTime: string;
  endTime: string;
  lateGraceMinutes: number;
  allowedLateCountPerMonth: number;
  workingDays: string[];
  overtimeGraceMinutes: number;
  overtimeRatePerHour: number;
  lunch?: ShiftLunch;
  isActive: boolean;
}

// EXPECTED WORK hours = shift span minus configured lunch. Classification and
// day-progress targets compare against THIS, not the raw span — mirrors the
// backend's getEffectiveShiftHours() in utils/shiftStatus.js.
export function getEffectiveShiftHours(shift?: Pick<Shift, "startTime" | "endTime" | "lunch"> | null): number {
  return Math.max(0.5, getShiftDurationHours(shift) - configuredLunchMinutes(shift) / 60);
}

// Configured lunch length in minutes, or 0 if lunch isn't enabled. Mirrors the
// backend's configuredLunchMinutes() in utils/shiftStatus.js.
export function configuredLunchMinutes(shift?: Pick<Shift, "lunch"> | null): number {
  const l = shift?.lunch;
  if (!l || !l.enabled) return 0;
  if (l.mode === "fixed_window" && l.startTime && l.endTime) {
    const [sh, sm] = l.startTime.split(":").map(Number);
    const [eh, em] = l.endTime.split(":").map(Number);
    let mins = eh * 60 + em - (sh * 60 + sm);
    if (mins < 0) mins += 24 * 60;
    return Math.max(0, mins);
  }
  return Math.max(0, Number(l.durationMinutes) || 0);
}

// Shift's total scheduled duration in hours, from startTime/endTime ("HH:mm").
// Falls back to 8h if no shift is assigned. Mirrors the backend's identical
// helper in attendance_controller.js — keep both in sync.
export function getShiftDurationHours(shift?: Pick<Shift, "startTime" | "endTime"> | null): number {
  if (!shift?.startTime || !shift?.endTime) return 8;
  const [sh, sm] = shift.startTime.split(":").map(Number);
  const [eh, em] = shift.endTime.split(":").map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0) mins += 24 * 60; // overnight shift
  return mins / 60;
}

export const shiftService = {
  getAll: async (): Promise<Shift[]> => {
    try {
      const res = await apiClient.get("/shifts");
      return res.data?.data || res.data || [];
    } catch (error) {
      console.error("Failed to fetch shifts:", error);
      return [];
    }
  },

  getById: async (id: string): Promise<Shift | undefined> => {
    const res = await apiClient.get(`/shifts/${id}`);
    return res.data?.data || res.data;
  },

  create: async (data: Partial<Shift>): Promise<Shift> => {
    const res = await apiClient.post("/shifts", data);
    return res.data?.data || res.data;
  },

  update: async (id: string, data: Partial<Shift>): Promise<Shift> => {
    const res = await apiClient.patch(`/shifts/${id}`, data);
    return res.data?.data || res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/shifts/${id}`);
  }
};
