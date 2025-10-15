import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Edit } from "lucide-react";
import type { Player, Team } from "@/lib/api";

interface PlayerFormProps {
  onSubmit: (name: string, teamId?: string, deviceIp?: string) => Promise<void>;
  player?: Player;
  trigger?: React.ReactNode;
  teams: Team[];
}

export function PlayerForm({ onSubmit, player, trigger, teams }: PlayerFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(player?.name || "");
  const [teamId, setTeamId] = useState(player?.teamId || "");
  const [deviceIp, setDeviceIp] = useState(player?.deviceIp || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debug: log teams when dialog opens
  console.log('PlayerForm teams:', teams);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(name, teamId || undefined, deviceIp || undefined);
      setOpen(false);
      if (!player) {
        // Reset form for new player
        setName("");
        setTeamId("");
        setDeviceIp("");
      }
    } catch (error) {
      console.error("Failed to save player:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const defaultTrigger = player ? (
    <Button variant="outline" size="sm">
      <Edit className="h-4 w-4 mr-2" />
      Edit
    </Button>
  ) : (
    <Button size="sm">
      <UserPlus className="h-4 w-4 mr-2" />
      Add Player
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogHeader>
            <DialogTitle>{player ? "Edit Player" : "Add New Player"}</DialogTitle>
            <DialogDescription>
              {player
                ? "Update the player information."
                : "Create a new player for the game show."}
            </DialogDescription>
          </DialogHeader>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Player Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Player name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="teamId">Team (optional)</Label>
            <select
              id="teamId"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">No team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="deviceIp">Device IP (optional)</Label>
            <Input
              id="deviceIp"
              value={deviceIp}
              onChange={(e) => setDeviceIp(e.target.value)}
              placeholder="192.168.1.100"
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? "Saving..." : player ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
