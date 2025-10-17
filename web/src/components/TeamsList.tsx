import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TeamForm } from "./TeamForm";
import { useTeams } from "@/hooks/useTeams";
import { useWebSocket } from "@/hooks/useWebSocketHook";
import { Trash2, RefreshCw, Wifi, WifiOff, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";

export function TeamsList() {
  const [devices, setDevices] = useState<string[]>([]);
  const { teams, loading, error, createTeam, updateTeam, deleteTeam, refetch } =
    useTeams();
  const { lastMessage, sendMessage } = useWebSocket();
  const [pressedDevice, setPressedDevice] = useState<string | null>(null);

  const fetchDevices = async () => {
    const deviceList = await apiClient.getDevices();
    setDevices(deviceList);
  };

  const fetchPressedButton = async () => {
    const { pressedButton } = await apiClient.getPressedButton();
    setPressedDevice(pressedButton);
  };

  const addDevice = (ip: string) => {
    setDevices((prev) => (prev.includes(ip) ? prev : [...prev, ip]));
  };

  const removeDevice = (ip: string) => {
    setDevices((prev) => prev.filter((d) => d !== ip));
  };

  const resetPressedDevice = () => {
    sendMessage({ type: "reset" });
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
          setPressedDevice(lastMessage.ip || null);
          break;
        case "reset":
          setPressedDevice(null);
          break;
      }
    }
  }, [lastMessage]);

  useEffect(() => {
    fetchDevices();
    fetchPressedButton();
    // Refresh devices every 30 seconds (less frequent since we have WebSocket updates)
    const interval = setInterval(fetchDevices, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateTeam = async (name: string) => {
    await createTeam(name);
  };

  const handleUpdateTeam = async (id: string, name: string) => {
    await updateTeam(id, name);
  };

  const handleDeleteTeam = async (id: string) => {
    if (confirm("Are you sure you want to delete this team?")) {
      await deleteTeam(id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading teams...</span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Game Show Teams</CardTitle>
            <CardDescription>
              Manage teams and their button devices
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={refetch} size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <TeamForm onSubmit={handleCreateTeam} />
            {pressedDevice && (
              <Button
                variant="destructive"
                onClick={resetPressedDevice}
                size="sm"
              >
                <Zap className="h-4 w-4 mr-2" />
                Reset Pressed
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {teams.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No teams created yet.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team Name</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Players</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.map((team) => {
                const pressedPlayer = team.players?.find(
                  (p) =>
                    !!p.deviceIp &&
                    !!pressedDevice &&
                    p.deviceIp === pressedDevice
                );

                return (
                  <TableRow key={team.id}>
                    <TableCell className="font-medium">{team.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-lg font-bold">
                        {team.points || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {team.players && team.players.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {team.players.map((player) => {
                            const isPressed =
                              !!player.deviceIp &&
                              !!pressedDevice &&
                              player.deviceIp === pressedDevice;
                            return (
                              <Badge
                                key={player.id}
                                variant={
                                  isPressed ? "destructive" : "secondary"
                                }
                                className={isPressed ? "animate-pulse" : ""}
                              >
                                {isPressed && <Zap className="h-3 w-3 mr-1" />}
                                {player.name}
                                {isPressed && " - PRESSED!"}
                              </Badge>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          No players
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {team.players &&
                      team.players.some(
                        (p) => p.deviceIp && devices.includes(p.deviceIp)
                      ) ? (
                        <Badge
                          variant={pressedPlayer ? "destructive" : "default"}
                          className="flex items-center w-fit"
                        >
                          <Wifi className="h-3 w-3 mr-1" />
                          {pressedPlayer ? "Active" : "Connected"}
                        </Badge>
                      ) : team.players &&
                        team.players.some((p) => p.deviceIp) ? (
                        <Badge
                          variant="destructive"
                          className="flex items-center w-fit"
                        >
                          <WifiOff className="h-3 w-3 mr-1" />
                          Disconnected
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="flex items-center w-fit"
                        >
                          <WifiOff className="h-3 w-3 mr-1" />
                          No Devices
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <TeamForm
                          team={team}
                          onSubmit={(name) => handleUpdateTeam(team.id, name)}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteTeam(team.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
