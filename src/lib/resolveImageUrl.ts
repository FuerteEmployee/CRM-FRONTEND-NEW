// Settings image values (logos/favicon) are stored in the DB as bare
// filenames served by the backend at /uploads/logos/<filename>.
// In dev, VITE_API_URL is "/api" so the relative path goes through the
// Vite proxy; in production it is an absolute backend URL, so we strip
// the trailing /api to get the backend origin.
const BACKEND_ORIGIN = (import.meta.env.VITE_API_URL || "").replace(/\/api\/?$/, "");

export const resolveImageUrl = (val?: string) => {
  if (!val || typeof val !== "string") return "";
  if (val.startsWith("data:") || val.startsWith("http") || val.startsWith("blob:")) return val;
  return `${BACKEND_ORIGIN}/uploads/logos/${val}`;
};
