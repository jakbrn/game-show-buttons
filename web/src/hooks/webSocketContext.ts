import { createContext } from "react";

export interface WebSocketMessage {
  type:
    | "deviceConnected"
    | "deviceDisconnected"
    | "buttonPressed"
    | "reset"
    | "ledControl"
    | "timerStart"
    | "timerTick"
    | "timerEnd";
  ip?: string;
  action?: string;
  timeRemaining?: number;
}

export interface WebSocketContextType {
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  sendMessage: (message: Record<string, unknown>) => void;
  connectionError: string | null;
}

export const WebSocketContext = createContext<WebSocketContextType | null>(
  null
);
