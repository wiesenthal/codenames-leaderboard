import { Server as HTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import type { GameState, Team } from "~/lib/codenames/types";

// Extend global type for Socket.IO instance
declare global {
  // eslint-disable-next-line no-var
  var io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> | undefined;
}

export interface ServerToClientEvents {
  // Game state updates
  gameStateUpdate: (gameState: Partial<GameState>) => void;
  
  // Game ending events (for main page)
  gameEnded: (data: { 
    gameId: string; 
    winner: Team; 
    players: Array<{ name: string; team: Team; role: string; type: string }> 
  }) => void;
  
  // AI thinking indicator
  aiThinking: (data: { playerId: string; playerName: string }) => void;
  aiMoveComplete: (data: { playerId: string; action: string }) => void;
  
  // Error events
  gameError: (error: { message: string; code?: string }) => void;
}

export interface ClientToServerEvents {
  // Join/leave game room
  joinGame: (gameId: string) => void;
  leaveGame: (gameId: string) => void;
  
  // Subscribe to game endings only (for main page)
  subscribeToGameEndings: () => void;
  unsubscribeFromGameEndings: () => void;
}

export type InterServerEvents = Record<string, never>;

export interface SocketData {
  gameId?: string;
  playerId?: string;
}

let io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> | null = null;

export function initializeSocketServer(httpServer: HTTPServer) {
  io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === "production" ? false : ["http://localhost:3000"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    socket.on("joinGame", (gameId) => {
      console.log(`[Socket] Client ${socket.id} joining game ${gameId}`);
      void socket.join(`game:${gameId}`);
      socket.data.gameId = gameId;
    });

    socket.on("leaveGame", (gameId) => {
      console.log(`[Socket] Client ${socket.id} leaving game ${gameId}`);
      void socket.leave(`game:${gameId}`);
      socket.data.gameId = undefined;
    });

    socket.on("subscribeToGameEndings", () => {
      console.log(`[Socket] Client ${socket.id} subscribing to game endings`);
      void socket.join("game-endings");
    });

    socket.on("unsubscribeFromGameEndings", () => {
      console.log(`[Socket] Client ${socket.id} unsubscribing from game endings`);
      void socket.leave("game-endings");
    });

    socket.on("disconnect", () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getSocketServer() {
  // Try to get from local instance first
  if (io) return io;
  
  // Try to get from global instance (custom server)
  if (typeof global !== "undefined" && global.io) {
    return global.io;
  }

  throw new Error("Socket.IO server not initialized");
}

// Helper functions to emit events
export function emitGameStateUpdate(gameId: string, gameState: Partial<GameState>) {
  const server = getSocketServer();
  if (server) {
    server.to(`game:${gameId}`).emit("gameStateUpdate", gameState);
  }
}

export function emitGameEnded(gameId: string, winner: Team, players: Array<{ name: string; team: Team; role: string; type: string }>) {
  const server = getSocketServer();
  if (server) {
    // Emit to both the game room and the game-endings room
    server.to(`game:${gameId}`).emit("gameEnded", { gameId, winner, players });
    server.to("game-endings").emit("gameEnded", { gameId, winner, players });
  }
}

export function emitAIThinking(gameId: string, playerId: string, playerName: string) {
  const server = getSocketServer();
  if (server) {
    server.to(`game:${gameId}`).emit("aiThinking", { playerId, playerName });
  }
}

export function emitAIMoveComplete(gameId: string, playerId: string, action: string) {
  const server = getSocketServer();
  if (server) {
    server.to(`game:${gameId}`).emit("aiMoveComplete", { playerId, action });
  }
}

export function emitGameError(gameId: string, error: { message: string; code?: string }) {
  const server = getSocketServer();
  if (server) {
    server.to(`game:${gameId}`).emit("gameError", error);
  }
} 