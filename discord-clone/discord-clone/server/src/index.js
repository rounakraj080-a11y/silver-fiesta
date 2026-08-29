require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

require("./db"); // initializes + seeds the database as a side effect

const authRoutes = require("./routes/auth");
const serverRoutes = require("./routes/servers");
const channelRoutes = require("./routes/channels");
const messageRoutes = require("./routes/messages");
const { registerSocketHandlers } = require("./socket");

const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = (process.env.CLIENT_ORIGIN || "http://localhost:5173").split(",");

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN, credentials: true },
});

app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/servers", serverRoutes);
app.use("/api/channels", channelRoutes);
app.use("/api/messages", messageRoutes);

registerSocketHandlers(io);

// In production, this single Node process also serves the built React
// client, so the whole app is one deployable service with one URL.
const clientDist = path.join(__dirname, "..", "..", "client", "dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

httpServer.listen(PORT, () => {
  console.log(`[server] Discord clone API + WebSocket listening on port ${PORT}`);
});
