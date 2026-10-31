import { format } from "date-fns";

// Same 8 values as GOAL_TYPES in CRM-BACKEND/src/models/Goal.js.
export const GOAL_TYPES = [
  { value: "total_income", label: "Achieve Total Income", description: "Payments received, in your base currency (not converted)" },
  { value: "invoiced_amount", label: "Invoiced Amount", description: "Total of invoices raised (draft and cancelled not counted)" },
  { value: "convert_leads", label: "Convert X Leads", description: "Leads assigned to the staff member and converted to customers" },
  { value: "customer_num_exclude", label: "Increase Customer Number (leads excluded)", description: "New customers, not counting converted leads" },
  { value: "customer_num_include", label: "Increase Customer Number (leads included)", description: "New customers, including converted leads" },
  { value: "contracts_by_type_added", label: "Make Contracts By Type (date added)", description: "Counted from the date the contract was added" },
  { value: "contracts_by_type_start", label: "Make Contracts By Type (start date)", description: "Counted from the contract start date" },
  { value: "estimates_conversion", label: "X Estimates Conversion", description: "Only estimates converted to invoices are counted" },
];

export const goalTypeLabel = (value?: string) =>
  GOAL_TYPES.find((t) => t.value === value)?.label || value?.replace(/_/g, " ") || "";

export const isContractGoal = (value?: string) => !!value?.startsWith("contracts_by_type");

// Local calendar day (yyyy-MM-dd) for a date input. toISOString() would give the
// previous day for dates saved at Indian midnight.
export const toDateInput = (value?: string | Date | null) => {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : format(d, "yyyy-MM-dd");
};

// format() throws on a missing/invalid date and would crash the whole page.
export const formatDate = (value: string | Date | null | undefined, pattern = "MMM dd, yyyy") => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : format(d, pattern);
};
