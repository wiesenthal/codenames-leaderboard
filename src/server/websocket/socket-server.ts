import type { Server as HTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import type {
  GameActionInput,
  GameState,
  Player,
  Team,
} from "../../lib/codenames/types";
import { CodenamesGameEngine } from "../../lib/codenames/game-engine";
import { GameOrchestrator } from "../game/game-orchestrator";

// Extend global type for Socket.IO instance
declare global {
  // eslint-disable-next-line no-var
  var io:
    | SocketIOServer<
        ClientToServerEvents,
        ServerToClientEvents,
        InterServerEvents,
        SocketData
      >
    | undefined;
}

export interface ServerToClientEvents {
  // Game state updates
  gameStateUpdate: (gameState: GameState) => void;

  // Game ending events (for main page)
  gameEnded: (data: { gameId: string; winner: Team }) => void;

  // AI thinking indicator
  aiThinking: (data: { playerId: string; playerName: string }) => void;
  aiMoveComplete: (data: { playerId: string; action: string }) => void;

  // Awaiting player move indicator
  awaitingPlayerMove: (data: { playerId: string }) => void;

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

let io: SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
> | null = null;

export function initializeSocketServer(httpServer: HTTPServer) {
  io = new SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: {
      origin:
        process.env.NODE_ENV === "production"
          ? false
          : ["http://localhost:3000"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log(`socket-server.ts [Socket] Client connected: ${socket.id}`);

    socket.on("joinGame", async (gameId, setGameState, setPlayers) => {
      console.log(
        `socket-server.ts [Socket] Client ${socket.id} joining game ${gameId}`,
      );
      void socket.join(`game:${gameId}`);
      socket.data.gameId = gameId;
      // get the game state from the game orchestrator
      const game = await GameOrchestrator.getGame(gameId);
      if (!game) {
        console.error(`[Socket] Game ${gameId} not found`);
        return;
      }
      setGameState(game.gameState);
      setPlayers(game.players);
    });

    socket.on("leaveGame", (gameId) => {
      console.log(
        `socket-server.ts [Socket] Client ${socket.id} leaving game ${gameId}`,
      );
      void socket.leave(`game:${gameId}`);
      socket.data.gameId = undefined;
    });

    socket.on("subscribeToGameEndings", () => {
      console.log(
        `socket-server.ts [Socket] Client ${socket.id} subscribing to game endings`,
      );
      void socket.join("game-endings");
    });

    socket.on("unsubscribeFromGameEndings", () => {
      console.log(
        `socket-server.ts [Socket] Client ${socket.id} unsubscribing from game endings`,
      );
      void socket.leave("game-endings");
    });

    socket.on(
      "takeAction",
      async (
        action: GameActionInput,
        callback: (result: {
          success: boolean;
          error?: string;
          gameState?: GameState;
        }) => void,
      ) => {
        console.log(
          `socket-server.ts [Socket] Client ${socket.id} taking action: ${JSON.stringify(action)}`,
        );
        const gameId = socket.data.gameId;
        if (!gameId) {
          console.error(
            `socket-server.ts [Socket] Client ${socket.id} not in a game`,
          );
          callback({ success: false, error: "Not in a game" });
          return;
        }
        const gameEngine = new CodenamesGameEngine({ gameId });

        // check that the client is the current player
        const currentPlayer = await gameEngine.getCurrentPlayer();
        if (currentPlayer?.id !== socket.id) {
          console.error(
            `socket-server.ts [Socket] Client ${socket.id} is not the current player`,
          );
          callback({ success: false, error: "Not the current player" });
          return;
        }

        const result = await gameEngine.takeAction(action);
        if (!result.success) {
          console.error(`[Socket] Failed to take action: ${result.error}`);
          callback({ success: false, error: result.error });
          return;
        }
        callback({ success: true });
      },
    );

    socket.on("disconnect", () => {
      console.log(
        `socket-server.ts [Socket] Client disconnected: ${socket.id}`,
      );
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
export function emitGameStateUpdate(gameId: string, gameState: GameState) {
  const server = getSocketServer();
  server.to(`game:${gameId}`).emit("gameStateUpdate", gameState);
}

export function emitGameEnded(gameId: string, winner: Team) {
  const server = getSocketServer();
  // Emit to both the game room and the game-endings room
  server.to(`game:${gameId}`).emit("gameEnded", { gameId, winner });
  server.to("game-endings").emit("gameEnded", { gameId, winner });
}

export function emitAIThinking(
  gameId: string,
  playerId: string,
  playerName: string,
) {
  const server = getSocketServer();
  server.to(`game:${gameId}`).emit("aiThinking", { playerId, playerName });
}

export function emitAIMoveComplete(
  gameId: string,
  playerId: string,
  action: string,
) {
  const server = getSocketServer();
  server.to(`game:${gameId}`).emit("aiMoveComplete", { playerId, action });
}

export function emitGameError(
  gameId: string,
  error: { message: string; code?: string },
) {
  const server = getSocketServer();
  server.to(`game:${gameId}`).emit("gameError", error);
}
