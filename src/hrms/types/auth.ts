export type UserRole = string;

export interface RoleDefinition {
  id: string;
  role: string;
  label: string;
  icon: string;
  color: string;
  description: string;
  permissions: string[];
  isSystemRole?: boolean;
  attendanceRequired?: boolean;
}

export type Role = RoleDefinition;

export interface Permission {
  id: string;
  name: string;
  module: string;
  description: string;
}

export interface User {
  _id: string;
  id: string;
  name: string;
  email: string;
  role: string | RoleDefinition;
  storeId: any; // Can be object or string based on backend
  admin?: any;
  is_superadmin?: boolean;
  is_hrms_staff?: boolean;
  mobile?: string;
  avatar?: string;
  status: "active" | "inactive";
  isActive?: boolean;
  token?: string;
  isTrackingActive?: boolean;
  permissions: string[];
  attendanceRequired?: boolean;
  employeeId?: string;
  userId?: string;

  // Personal Details
  gender?: string;
  dob?: string | Date;
  bloodGroup?: string;
  education?: string;
  totalExperience?: string;
  residentialPhone?: string;

  // Address
  address?: {
    current: string;
    permanent: string;
  };

  // Contacts
  emergencyContact?: {
    name: string;
    phone: string;
    relation: string;
  };

  // Banking
  bankInfo?: {
    accountName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    branchCity: string;
  };

  // Documentation
  legalDocuments?: {
    panNumber: string;
    panUrl: string;
    aadhaarNumber: string;
    aadhaarUrl: string;
    passportPhotoUrl: string;
  };

  // Salesperson / field staff flags
  isSalesperson?: boolean;

  // HR & Employment
  department?: any;
  designation?: any;
  employmentType?: string;
  payType?: string;
  salaryAmount?: number;
  joiningDate?: string | Date;
  shiftId?: string;
  weeklyHolidays?: string[];
  attendanceExceptions?: string[];
  hrmsBranchId?: any;
  // Branches this staff member supervises — scopes their Staff Directory
  // visibility to only these branches instead of the whole organization.
  supervisorBranchIds?: string[];

  // Payroll Configuration
  salaryConfig?: {
    salaryTemplateId: string;
    tdsOnProfession: boolean;
    basic: { value: number; type: "amount" | "percent"; isIncluded: boolean };
    hra: { value: number; type: "amount" | "percent"; isIncluded: boolean };
    da: { value: number; type: "amount" | "percent"; isIncluded: boolean };
    conveyanceAllowance: { value: number; type: "amount" | "percent"; isIncluded: boolean };
    pf: { value: number; type: "amount" | "percent"; isIncluded: boolean; mode?: "fixed_monthly" | "per_day"; rate?: number };
    esic: { value: number; type: "amount" | "percent"; isIncluded: boolean };
    epf: { value: number; type: "amount" | "percent"; isIncluded: boolean };
    retention: { value: number; type: "amount" | "percent"; isIncluded: boolean };
    professionalTax: { value: number; type: "amount" | "percent"; isIncluded: boolean };
    adminCharge: { value: number; type: "amount" | "percent"; isIncluded: boolean };
    bonus: { value: number; type: "amount" | "percent"; isIncluded: boolean };
  };
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  read: boolean;
  createdAt: string;
}


