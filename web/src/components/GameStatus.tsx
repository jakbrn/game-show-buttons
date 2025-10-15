import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Timer } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocketHook";

export function GameStatus() {
  const [devices, setDevices] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pressedButton, setPressedButton] = useState<string | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const { lastMessage, connectionError, sendMessage } = useWebSocket();

  const fetchDevices = async () => {
    try {
      setLoading(true);
      setError(null);
      const deviceList = await apiClient.getDevices();
      setDevices(deviceList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch devices");
    } finally {
      setLoading(false);
    }
  };

  const addDevice = (ip: string) => {
    setDevices((prev) => (prev.includes(ip) ? prev : [...prev, ip]));
  };

  const removeDevice = (ip: string) => {
    setDevices((prev) => prev.filter((d) => d !== ip));
  };

  const startTimer = () => {
    sendMessage({ type: "startTimer", duration: 15 });
    setIsTimerRunning(true);
  };

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      switch (lastMessage.type) {
        case "deviceConnected":
          if (lastMessage.ip) {
            addDevice(lastMessage.ip);
          }
          break;
        case "deviceDisconnected":
          if (lastMessage.ip) {
            removeDevice(lastMessage.ip);
          }
          break;
        case "buttonPressed":
          setPressedButton(lastMessage.ip || null);
          break;
        case "reset":
          setPressedButton(null);
          break;
        case "timerStart":
          setIsTimerRunning(true);
          break;
        case "timerEnd":
          setIsTimerRunning(false);
          break;
      }
    }
  }, [lastMessage]);

  useEffect(() => {
    fetchDevices();
    // Refresh devices every 30 seconds (less frequent since we have WebSocket updates)
    const interval = setInterval(fetchDevices, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              Connected Devices ({devices.length})
            </CardTitle>
            <CardDescription>Live status of connected devices</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDevices}
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={startTimer}
              disabled={isTimerRunning}
            >
              <Timer className="h-4 w-4 mr-2" />
              Start Timer (15s)
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {(error || connectionError) && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error || connectionError}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {devices.map((device, index) => (
            <Badge
              key={index}
              variant={device === pressedButton ? "destructive" : "default"}
            >
              {device}
            </Badge>
          ))}{" "}
          {devices.length === 0 && !loading && (
            <p className="text-muted-foreground text-center w-full">
              No devices connected
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
