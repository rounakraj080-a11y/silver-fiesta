import { io } from "socket.io-client";

let socket = null;

// Creates (or returns the existing) authenticated socket connection.
// Uses the same origin as the page — the Vite dev proxy (or the
// production server itself) forwards /socket.io to the backend.
export function getSocket() {
  const token = localStorage.getItem("token");
  if (!token) return null;

  if (socket && socket.connected) return socket;

  if (!socket) {
    socket = io("/", {
      autoConnect: false,
      auth: { token },
      transports: ["websocket", "polling"],
    });
  } else {
    socket.auth = { token };
  }

  socket.connect();
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
