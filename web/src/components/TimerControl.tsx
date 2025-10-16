import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, RotateCcw } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocketHook";

export function TimerControl() {
  const [duration, setDuration] = useState(15);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { lastMessage, sendMessage } = useWebSocket();

  // Handle WebSocket timer messages
  useEffect(() => {
    if (lastMessage) {
      switch (lastMessage.type) {
        case "timerStart":
          setIsTimerRunning(true);
          setTimeRemaining(lastMessage.timeRemaining || duration);
          setError(null);
          break;
        case "timerTick":
          setTimeRemaining(lastMessage.timeRemaining || 0);
          break;
        case "timerEnd":
          setIsTimerRunning(false);
          setTimeRemaining(0);
          break;
        case "reset":
          setIsTimerRunning(false);
          setTimeRemaining(0);
          break;
      }
    }
  }, [lastMessage, duration]);

  const startTimer = () => {
    if (duration < 1 || duration > 300) {
      setError("Duration must be between 1 and 300 seconds");
      return;
    }
    setError(null);
    sendMessage({ type: "startTimer", duration });
  };

  const resetTimer = () => {
    sendMessage({ type: "resetTimer" });
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setDuration(value);
    }
  };

  // Calculate progress percentage for visual indicator
  const progressPercentage =
    duration > 0 ? ((duration - timeRemaining) / duration) * 100 : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">Timer Control</CardTitle>
        <CardDescription>Start and manage game timers</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Timer Display */}
        <div className="text-center">
          <div className="relative w-32 h-32 mx-auto mb-4">
            {/* Background circle */}
            <svg
              className="w-full h-full transform -rotate-90"
              viewBox="0 0 100 100"
            >
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                className="text-muted-foreground opacity-20"
              />
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${
                  2 * Math.PI * 45 * (1 - progressPercentage / 100)
                }`}
                className={`transition-all duration-1000 ${
                  isTimerRunning
                    ? timeRemaining <= 10
                      ? "text-red-500"
                      : "text-blue-500"
                    : "text-muted-foreground"
                }`}
                strokeLinecap="round"
              />
            </svg>
            {/* Timer text overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div
                  className={`text-2xl font-bold font-mono ${
                    isTimerRunning
                      ? timeRemaining <= 10
                        ? "text-red-500"
                        : "text-blue-500"
                      : "text-muted-foreground"
                  }`}
                >
                  {isTimerRunning
                    ? formatTime(timeRemaining)
                    : formatTime(duration)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {isTimerRunning ? "Running" : "Ready"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Duration Input */}
        <div className="space-y-2">
          <Label htmlFor="duration">Duration (seconds)</Label>
          <Input
            id="duration"
            type="number"
            value={duration}
            onChange={handleDurationChange}
            disabled={isTimerRunning}
            min="1"
            max="300"
            className="text-center"
          />
        </div>

        {/* Control Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={startTimer}
            disabled={isTimerRunning}
            className="flex-1"
            variant="default"
          >
            <Play className="h-4 w-4 mr-2" />
            Start Timer
          </Button>
          <Button
            onClick={resetTimer}
            disabled={!isTimerRunning && timeRemaining === 0}
            variant="outline"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
