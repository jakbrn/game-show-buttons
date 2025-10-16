import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { devices, getPressedButton, setPressedButton } from "./devices";

// Heartbeat configuration
const HEARTBEAT_INTERVAL = 5000; // 5 seconds

// Timer state
let timerInterval: NodeJS.Timeout | null = null;
let timerActive = false;

interface ExtendedWebSocket extends WebSocket {
  isAlive?: boolean;
  heartbeatTimer?: NodeJS.Timeout;
  ip?: string;
}

export function createWebSocketServer(httpServer: Server) {
  const wss = new WebSocketServer({ server: httpServer });

  // Function to start timer
  function startTimer(duration: number) {
    if (timerActive) {
      console.log("Timer already running");
      return;
    }

    timerActive = true;
    let timeRemaining = duration;

    // Broadcast timer start
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: "timerStart", timeRemaining }));
      }
    });

    // Set up interval to countdown
    timerInterval = setInterval(() => {
      timeRemaining--;

      // Broadcast tick
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: "timerTick", timeRemaining }));
        }
      });

      // Check if timer finished
      if (timeRemaining <= 0) {
        if (timerInterval) {
          clearInterval(timerInterval);
          timerInterval = null;
        }
        timerActive = false;

        // Broadcast timer end
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: "timerEnd" }));
          }
        });
      }
    }, 1000);
  }

  function resetTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    timerActive = false;

    // Broadcast reset
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: "timerEnd" }));
      }
    });
  }

  // Function to handle client disconnection
  function handleClientDisconnect(
    ws: ExtendedWebSocket,
    reason: string = "unknown"
  ) {
    const ip = ws.ip;
    console.log(`WebSocket client disconnected (${reason}):`, ip);

    // Clear heartbeat timer
    if (ws.heartbeatTimer) {
      clearInterval(ws.heartbeatTimer);
    }

    // Remove from devices map
    if (ip && devices.has(ip)) {
      devices.delete(ip);
    }

    // Notify other clients
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: "deviceDisconnected", ip }));
      }
    });
  }

  // Function to start heartbeat for a client
  function startHeartbeat(ws: ExtendedWebSocket) {
    ws.isAlive = true;

    // Clear any existing timer
    if (ws.heartbeatTimer) {
      clearInterval(ws.heartbeatTimer);
    }

    ws.heartbeatTimer = setInterval(() => {
      if (!ws.isAlive) {
        ws.terminate();
        return;
      }

      // Mark as not alive and send ping
      ws.isAlive = false;
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, HEARTBEAT_INTERVAL);
  }

  wss.on("connection", (ws: ExtendedWebSocket, request) => {
    const ip = request.socket.remoteAddress?.replace(/^::ffff:/, "") || null;
    ws.ip = ip!;
    console.log("New WebSocket client connected:", ip);

    // Start heartbeat mechanism
    startHeartbeat(ws);

    // Handle pong responses
    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", (data: Buffer) => {
      const message = data.toString();
      console.log("WebSocket received:", message);

      try {
        const parsedMessage = JSON.parse(message);

        switch (parsedMessage.type) {
          case "buttonPress":
            console.log(`Button press from ${ip}`);
            if (!getPressedButton()) {
              setPressedButton(ip!);
              ws.send(JSON.stringify({ type: "ledControl", action: "on" }));
              wss.clients.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({ type: "buttonPressed", ip }));
                }
              });
            }
            break;
          case "reset":
            setPressedButton(null);
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: "reset" }));
                if (client === devices.get(ip!)) {
                  client.send(
                    JSON.stringify({ type: "ledControl", action: "off" })
                  );
                }
              }
            });
            break;
          case "button":
            console.log(`Device registered: ${ip}`);
            devices.set(ip!, ws);
            wss.clients.forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: "deviceConnected", ip }));
              }
            });
            break;
          case "startTimer":
            console.log(
              `Timer start requested with duration: ${
                parsedMessage.duration || 15
              }`
            );
            startTimer(parsedMessage.duration || 15);
            break;
          case "resetTimer":
            console.log("Timer reset requested");
            resetTimer();
            break;
        }
      } catch (error) {
        console.error("Invalid JSON received:", message);
        ws.send(`Error: Invalid JSON`);
      }
    });

    ws.on("close", () => {
      handleClientDisconnect(ws, "socket closed");
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      handleClientDisconnect(ws, "error");
    });
  });

  // Handle WebSocket server errors
  wss.on("error", (error) => {
    console.error("WebSocket Server error:", error);
  });

  console.log("WebSocket server created");
  return wss;
}
