import { useState, useEffect } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PlayerForm } from "./PlayerForm";
import { Trash2, RefreshCw, Users, Trophy, Zap } from "lucide-react";
import { apiClient, type Player, type Team } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocketHook";

interface PlayersListProps {
  teams: Team[];
  onRefreshTeams: () => void;
}

export function PlayersList({ teams, onRefreshTeams }: PlayersListProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pressedDevice, setPressedDevice] = useState<string | null>(null);
  const { lastMessage, sendMessage } = useWebSocket();

  const fetchPlayers = async () => {
    try {
      setError(null);
      const data = await apiClient.getPlayers();
      setPlayers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch players");
    }
  };

  useEffect(() => {
    const fetchPressedButton = async () => {
      const { pressedButton } = await apiClient.getPressedButton();
      setPressedDevice(pressedButton);
    };

    fetchPressedButton();
    fetchPlayers();
  }, []);

  // Handle WebSocket messages for button press
  useEffect(() => {
    if (lastMessage) {
      switch (lastMessage.type) {
        case "buttonPressed":
          setPressedDevice(lastMessage.ip || null);
          break;
        case "reset":
          setPressedDevice(null);
          break;
      }
    }
  }, [lastMessage]);

  const handleCreatePlayer = async (
    name: string,
    teamId?: string,
    deviceIp?: string
  ) => {
    try {
      const newPlayer = await apiClient.createPlayer(name, teamId, deviceIp);
      setPlayers((prev) => [...prev, newPlayer]);
      onRefreshTeams(); // Refresh teams to show updated players
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create player");
      throw err;
    }
  };

  const handleUpdatePlayer = async (
    id: string,
    name: string,
    teamId?: string,
    deviceIp?: string
  ) => {
    try {
      const updatedPlayer = await apiClient.updatePlayer(
        id,
        name,
        teamId,
        deviceIp
      );
      setPlayers((prev) => prev.map((p) => (p.id === id ? updatedPlayer : p)));
      onRefreshTeams(); // Refresh teams to show updated players
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update player");
      throw err;
    }
  };

  const handleDeletePlayer = async (id: string) => {
    if (confirm("Are you sure you want to delete this player?")) {
      try {
        await apiClient.deletePlayer(id);
        setPlayers((prev) => prev.filter((p) => p.id !== id));
        onRefreshTeams(); // Refresh teams to show updated players
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to delete player"
        );
        throw err;
      }
    }
  };

  const getTeamName = (teamId?: string) => {
    if (!teamId) return "No Team";
    const team = teams.find((t) => t.id === teamId);
    return team ? team.name : "Unknown Team";
  };

  // Component to give points to a player's team when they press
  const GivePointButton = ({ player }: { player: Player }) => {
    const [open, setOpen] = useState(false);
    const [points, setPoints] = useState(0);
    const team = teams.find((t) => t.id === player.teamId);

    if (!team) return null;

    const handleGivePoints = async () => {
      try {
        await apiClient.patchTeamPoints(
          team.id,
          Math.max(0, (team.points || 0) + points)
        );
        setOpen(false);
        setPoints(1);

        // Send reset command to clear button press
        sendMessage({ type: "reset" });

        // Refresh data to show updated points
        fetchPlayers();
        onRefreshTeams();
        setPressedDevice(null);
      } catch (error) {
        console.error("Failed to give points:", error);
      }
    };

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <Button size="sm" onClick={() => setOpen(true)} variant="default">
          <Trophy className="h-4 w-4 mr-1" />
          Give Points
        </Button>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Give Points</DialogTitle>
            <DialogDescription>
              {player.name} from team {team.name} pressed the button! How many
              points to award?
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center gap-4 py-4">
            <Button
              onClick={() => setPoints(Math.max(-1, points - 1))}
              variant="outline"
            >
              -
            </Button>
            <span className="text-4xl font-bold w-20 text-center">
              {points}
            </span>
            <Button onClick={() => setPoints(points + 1)} variant="outline">
              +
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleGivePoints}>Award Points</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Players
            </CardTitle>
            <CardDescription>
              Manage players and assign them to teams
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchPlayers} size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <PlayerForm onSubmit={handleCreatePlayer} teams={teams} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {players.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No players created yet.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player Name</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Device IP</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players
                .sort(
                  (a, b) =>
                    a.teamId?.localeCompare(b.teamId || "") ||
                    a.name.localeCompare(b.name)
                )
                .map((player) => {
                  const teamName = getTeamName(player.teamId || undefined);
                  const isPressed =
                    !!player.deviceIp &&
                    !!pressedDevice &&
                    player.deviceIp === pressedDevice;
                  return (
                    <TableRow
                      key={player.id}
                      className={isPressed ? "bg-yellow-100" : ""}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {player.name}
                          {isPressed && (
                            <Badge variant="default" className="bg-yellow-500">
                              <Zap className="h-3 w-3 mr-1" />
                              PRESSED!
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {teamName ? (
                          <Badge variant="default">{teamName}</Badge>
                        ) : (
                          <Badge variant="secondary">No team</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {player.deviceIp || (
                          <span className="text-muted-foreground">
                            Not assigned
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {isPressed && player.teamId && (
                            <GivePointButton player={player} />
                          )}
                          <PlayerForm
                            player={player}
                            teams={teams}
                            onSubmit={(name, teamId, deviceIp) =>
                              handleUpdatePlayer(
                                player.id,
                                name,
                                teamId,
                                deviceIp
                              )
                            }
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeletePlayer(player.id)}
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
