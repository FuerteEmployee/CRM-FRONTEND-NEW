import { Store } from "./store";

export interface PunchSession {
  sessionNumber: number;
  punchIn: {
    time: string;
    selfieUrl?: string | null;
    location?: { lat?: number; lng?: number; address?: string };
  };
  punchOut?: {
    time?: string | null;
    selfieUrl?: string | null;
    location?: { lat?: number; lng?: number; address?: string };
  };
  durationMins?: number | null;
  closeReason?: "manual" | "auto_geofence" | "shift_end" | "admin";
}

export interface Attendance {
  id: string;
  _id?: string;
  userId: string;
  date: string;
  // Finalized only once a day is complete (punch-out done); computed from
  // hours worked vs the assigned shift's duration (>= full shift = Full Day,
  // otherwise Half Day). "On Duty" is a live-only display state (today, still
  // in progress) never persisted to the DB.
  status?: "Full Day" | "Half Day" | "Absent" | "On Duty";
  lateMinutes?: number;
  punchIn?: {
    time: string;
    selfieUrl?: string;
    location?: { lat: number; lng: number; address?: string };
  };
  punchOut?: {
    time: string;
    selfieUrl?: string;
    location?: { lat: number; lng: number; address?: string };
  };
  lunchIn?: {
    time: string;
    selfieUrl?: string;
    location?: { lat: number; lng: number; address?: string };
  };
  lunchOut?: {
    time: string;
    selfieUrl?: string;
    location?: { lat: number; lng: number; address?: string };
  };
  totalHours?: number;
  // Actual lunch minutes punched (lunchOut − lunchIn); lunchOverLimit is true
  // when that exceeds the shift's configured lunch — drives the red badge.
  lunchMinutes?: number;
  lunchOverLimit?: boolean;
  overtimeMinutes?: number;
  // Minutes the final punch-out fell short of shift end (past the early-out
  // grace). Drives the "early out" label next to the late indicator.
  earlyOutMinutes?: number;
  autoPunchOut?: boolean;
  source?: "mobile" | "web" | "admin";
  sessions?: PunchSession[];
}

export interface LeaveRequest {
  id: string;
  _id?: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  type: "Sick" | "Casual" | "Earned" | "Other";
}

export interface EmployeeExpense {
  id: string;
  _id?: string;
  employeeId: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  status: "Pending" | "Approved" | "Paid" | "Rejected";
  receiptUrl?: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: "Salary" | "Rent" | "Utility" | "Stock Purchase" | "Marketing" | "Travel" | "Miscellaneous";
  date: string;
  storeId?: string | Store;
  status: "Pending" | "Approved" | "Paid" | "Rejected";
  paymentMethod: "Cash" | "Card" | "UPI" | "Net Banking" | "Cheque";
  receiptUrl?: string;
  notes?: string;
  createdBy?: string | any;
  approvedBy?: string | any;
  createdAt: string;
}
