import express from "express";
import { createServer } from "http";
import { createUdpServer } from "./udp";
import { createWebSocketServer } from "./websocket";
import { devicesRouter } from "./devices";
import teamsRouter from "./teams";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());
app.use("/devices", devicesRouter);
app.use("/teams", teamsRouter);
app.get("/", (req, res) => {
  res.send("Hello from Express + UDP + WebSocket server");
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Create HTTP server
const httpServer = createServer(app);

// Catch uncaught exceptions to prevent server crashes
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process, just log it
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log it
});

// Global error handlers to prevent server crashes
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit - keep server running
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit - keep server running
});

// Express error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Express error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start HTTP server
httpServer.listen(PORT, () => {
  console.log(`HTTP server listening on http://localhost:${PORT}`);
  console.log(`WebSocket server available at ws://localhost:${PORT}`);
});

// Start WebSocket server
createWebSocketServer(httpServer);

// Start UDP server
createUdpServer();
