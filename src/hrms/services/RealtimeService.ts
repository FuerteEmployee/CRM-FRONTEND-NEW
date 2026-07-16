import { io, Socket } from "socket.io-client";
import { API_BASE_URL } from "./apiClient";

const SOCKET_URL = API_BASE_URL.replace("/api", "");

class RealtimeService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;

  init(token: string, userId?: string) {
    if (this.socket) return;

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["polling"],   // Vercel serverless doesn't support WebSockets
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    this.socket.on("connect", () => {
      this.isConnected = true;
      // Join the personal room so the server can push events to this user
      if (userId) {
        this.socket?.emit("join-room", `user-${userId}`);
      }
    });

    this.socket.on("disconnect", (reason) => {
      this.isConnected = false;
    });

    this.socket.on("connect_error", (error) => {
    });
  }

  emit(event: string, data: any) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  on(event: string, callback: (data: any) => void) {
    this.socket?.on(event, callback);
  }

  off(event: string) {
    this.socket?.off(event);
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.isConnected = false;
  }
}

export const realtimeService = new RealtimeService();
