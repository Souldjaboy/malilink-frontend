"use client";

import { io, type Socket } from "socket.io-client";
import { getAuthToken } from "./api";

/* Client Socket.io MaliLink (singleton).
   - authentification JWT au handshake ;
   - en production le socket passe par la même origine (proxy Nginx) ;
   - en développement, NEXT_PUBLIC_SOCKET_URL pointe sur le backend. */
let socket: Socket | null = null;

export function getSocket(): Socket | null {
  if (typeof window === "undefined") return null;
  const token = getAuthToken();
  if (!token) return null;

  if (socket) return socket;

  const url = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
  socket = io(url, {
    path: "/socket.io",
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: 20,
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
