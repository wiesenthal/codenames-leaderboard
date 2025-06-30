import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { CodenamesGameEngine } from "~/lib/codenames/game-engine";
import type { GameConfig } from "~/lib/codenames/types";

// In-memory game storage (replace with database later)
export const activeGames = new Map<string, CodenamesGameEngine>();

export const gameRouter = createTRPCRouter({
  createGame: publicProcedure
    .input(z.object({
      players: z.array(z.object({
        name: z.string(),
        type: z.enum(['human', 'ai']),
        team: z.enum(['red', 'blue']),
        role: z.enum(['spymaster', 'operative']),
        aiModel: z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const words = CodenamesGameEngine.loadWords();
      const config: GameConfig = {
        words,
        players: input.players,
      };
      
      const game = new CodenamesGameEngine(config);
      const gameState = game.getState();
      
      activeGames.set(gameState.id, game);
      
      return {
        gameId: gameState.id,
        players: gameState.players,
      };
    }),

  getGame: publicProcedure
    .input(z.object({
      gameId: z.string(),
      playerId: z.string(),
    }))
    .query(async ({ input }) => {
      const game = activeGames.get(input.gameId);
      if (!game) {
        throw new Error('Game not found');
      }
      
      return game.getPublicState(input.playerId);
    }),

  giveClue: publicProcedure
    .input(z.object({
      gameId: z.string(),
      playerId: z.string(),
      word: z.string(),
      count: z.number().min(0).max(9),
    }))
    .mutation(async ({ input }) => {
      const game = activeGames.get(input.gameId);
      if (!game) {
        throw new Error('Game not found');
      }
      
      const result = game.giveClue(input.playerId, input.word, input.count);
      
      if (!result.success) {
        throw new Error(result.error ?? 'Failed to give clue');
      }
      
      return { success: true };
    }),

  makeGuess: publicProcedure
    .input(z.object({
      gameId: z.string(),
      playerId: z.string(),
      cardIndex: z.number().min(0).max(24),
    }))
    .mutation(async ({ input }) => {
      const game = activeGames.get(input.gameId);
      if (!game) {
        throw new Error('Game not found');
      }
      
      const result = game.makeGuess(input.playerId, input.cardIndex);
      
      if (!result.success) {
        throw new Error(result.error ?? 'Failed to make guess');
      }
      
      return { success: true, gameOver: result.gameOver };
    }),

  passTurn: publicProcedure
    .input(z.object({
      gameId: z.string(),
      playerId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const game = activeGames.get(input.gameId);
      if (!game) {
        throw new Error('Game not found');
      }
      
      const result = game.passTurn(input.playerId);
      
      if (!result.success) {
        throw new Error(result.error ?? 'Failed to pass turn');
      }
      
      return { success: true };
    }),

  listGames: publicProcedure
    .query(async () => {
      const games = Array.from(activeGames.entries()).map(([id, game]) => {
        const state = game.getState();
        return {
          id,
          players: state.players.map(p => ({ 
            name: p.name, 
            team: p.team, 
            role: p.role, 
            type: p.type 
          })),
          currentTeam: state.currentTeam,
          currentPhase: state.currentPhase,
          winner: state.winner,
          createdAt: state.createdAt,
        };
      });
      
      return games;
    }),

  // Quick start - create a game with default human players
  quickStart: publicProcedure
    .input(z.object({
      playerNames: z.array(z.string()).length(4),
    }))
    .mutation(async ({ input }) => {
      const words = CodenamesGameEngine.loadWords();
      const config: GameConfig = {
        words,
        players: [
          { name: input.playerNames[0]!, type: 'human', team: 'red', role: 'spymaster' },
          { name: input.playerNames[1]!, type: 'human', team: 'red', role: 'operative' },
          { name: input.playerNames[2]!, type: 'human', team: 'blue', role: 'spymaster' },
          { name: input.playerNames[3]!, type: 'human', team: 'blue', role: 'operative' },
        ],
      };
      
      const game = new CodenamesGameEngine(config);
      const gameState = game.getState();
      
      activeGames.set(gameState.id, game);
      
      return {
        gameId: gameState.id,
        players: gameState.players,
      };
    }),

  // Create a game with AI vs Human
  createAIGame: publicProcedure
    .input(z.object({
      humanPlayer: z.object({
        name: z.string(),
        team: z.enum(['red', 'blue']),
        role: z.enum(['spymaster', 'operative']),
      }),
      aiModels: z.object({
        redSpymaster: z.string().optional(),
        redOperative: z.string().optional(),
        blueSpymaster: z.string().optional(),
        blueOperative: z.string().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      const words = CodenamesGameEngine.loadWords();
      
      const players = [
        {
          name: input.humanPlayer.team === 'red' && input.humanPlayer.role === 'spymaster' 
            ? input.humanPlayer.name : 'AI Red Spymaster',
          type: input.humanPlayer.team === 'red' && input.humanPlayer.role === 'spymaster' 
            ? 'human' as const : 'ai' as const,
          team: 'red' as const,
          role: 'spymaster' as const,
          aiModel: input.aiModels.redSpymaster,
        },
        {
          name: input.humanPlayer.team === 'red' && input.humanPlayer.role === 'operative' 
            ? input.humanPlayer.name : 'AI Red Operative',
          type: input.humanPlayer.team === 'red' && input.humanPlayer.role === 'operative' 
            ? 'human' as const : 'ai' as const,
          team: 'red' as const,
          role: 'operative' as const,
          aiModel: input.aiModels.redOperative,
        },
        {
          name: input.humanPlayer.team === 'blue' && input.humanPlayer.role === 'spymaster' 
            ? input.humanPlayer.name : 'AI Blue Spymaster',
          type: input.humanPlayer.team === 'blue' && input.humanPlayer.role === 'spymaster' 
            ? 'human' as const : 'ai' as const,
          team: 'blue' as const,
          role: 'spymaster' as const,
          aiModel: input.aiModels.blueSpymaster,
        },
        {
          name: input.humanPlayer.team === 'blue' && input.humanPlayer.role === 'operative' 
            ? input.humanPlayer.name : 'AI Blue Operative',
          type: input.humanPlayer.team === 'blue' && input.humanPlayer.role === 'operative' 
            ? 'human' as const : 'ai' as const,
          team: 'blue' as const,
          role: 'operative' as const,
          aiModel: input.aiModels.blueOperative,
        },
      ];

      const config: GameConfig = {
        words,
        players,
      };
      
      const game = new CodenamesGameEngine(config);
      const gameState = game.getState();
      
      activeGames.set(gameState.id, game);
      
      return {
        gameId: gameState.id,
        players: gameState.players,
        humanPlayerId: gameState.players.find(p => p.type === 'human')?.id,
      };
    }),

  // Create AI vs AI game for testing/tournaments
  createAIvsAIGame: publicProcedure
    .input(z.object({
      redTeamModels: z.object({
        spymaster: z.string(),
        operative: z.string(),
      }),
      blueTeamModels: z.object({
        spymaster: z.string(),
        operative: z.string(),
      }),
    }))
    .mutation(async ({ input }) => {
      const words = CodenamesGameEngine.loadWords();
      const config: GameConfig = {
        words,
        players: [
          { name: 'AI Red Spymaster', type: 'ai', team: 'red', role: 'spymaster', aiModel: input.redTeamModels.spymaster },
          { name: 'AI Red Operative', type: 'ai', team: 'red', role: 'operative', aiModel: input.redTeamModels.operative },
          { name: 'AI Blue Spymaster', type: 'ai', team: 'blue', role: 'spymaster', aiModel: input.blueTeamModels.spymaster },
          { name: 'AI Blue Operative', type: 'ai', team: 'blue', role: 'operative', aiModel: input.blueTeamModels.operative },
        ],
      };
      
      const game = new CodenamesGameEngine(config);
      const gameState = game.getState();
      
      activeGames.set(gameState.id, game);
      
      return {
        gameId: gameState.id,
        players: gameState.players,
      };
    }),
}); 