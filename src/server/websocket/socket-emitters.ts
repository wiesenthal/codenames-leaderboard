import type { GameState, Team } from "~/lib/codenames/types";

// Safe wrapper functions that check if Socket.IO is available
export function safeEmitGameStateUpdate(gameId: string, gameState: Partial<GameState>): void {
  try {
    if (typeof global !== "undefined" && global.io) {
      global.io.to(`game:${gameId}`).emit("gameStateUpdate", gameState);
    }
  } catch (error) {
    // Socket.IO not available - gracefully ignore
  }
}

export function safeEmitGameEnded(gameId: string, winner: Team, players: Array<{ name: string; team: Team; role: string; type: string }>): void {
  try {
    if (typeof global !== "undefined" && global.io) {
      // Emit to both the game room and the game-endings room
      global.io.to(`game:${gameId}`).emit("gameEnded", { gameId, winner, players });
      global.io.to("game-endings").emit("gameEnded", { gameId, winner, players });
    }
  } catch (error) {
    // Socket.IO not available - gracefully ignore
  }
}

export function safeEmitAIThinking(gameId: string, playerId: string, playerName: string): void {
  try {
    if (typeof global !== "undefined" && global.io) {
      global.io.to(`game:${gameId}`).emit("aiThinking", { playerId, playerName });
    }
  } catch (error) {
    // Socket.IO not available - gracefully ignore
  }
}

export function safeEmitAIMoveComplete(gameId: string, playerId: string, action: string): void {
  try {
    if (typeof global !== "undefined" && global.io) {
      global.io.to(`game:${gameId}`).emit("aiMoveComplete", { playerId, action });
    }
  } catch (error) {
    // Socket.IO not available - gracefully ignore
  }
}

export function safeEmitGameError(gameId: string, error: { message: string; code?: string }): void {
  try {
    if (typeof global !== "undefined" && global.io) {
      global.io.to(`game:${gameId}`).emit("gameError", error);
    }
  } catch (error) {
    // Socket.IO not available - gracefully ignore
  }
} 