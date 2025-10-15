import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { TeamsList } from "./components/TeamsList";
import { PlayersList } from "./components/PlayersList";
import { GameStatus } from "./components/GameStatus";
import { Leaderboard } from "./components/Leaderboard";
import { WebSocketProvider } from "./hooks/useWebSocket";
import { useTeams } from "./hooks/useTeams";
import { Button } from "./components/ui/button";
import { Trophy } from "lucide-react";

function App() {
  return (
    <BrowserRouter>
      <WebSocketProvider>
        <AppContent />
      </WebSocketProvider>
    </BrowserRouter>
  );
}

function AppContent() {
  const { teams, refetch } = useTeams();
  const location = useLocation();
  const isLeaderboard = location.pathname === '/leaderboard';

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      {!isLeaderboard && (
        <div className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Game Show Control Panel</h1>
              <Link to="/leaderboard">
                <Button variant="default" size="lg">
                  <Trophy className="h-5 w-5 mr-2" />
                  View Leaderboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      <Routes>
        <Route path="/" element={
          <div className="container mx-auto py-8 px-4">
            <div className="mb-8">
              <h2 className="text-4xl font-bold text-center mb-2">
                Game Show Button System
              </h2>
              <p className="text-muted-foreground text-center">
                Manage teams, players, and monitor device connections for your game show
              </p>
            </div>

            <div className="grid gap-6">
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <TeamsList />
                </div>
                <div>
                  <GameStatus />
                </div>
              </div>
              <div>
                <PlayersList teams={teams} onRefreshTeams={refetch} />
              </div>
            </div>
          </div>
        } />
        <Route path="/leaderboard" element={<Leaderboard />} />
      </Routes>
    </div>
  );
}

export default App;
