import { Router } from "express";
import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";

// New data shapes
interface Team {
  id: string;
  name: string;
  points: number;
}

interface Player {
  id: string;
  name: string;
  teamId?: string | null;
  deviceIp?: string | null;
}

const teamsRouter = Router();

// Initialize SQLite database with foreign keys enabled
const initDb = async (): Promise<Database> => {
  const db = await open({
    filename: "./teams.db",
    driver: sqlite3.Database,
  });

  // Ensure foreign keys are enforced
  await db.exec(`PRAGMA foreign_keys = ON;`);

  // Create tables if they don't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      points INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      teamId TEXT NULL,
      deviceIp TEXT NULL,
      FOREIGN KEY (teamId) REFERENCES teams(id) ON DELETE SET NULL
    );
  `);

  // Migration: Add points column if it doesn't exist (for existing databases)
  try {
    await db.exec(`ALTER TABLE teams ADD COLUMN points INTEGER NOT NULL DEFAULT 0;`);
    console.log("Added points column to teams table");
  } catch (err: any) {
    // Column already exists or table doesn't exist yet - both are fine
    if (!err.message?.includes("duplicate column")) {
      console.log("Points column already exists or table is new");
    }
  }

  return db;
};

let dbPromise = initDb().catch((err) => {
  console.error("Failed to initialize database:", err);
  // Retry initialization
  return initDb();
});

// Helper: return teams including their players
async function getAllTeamsWithPlayers(db: Database) {
  const teams: Team[] = await db.all("SELECT * FROM teams ORDER BY name");
  const players: Player[] = await db.all("SELECT * FROM players");

  const playersByTeam = players.reduce<Record<string, Player[]>>((acc, p) => {
    const key = p.teamId ?? "__unassigned__";
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  return teams.map((t) => ({
    ...t,
    players: playersByTeam[t.id] || [],
  }));
}

// GET /teams - list teams with players
teamsRouter.get("/", async (req, res) => {
  try {
    const db = await dbPromise;
    const teamsWithPlayers = await getAllTeamsWithPlayers(db);
    res.json(teamsWithPlayers);
  } catch (err) {
    console.error("Error getting teams:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// --- Players endpoints (MUST come before /:id to avoid route conflicts) ---

// GET /players - list all players
teamsRouter.get("/players", async (req, res) => {
  try {
    const db = await dbPromise;
    const players: Player[] = await db.all("SELECT * FROM players ORDER BY name");
    res.json(players);
  } catch (err) {
    console.error("Error getting players:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// GET /players/:id
teamsRouter.get("/players/:id", async (req, res) => {
  try {
    const db = await dbPromise;
    const player = await db.get("SELECT * FROM players WHERE id = ?", req.params.id);
    if (!player) return res.status(404).json({ error: "Player not found" });
    res.json(player);
  } catch (err) {
    console.error("Error getting player:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// POST /players - create player (optional teamId)
teamsRouter.post("/players", async (req, res) => {
  const { name, teamId, deviceIp } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });

  const id = Date.now().toString();
  try {
    const db = await dbPromise;
    // if teamId provided, ensure team exists
    if (teamId) {
      const team = await db.get("SELECT id FROM teams WHERE id = ?", teamId);
      if (!team) return res.status(400).json({ error: "teamId not found" });
    }

    await db.run("INSERT INTO players (id, name, teamId, deviceIp) VALUES (?, ?, ?, ?)", id, name, teamId ?? null, deviceIp ?? null);
    const player = await db.get("SELECT * FROM players WHERE id = ?", id);
    res.status(201).json(player);
  } catch (err) {
    console.error("Error creating player:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// PUT /players/:id - update player (name, teamId, deviceIp)
teamsRouter.put("/players/:id", async (req, res) => {
  const { name, teamId, deviceIp } = req.body;
  try {
    const db = await dbPromise;
    const existing = await db.get("SELECT * FROM players WHERE id = ?", req.params.id);
    if (!existing) return res.status(404).json({ error: "Player not found" });

    if (teamId) {
      const team = await db.get("SELECT id FROM teams WHERE id = ?", teamId);
      if (!team) return res.status(400).json({ error: "teamId not found" });
    }

    await db.run(
      "UPDATE players SET name = COALESCE(?, name), teamId = ?, deviceIp = COALESCE(?, deviceIp) WHERE id = ?",
      name,
      teamId ?? null,
      deviceIp,
      req.params.id
    );

    const player = await db.get("SELECT * FROM players WHERE id = ?", req.params.id);
    res.json(player);
  } catch (err) {
    console.error("Error updating player:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// DELETE /players/:id
teamsRouter.delete("/players/:id", async (req, res) => {
  try {
    const db = await dbPromise;
    const result = await db.run("DELETE FROM players WHERE id = ?", req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: "Player not found" });
    res.status(204).send();
  } catch (err) {
    console.error("Error deleting player:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// --- Team-specific endpoints (after /players routes) ---

// GET /teams/:id - single team with players
teamsRouter.get("/:id", async (req, res) => {
  try {
    const db = await dbPromise;
    const team = await db.get("SELECT * FROM teams WHERE id = ?", req.params.id);
    if (!team) return res.status(404).json({ error: "Team not found" });
    const players: Player[] = await db.all("SELECT * FROM players WHERE teamId = ?", req.params.id);
    res.json({ ...team, players });
  } catch (err) {
    console.error("Error getting team:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// POST /teams - create team
teamsRouter.post("/", async (req, res) => {
  const { name, points } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });

  const id = Date.now().toString();
  try {
    const db = await dbPromise;
    await db.run("INSERT INTO teams (id, name, points) VALUES (?, ?, ?)", id, name, points ?? 0);
    const team = await db.get("SELECT * FROM teams WHERE id = ?", id);
    res.status(201).json(team);
  } catch (err) {
    console.error("Error creating team:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// PUT /teams/:id - update team (name/points)
teamsRouter.put("/:id", async (req, res) => {
  const { name, points } = req.body;
  try {
    const db = await dbPromise;
    const existing = await db.get("SELECT * FROM teams WHERE id = ?", req.params.id);
    if (!existing) return res.status(404).json({ error: "Team not found" });

    await db.run(
      "UPDATE teams SET name = COALESCE(?, name), points = COALESCE(?, points) WHERE id = ?",
      name,
      points,
      req.params.id
    );

    const team = await db.get("SELECT * FROM teams WHERE id = ?", req.params.id);
    const players: Player[] = await db.all("SELECT * FROM players WHERE teamId = ?", req.params.id);
    res.json({ ...team, players });
  } catch (err) {
    console.error("Error updating team:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// DELETE /teams/:id - delete team (players set teamId=NULL)
teamsRouter.delete("/:id", async (req, res) => {
  try {
    const db = await dbPromise;
    const result = await db.run("DELETE FROM teams WHERE id = ?", req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: "Team not found" });
    res.status(204).send();
  } catch (err) {
    console.error("Error deleting team:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// --- Assignment endpoints ---

// POST /teams/:teamId/players/:playerId - assign player to team
teamsRouter.post("/:teamId/players/:playerId", async (req, res) => {
  try {
    const db = await dbPromise;
    const team = await db.get("SELECT id FROM teams WHERE id = ?", req.params.teamId);
    if (!team) return res.status(404).json({ error: "Team not found" });

    const player = await db.get("SELECT * FROM players WHERE id = ?", req.params.playerId);
    if (!player) return res.status(404).json({ error: "Player not found" });

    await db.run("UPDATE players SET teamId = ? WHERE id = ?", req.params.teamId, req.params.playerId);
    const updated = await db.get("SELECT * FROM players WHERE id = ?", req.params.playerId);
    res.json(updated);
  } catch (err) {
    console.error("Error assigning player to team:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// DELETE /teams/:teamId/players/:playerId - unassign player from team (if assigned to that team)
teamsRouter.delete("/:teamId/players/:playerId", async (req, res) => {
  try {
    const db = await dbPromise;
    const player = await db.get("SELECT * FROM players WHERE id = ?", req.params.playerId);
    if (!player) return res.status(404).json({ error: "Player not found" });

    if (player.teamId !== req.params.teamId) {
      return res.status(400).json({ error: "Player is not assigned to this team" });
    }

    await db.run("UPDATE players SET teamId = NULL WHERE id = ?", req.params.playerId);
    const updated = await db.get("SELECT * FROM players WHERE id = ?", req.params.playerId);
    res.json(updated);
  } catch (err) {
    console.error("Error unassigning player from team:", err);
    res.status(500).json({ error: "Database error" });
  }
});

export default teamsRouter;
