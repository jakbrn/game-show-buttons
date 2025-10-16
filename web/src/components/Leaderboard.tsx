import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";
import { apiClient, type Team } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocketHook";

export function Leaderboard() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [pressedDevice, setPressedDevice] = useState<string | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(15);
  const { lastMessage } = useWebSocket();

  const fetchTeams = async () => {
    try {
      const data = await apiClient.getTeams();
      // Sort teams by points descending
      const sortedTeams = data.sort(
        (a, b) => (b.points || 0) - (a.points || 0)
      );
      setTeams(sortedTeams);
    } catch (err) {
      console.error("Failed to fetch teams:", err);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  // Handle WebSocket messages for button press and timer
  useEffect(() => {
    if (lastMessage) {
      switch (lastMessage.type) {
        case "buttonPressed":
          setPressedDevice(lastMessage.ip || null);
          fetchTeams(); // Refresh to show updated points
          break;
        case "reset":
          setPressedDevice(null);
          fetchTeams(); // Refresh to show updated points
          break;
        case "timerStart":
          setTimerActive(true);
          setTimeRemaining(lastMessage.timeRemaining || 15);
          break;
        case "timerTick":
          setTimeRemaining(lastMessage.timeRemaining || 0);
          break;
        case "timerEnd":
          setTimerActive(false);
          setTimeRemaining(0);
          break;
      }
    }
  }, [lastMessage]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#12192b] via-[#60279a] to-[#9150c1]">
      {/* Timer Countdown Overlay */}
      {timerActive && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="text-9xl font-bold text-white mb-4 animate-pulse font-mono">
              {timeRemaining}
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 min-h-screen flex items-center justify-center">
        {teams.length === 0 ? (
          <Card>
            <CardContent className="py-4">
              <p className="text-center text-muted-foreground">
                No teams created yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex justify-center items-center gap-6 w-full">
            {teams.map((team) => (
              <Card
                key={team.id}
                className="relative w-full bg-black/40 backdrop-blur-md border-white/10 shadow-xl rounded-2xl overflow-hidden p-5"
              >
                <CardHeader className="bg-black/20 py-2 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <div>
                        <CardTitle className="text-4xl text-white px-4">
                          {team.name}
                        </CardTitle>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-5xl font-bold text-white mt-1">
                        {team.points || 0}
                      </div>
                      <div className="text-lg text-white/50 leading-tight">
                        points
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="bg-black/20 py-2 rounded-xl">
                  {team.players && team.players.length > 0 ? (
                    <Table className="rounded-xl overflow-hidden">
                      <TableHeader>
                        <TableRow className="border-white/10">
                          <TableHead className="text-white/70 text-xl py-3 w-3/4 rounded-tl-xl">
                            Player Name
                          </TableHead>
                          <TableHead className="text-white/70 text-xl py-3 text-right w-1/4 rounded-tr-xl">
                            Status
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {team.players.map((player, index, array) => {
                          const isPressed =
                            !!player.deviceIp &&
                            !!pressedDevice &&
                            player.deviceIp === pressedDevice;
                          const isLastRow = index === array.length - 1;
                          return (
                            <TableRow
                              key={player.id}
                              className={
                                isPressed
                                  ? "bg-yellow-500/20 border-yellow-400/30 rounded-lg"
                                  : "border-white/10 rounded-lg"
                              }
                            >
                              <TableCell
                                className={`font-medium text-white text-xl py-4 w-3/4 ${
                                  isLastRow ? "rounded-bl-xl" : ""
                                }`}
                              >
                                <div className="flex items-center gap-4">
                                  {player.name}
                                  {isPressed && (
                                    <Badge
                                      variant="destructive"
                                      className="animate-pulse bg-yellow-500 text-black text-lg px-3 py-1 rounded-full"
                                    >
                                      <Zap className="h-4 w-4 mr-1" />
                                      PRESSED!
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell
                                className={`py-4 text-right w-1/4 ${
                                  isLastRow ? "rounded-br-xl" : ""
                                }`}
                              >
                                {player.deviceIp ? (
                                  <Badge className="bg-green-600/70 text-white border-green-500/40 text-lg px-3 py-1 rounded-full">
                                    Ready
                                  </Badge>
                                ) : (
                                  <Badge className="bg-white/10 text-white/70 border-white/20 text-lg px-3 py-1 rounded-full">
                                    -
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-center text-white/50 py-6 text-2xl">
                      No players in this team
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
