import { io, Socket } from "socket.io-client";

const BACKEND_URL = "https://sugarcontrollerbackend-production.up.railway.app";

let socket: Socket | null = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(BACKEND_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });
  }
  return socket;
};