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
import { and, eq } from "drizzle-orm";
import { games } from "../db/schema";
import {
  CodenamesGameEngine,
  type InitializedCodenamesGameEngine,
} from "../../lib/codenames/game-engine";
import { CodenamesAI } from "../../lib/codenames/ai";

// TODO: persist state of players in memory
// Game orchestrator manages game state and AI moves
export class GameOrchestrator {
  static numAILoopsActive = 0;

  static async removeGame(gameId: string): Promise<void> {
    await db.update(games).set({ archived: true }).where(eq(games.id, gameId));
    console.log(`[Orchestrator] Game ${gameId} removed`);
  }

  static async createGame(
    gameConfig: GameConfig,
  ): Promise<InitializedCodenamesGameEngine> {
    const gameEngine = await CodenamesGameEngine.init(gameConfig);

    void this.checkAndMarkAIToMove(gameEngine.gameId);

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
      console.log(
        `[Orchestrator] Game ended. Winner: ${gameState.winner ?? "unknown"}`,
      );
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
    }

    // Check if we need to trigger an AI move
    await GameOrchestrator.checkAndMarkAIToMove(gameId);
  }

  private static async checkAndMarkAIToMove(gameId: string): Promise<void> {
    const gameEngine = await CodenamesGameEngine.initLoad(gameId);

    // Find the AI player who should move
    const currentPlayer = await gameEngine.getCurrentPlayer();

    if (!currentPlayer) {
      emitGameError(gameId, {
        message: "No current player found",
      });
      return;
    }

    if (currentPlayer.type === "ai") {
      // console.log(
      //   `[Orchestrator] Executing immediate AI move for ${currentPlayer.name} (${currentPlayer.team} ${currentPlayer.data.role})`,
      // );

      // Execute AI move immediately
      // void GameOrchestrator.executeAIMove(gameId, currentPlayer);
      // Mark the game as needing an AI move
      await db
        .update(games)
        .set({ shouldPromptAIMove: true })
        .where(eq(games.id, gameId));
      void this.checkIfAIMoveIsNeeded();
    } else {
      console.log(
        `[Orchestrator] ENDING LOOP. Current player is not an AI player.`,
      );
    }
  }

  // ai move loop
  static async checkIfAIMoveIsNeeded(): Promise<void> {
    // check if any games are marked as needing an ai move
    const game = await db.query.games.findFirst({
      where: eq(games.shouldPromptAIMove, true),
      orderBy: ({ updatedAt }, { asc }) => [asc(updatedAt)],
    });
    if (!game) {
      console.log(
        `[Orchestrator] ENDING LOOP. No games are marked as needing an AI move. Active loops: ${this.numAILoopsActive}`,
      );
      return;
    }
    // update it if it is needed
    const [updatedGame] = await db
      .update(games)
      .set({ shouldPromptAIMove: false })
      .where(and(eq(games.id, game.id), eq(games.shouldPromptAIMove, true)))
      .returning();

    if (!updatedGame) {
      console.log(
        `[Orchestrator] Race condition met, no game updated, so retrying. Active loops: ${this.numAILoopsActive}`,
      );
      void this.checkIfAIMoveIsNeeded();
      return;
    }

    const gameEngine = await CodenamesGameEngine.initLoad(game.id);
    const currentPlayer = await gameEngine.getCurrentPlayer();
    if (!currentPlayer) {
      console.log(
        `[Orchestrator] ENDING LOOP. No current player found. Active loops: ${this.numAILoopsActive}`,
      );
      return;
    }
    this.numAILoopsActive++;
    console.log(
      `[Orchestrator] Executing AI move. Active loops: ${this.numAILoopsActive}`,
    );
    await this.executeAIMove(game.id, currentPlayer);
    this.numAILoopsActive--;
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
