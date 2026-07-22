// Settings image values (logos/favicon) are stored in the DB as bare
// filenames served by the backend at /uploads/logos/<filename>.
// In dev, VITE_API_URL is "/api" so the relative path goes through the
// Vite proxy; in production it is an absolute backend URL, so we strip
// the trailing /api to get the backend origin.
const BACKEND_ORIGIN = (import.meta.env.VITE_API_URL || "").replace(/\/api\/?$/, "");

export const resolveImageUrl = (val?: string) => {
  if (!val || typeof val !== "string") return "";
  const trimmed = val.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("data:") || trimmed.startsWith("http:") || trimmed.startsWith("https:") || trimmed.startsWith("blob:")) return trimmed;
  if (trimmed.startsWith("/uploads/")) return `${BACKEND_ORIGIN}${trimmed}`;
  if (trimmed.startsWith("uploads/")) return `${BACKEND_ORIGIN}/${trimmed}`;
  if (trimmed.startsWith("/")) return `${BACKEND_ORIGIN}${trimmed}`;
  return `${BACKEND_ORIGIN}/uploads/logos/${trimmed}`;
};
