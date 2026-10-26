import { API_BASE_URL } from "@/hrms/services/apiClient";

// Turns a stored upload path (avatar, PAN, Aadhaar…) into a loadable URL.
// Cloudinary/data URLs pass through; "/uploads/x.png" is served by the backend.
// Older local-disk records saved the full disk path ("E:\...\src\uploads\x.png"),
// so anything after an "uploads" folder is re-rooted at /uploads too.
export const getFileUrl = (url?: string) => {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("data:") || url.startsWith("blob:")) return url;
  // API_BASE_URL is the HRMS API root (".../api/hrms"); uploads are served
  // from the server root, so strip the whole API path, not just "/api".
  const baseUrl = API_BASE_URL.replace(/\/api(\/hrms)?\/?$/, "");
  const normalized = url.replace(/\\/g, "/");
  const uploadsIdx = normalized.lastIndexOf("/uploads/");
  const cleanPath = (uploadsIdx >= 0 ? normalized.slice(uploadsIdx) : normalized).replace(/^\/+/, "");
  return `${baseUrl}/${cleanPath}`;
};
