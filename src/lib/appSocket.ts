import { io, Socket } from "socket.io-client";
import { getAccessToken, getRefreshToken, isTokenExpired, refreshAccessToken } from "@/lib/session";

// The CRM's live connection (chat, notifications, reminders, who is online).
// The server only accepts logged-in sockets (Backend src/utils/socketAuth.js),
// so every connect — including silent reconnects — sends the current login token.

export const SOCKET_URL: string =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.MODE === "development" ? "http://localhost:5000" : "https://crm-backend.beontimeofficial.com");

/** A fresh, non-expired access token (renewed first if it is about to expire). */
const currentToken = async (): Promise<string> => {
  let token = getAccessToken();
  if (token && isTokenExpired(token) && getRefreshToken()) {
    await refreshAccessToken().catch(() => false);
    token = getAccessToken();
  }
  return token || "";
};

export const createAppSocket = (url: string = SOCKET_URL): Socket => {
  const socket = io(url, {
    withCredentials: true,
    // Called on every (re)connect, so a renewed token is always used.
    auth: (cb) => {
      currentToken().then((token) => cb({ token }));
    },
  });

  // socket.io retries network errors by itself, but NOT a connection the server
  // refused (e.g. the login expired while the tab slept): renew and retry a few times.
  let retries = 0;
  socket.on("connect", () => {
    retries = 0;
  });
  socket.on("connect_error", async () => {
    if (socket.active || retries >= 3) return;
    retries += 1;
    if (getRefreshToken()) await refreshAccessToken().catch(() => false);
    setTimeout(() => {
      if (!socket.connected) socket.connect();
    }, 2000 * retries);
  });

  return socket;
};
