import { CodenamesGameEngine } from "~/lib/codenames/game-engine";
import { AIPlayer } from "~/lib/ai/openrouter";
import type { GameState, Player } from "~/lib/codenames/types";
import { 
  safeEmitGameStateUpdate as emitGameStateUpdate,
  safeEmitGameEnded as emitGameEnded,
  safeEmitAIThinking as emitAIThinking,
  safeEmitAIMoveComplete as emitAIMoveComplete,
  safeEmitGameError as emitGameError
} from "~/server/websocket/socket-emitters";

// Game orchestrator manages game state and AI moves
export class GameOrchestrator {
  private games = new Map<string, CodenamesGameEngine>();

  constructor() {
    console.log("[Orchestrator] Game orchestrator initialized");
  }

  addGame(gameId: string, game: CodenamesGameEngine): void {
    this.games.set(gameId, game);
    const state = game.getState();
    
    // Check if we need to trigger an AI move immediately
    this.checkAndTriggerAIMove(gameId);
    
    console.log(`[Orchestrator] Game ${gameId} added with ${state.players.length} players`);
  }

  removeGame(gameId: string): void {
    this.games.delete(gameId);
    console.log(`[Orchestrator] Game ${gameId} removed`);
  }

  getGame(gameId: string): CodenamesGameEngine | undefined {
    return this.games.get(gameId);
  }

  // Called after any game state change
  async handleGameStateChange(gameId: string): Promise<void> {
    const game = this.games.get(gameId);
    if (!game) return;

    const state = game.getState();
    
    // Emit the updated game state to all connected clients
    emitGameStateUpdate(gameId, state);
    
    // Check if game ended
    if (state.winner) {
      const players = state.players.map(p => ({
        name: p.name,
        team: p.team,
        role: p.role,
        type: p.type
      }));
      emitGameEnded(gameId, state.winner, players);
      
      // Clean up the game after a delay
      // setTimeout(() => {
      //   this.removeGame(gameId);
      // }, 300000); // 5 minutes
      
      return;
    }
    
    // Check if we need to trigger an AI move
    this.checkAndTriggerAIMove(gameId);
  }

  private checkAndTriggerAIMove(gameId: string): void {
    const game = this.games.get(gameId);
    if (!game) return;

    const state = game.getState();
    
    // Don't trigger AI moves if game is over
    if (state.currentPhase === "game-over" || state.winner) {
      return;
    }

    // Find the AI player who should move
    let aiToMove: Player | undefined;
    
    if (state.currentPhase === "giving-clue") {
      aiToMove = state.players.find(
        p => p.team === state.currentTeam && 
             p.role === "spymaster" && 
             p.type === "ai"
      );
    } else if (state.currentPhase === "guessing") {
      aiToMove = state.players.find(
        p => p.team === state.currentTeam && 
             p.role === "operative" && 
             p.type === "ai"
      );
    }

    if (aiToMove) {
      console.log(`[Orchestrator] Executing immediate AI move for ${aiToMove.name} (${aiToMove.team} ${aiToMove.role})`);
      
      // Execute AI move immediately
      void this.executeAIMove(gameId, aiToMove);
    }
  }

  private async executeAIMove(gameId: string, player: Player): Promise<void> {
    const game = this.games.get(gameId);
    if (!game) return;

    try {
      const state = game.getState();
      
      // Double-check the game state hasn't changed
      if (state.currentPhase === "game-over" || state.winner) {
        return;
      }
      
      // Emit AI thinking event
      emitAIThinking(gameId, player.id, player.name);
      
      const modelId = player.aiModel ?? "openai/gpt-4o-mini";
      const aiPlayer = new AIPlayer(modelId, player.withReasoning);
      
      console.log(`[Orchestrator] ${player.name} is making a move...`);

      if (player.role === "spymaster" && state.currentPhase === "giving-clue") {
        const clue = await aiPlayer.generateSpymasterClue(state, player.id);
        const result = game.giveClue(player.id, clue.word, clue.count);
        
        if (result.success) {
          console.log(`[Orchestrator] ${player.name} gave clue: "${clue.word}" - ${clue.count}`);
          emitAIMoveComplete(gameId, player.id, "clue");
          await this.handleGameStateChange(gameId);
        } else {
          console.error(`[Orchestrator] Failed to give clue: ${result.error}`);
          emitGameError(gameId, { message: result.error ?? "Failed to give clue" });
        }
      } else if (player.role === "operative" && state.currentPhase === "guessing") {
        const decision = await aiPlayer.generateOperativeGuess(state, player.id);
        
        if (decision.shouldPass) {
          const result = game.passTurn(player.id);
          if (result.success) {
            console.log(`[Orchestrator] ${player.name} passed their turn`);
            emitAIMoveComplete(gameId, player.id, "pass");
            await this.handleGameStateChange(gameId);
          } else {
            console.error(`[Orchestrator] Failed to pass turn: ${result.error}`);
            emitGameError(gameId, { message: result.error ?? "Failed to pass turn" });
          }
        } else {
          const result = game.makeGuess(player.id, decision.cardIndex);
          const card = state.cards[decision.cardIndex];
          
          if (result.success) {
            console.log(`[Orchestrator] ${player.name} guessed: "${card?.word}" (was ${card?.type})`);
            emitAIMoveComplete(gameId, player.id, "guess");
            await this.handleGameStateChange(gameId);
          } else {
            console.error(`[Orchestrator] Failed to make guess: ${result.error}`);
            emitGameError(gameId, { message: result.error ?? "Failed to make guess" });
          }
        }
      }
    } catch (error) {
      console.error(`[Orchestrator] AI move error for ${player.name}:`, error);
      emitGameError(gameId, { 
        message: `AI move failed: ${error instanceof Error ? error.message : "Unknown error"}` 
      });
    }
  }

  // Get all active games (for monitoring/admin purposes)
  getActiveGames(): Array<{ id: string; state: GameState }> {
    return Array.from(this.games.entries()).map(([id, game]) => ({
      id,
      state: game.getState()
    }));
  }
}

// Global singleton instance with lazy initialization
declare global {
  var __gameOrchestrator: GameOrchestrator | undefined;
}

export const gameOrchestrator = 
  global.__gameOrchestrator ?? 
  (global.__gameOrchestrator = new GameOrchestrator()); 