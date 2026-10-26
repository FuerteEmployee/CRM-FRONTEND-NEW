// Date / time display for the whole CRM, following Setup > Settings >
// Localization (Date Format, Time Format, Default Timezone). SettingsContext
// pushes the company's values in with setDateFormatConfig(); the last values
// are kept in localStorage so the very first render already uses them.

export type DateOrder = "dmy" | "mdy" | "ymd";

interface DateFormatConfig {
  dateFormat: DateOrder;
  timeFormat: "12" | "24";
  /** IANA zone ("Asia/Kolkata"); "" = the viewer's own computer time. */
  timeZone: string;
}

const STORAGE_KEY = "crm_date_format_cfg";

// Older settings store short codes; map them to real zones.
const TZ_ALIASES: Record<string, string> = {
  ist: "Asia/Kolkata",
  utc: "UTC",
  est: "America/New_York",
  pst: "America/Los_Angeles",
};

const isValidTimeZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

export const resolveTimeZone = (value?: string | null): string => {
  const v = String(value ?? "").trim();
  if (!v) return "";
  const alias = TZ_ALIASES[v.toLowerCase()];
  if (alias) return alias;
  return isValidTimeZone(v) ? v : "";
};

const normalizeOrder = (value?: string | null): DateOrder => {
  const v = String(value ?? "").trim().toLowerCase();
  if (v === "mdy" || v.startsWith("mm")) return "mdy";
  if (v === "ymd" || v.startsWith("yy")) return "ymd";
  return "dmy";
};

const DEFAULT_CONFIG: DateFormatConfig = { dateFormat: "dmy", timeFormat: "24", timeZone: "" };

let config: DateFormatConfig = (() => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return saved ? { ...DEFAULT_CONFIG, ...saved } : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
})();

export const setDateFormatConfig = (settings: { locDateFormat?: any; locTimeFormat?: any; locTimezone?: any }) => {
  config = {
    dateFormat: normalizeOrder(settings.locDateFormat),
    timeFormat: String(settings.locTimeFormat ?? "24") === "12" ? "12" : "24",
    timeZone: resolveTimeZone(settings.locTimezone),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    /* storage blocked */
  }
};

export const getDateFormatConfig = (): DateFormatConfig => config;

// A calendar date with no time (invoice date, due date, …) is stored as
// "YYYY-MM-DD" or UTC midnight. Converting it to a timezone west of UTC would
// show the previous day, so those keep their calendar date.
const isDateOnly = (input: any) =>
  typeof input === "string" && (/^\d{4}-\d{2}-\d{2}$/.test(input) || /^\d{4}-\d{2}-\d{2}T00:00:00(\.000)?Z$/.test(input));

const partsOf = (d: Date, timeZone?: string) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timeZone || undefined,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
  return { day: get("day"), month: get("month"), year: get("year"), hour: Number(get("hour")), minute: get("minute") };
};

const joinDate = (p: { day: string; month: string; year: string }) =>
  config.dateFormat === "mdy" ? `${p.month}-${p.day}-${p.year}` : config.dateFormat === "ymd" ? `${p.year}-${p.month}-${p.day}` : `${p.day}-${p.month}-${p.year}`;

const joinTime = (hour: number, minute: string) => {
  if (config.timeFormat === "12") {
    const h12 = hour % 12 || 12;
    return `${String(h12).padStart(2, "0")}:${minute} ${hour < 12 ? "AM" : "PM"}`;
  }
  return `${String(hour).padStart(2, "0")}:${minute}`;
};

export function formatDate(dateStr: string): string {
  if (!dateStr || dateStr === "-") return dateStr;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return joinDate(partsOf(d, isDateOnly(dateStr) ? "UTC" : config.timeZone));
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr || dateStr === "-") return dateStr;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const p = partsOf(d, config.timeZone);
  return `${joinDate(p)} ${joinTime(p.hour, p.minute)}`;
}

/** All IANA time zones the browser knows, for the Settings dropdown. */
export const listTimeZones = (): string[] => {
  try {
    return (Intl as any).supportedValuesOf("timeZone") as string[];
  } catch {
    return ["UTC", "Asia/Kolkata", "Asia/Dubai", "Europe/London", "America/New_York", "America/Los_Angeles", "Australia/Sydney"];
  }
};
