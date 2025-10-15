const API_BASE_URL = import.meta.env.DEV ? "" : "http://localhost:3000";

export interface Team {
  id: string;
  name: string;
  points?: number;
  players?: Player[];
}

export interface Player {
  id: string;
  name: string;
  teamId?: string | null;
  deviceIp?: string | null;
}

export interface Device {
  ip: string;
}

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Teams API
  async getTeams(): Promise<Team[]> {
    return this.request<Team[]>("/teams");
  }

  async getTeam(id: string): Promise<Team> {
    return this.request<Team>(`/teams/${id}`);
  }

  async createTeam(name: string): Promise<Team> {
    return this.request<Team>("/teams", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  async updateTeam(id: string, name: string): Promise<Team> {
    return this.request<Team>(`/teams/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name }),
    });
  }

  async patchTeamPoints(id: string, points: number): Promise<Team> {
    return this.request<Team>(`/teams/${id}`, {
      method: "PUT",
      body: JSON.stringify({ points }),
    });
  }

  async deleteTeam(id: string): Promise<void> {
    await this.request<void>(`/teams/${id}`, {
      method: "DELETE",
    });
  }

  // Players API
  async getPlayers(): Promise<Player[]> {
    return this.request<Player[]>("/teams/players");
  }

  async getPlayer(id: string): Promise<Player> {
    return this.request<Player>(`/teams/players/${id}`);
  }

  async createPlayer(name: string, teamId?: string, deviceIp?: string): Promise<Player> {
    return this.request<Player>("/teams/players", {
      method: "POST",
      body: JSON.stringify({ name, teamId, deviceIp }),
    });
  }

  async updatePlayer(id: string, name?: string, teamId?: string | null, deviceIp?: string): Promise<Player> {
    return this.request<Player>(`/teams/players/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name, teamId, deviceIp }),
    });
  }

  async deletePlayer(id: string): Promise<void> {
    await this.request<void>(`/teams/players/${id}`, {
      method: "DELETE",
    });
  }

  // Assignment API
  async assignPlayerToTeam(teamId: string, playerId: string): Promise<Player> {
    return this.request<Player>(`/teams/${teamId}/players/${playerId}`, {
      method: "POST",
    });
  }

  async unassignPlayerFromTeam(teamId: string, playerId: string): Promise<Player> {
    return this.request<Player>(`/teams/${teamId}/players/${playerId}`, {
      method: "DELETE",
    });
  }

  // Devices API
  async getDevices(): Promise<string[]> {
    return this.request<string[]>("/devices");
  }

  async getPressedButton(): Promise<{ pressedButton: string | null }> {
    return this.request<{ pressedButton: string | null }>("/devices/pressed");
  }
}

export const apiClient = new ApiClient();
