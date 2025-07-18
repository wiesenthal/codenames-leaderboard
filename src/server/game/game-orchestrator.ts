import type {
  Game,
  GameConfig,
  GameState,
  Player,
} from "../../lib/codenames/types";
import {
  safeEmitGameStateUpdate as emitGameStateUpdate,
  safeEmitGameEnded as emitGameEnded,
  safeEmitAIThinking as emitAIThinking,
  safeEmitAIMoveComplete as emitAIMoveComplete,
  safeEmitGameError as emitGameError,
} from "../websocket/socket-emitters";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { games } from "../db/schema";
import {
  CodenamesGameEngine,
  type InitializedCodenamesGameEngine,
} from "../../lib/codenames/game-engine";
import { CodenamesAI } from "../../lib/codenames/ai";

// TODO: persist state of players in memory
// Game orchestrator manages game state and AI moves
export class GameOrchestrator {
  static async removeGame(gameId: string): Promise<void> {
    await db.update(games).set({ archived: true }).where(eq(games.id, gameId));
    console.log(`[Orchestrator] Game ${gameId} removed`);
  }

  static async createGame(
    gameConfig: GameConfig,
  ): Promise<InitializedCodenamesGameEngine> {
    const gameEngine = await CodenamesGameEngine.init(gameConfig);

    void this.checkAndTriggerAIMove(gameEngine.gameId);

    return gameEngine;
  }

  static async getGameEngine(gameId: string): Promise<CodenamesGameEngine> {
    return new CodenamesGameEngine({
      gameId,
    });
  }

  static async getGame(gameId: string): Promise<Game | null> {
    // get game from db
    const gameEngine = new CodenamesGameEngine({
      gameId,
    });
    return await gameEngine.loadFromDb();
  }

  // Called after any game state change
  static async handleGameStateChange(
    gameId: string,
    gameState: GameState,
  ): Promise<void> {
    // Emit the updated game state to all connected clients
    emitGameStateUpdate(gameId, gameState);

    // Check if game ended
    if (gameState.winner || gameState.currentPhase === "game-over") {
      emitGameEnded(gameId, gameState.winner ?? "unknown");
      // update the game in the db
      await db
        .update(games)
        .set({
          status: "completed",
          winner: gameState.winner ?? "unknown",
          completedAt: new Date(),
        })
        .where(eq(games.id, gameId));
      return;
    }

    // Check if we need to trigger an AI move
    await GameOrchestrator.checkAndTriggerAIMove(gameId);
  }

  private static async checkAndTriggerAIMove(gameId: string): Promise<void> {
    const gameEngine = new CodenamesGameEngine({
      gameId,
    });

    await gameEngine.loadFromDb();

    // Find the AI player who should move
    const currentPlayer = await gameEngine.getCurrentPlayer();

    if (!currentPlayer) {
      emitGameError(gameId, {
        message: "No current player found",
      });
      return;
    }

    if (currentPlayer.type === "ai") {
      console.log(
        `[Orchestrator] Executing immediate AI move for ${currentPlayer.name} (${currentPlayer.team} ${currentPlayer.data.role})`,
      );

      // Execute AI move immediately
      void GameOrchestrator.executeAIMove(gameId, currentPlayer);
    }
  }

  private static async executeAIMove(
    gameId: string,
    player: Player,
  ): Promise<void> {
    const gameEngine = new CodenamesGameEngine({
      gameId,
    });
    const game = await gameEngine.loadFromDb();
    if (!game) return;

    // Emit AI thinking event
    emitAIThinking(gameId, player.id, player.name);

    const aiPlayer = new CodenamesAI(player);

    console.log(`[Orchestrator] ${player.name} is making a move...`);

    const action = await aiPlayer.takeAction(game.gameState, game.gameHistory);
    const result = await gameEngine.takeAction(action);
    if (!result.success) {
      console.error(`[Orchestrator] Failed to take action: ${result.error}`);
      emitGameError(gameId, {
        message: result.error ?? "Failed to take action",
      });
      return;
    }
    emitAIMoveComplete(gameId, player.id, action.data._type);
  }

  // Get all active games (for monitoring/admin purposes)
  static async getActiveGames(): Promise<Array<Game>> {
    return await db.query.games.findMany({
      where: eq(games.archived, false),
      with: {
        players: true,
        gameHistory: true,
      },
    });
  }
}

// Global singleton instance with lazy initialization
declare global {
  var __gameOrchestrator: GameOrchestrator | undefined;
}

export const gameOrchestrator =
  global.__gameOrchestrator ?? (global.__gameOrchestrator = GameOrchestrator);
