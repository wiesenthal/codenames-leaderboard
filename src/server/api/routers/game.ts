import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { CodenamesGameEngine } from "~/lib/codenames/game-engine";
import type { GameConfig } from "~/lib/codenames/types";
import { gameOrchestrator } from "~/server/game/game-orchestrator";

// For backwards compatibility, expose activeGames as a getter
export const activeGames = {
  get(gameId: string) {
    return gameOrchestrator.getGame(gameId);
  },
  set(gameId: string, game: CodenamesGameEngine) {
    gameOrchestrator.addGame(gameId, game);
  },
  delete(gameId: string) {
    gameOrchestrator.removeGame(gameId);
  }
};

export const gameRouter = createTRPCRouter({
  deleteGame: publicProcedure
    .input(z.object({ gameId: z.string() }))
    .mutation(async ({ input }) => {
      activeGames.delete(input.gameId);
    }),

  getGame: publicProcedure
    .input(
      z.object({
        gameId: z.string(),
        playerId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const game = activeGames.get(input.gameId);
      if (!game) {
        throw new Error("Game not found");
      }

      return game.getPublicState(input.playerId);
    }),

  giveClue: publicProcedure
    .input(
      z.object({
        gameId: z.string(),
        playerId: z.string(),
        word: z.string(),
        count: z.number().min(0).max(9),
      }),
    )
    .mutation(async ({ input }) => {
      const game = activeGames.get(input.gameId);
      if (!game) {
        throw new Error("Game not found");
      }

      const result = game.giveClue(input.playerId, input.word, input.count);

      if (!result.success) {
        throw new Error(result.error ?? "Failed to give clue");
      }

      // Notify orchestrator of state change
      await gameOrchestrator.handleGameStateChange(input.gameId);

      return { success: true };
    }),

  makeGuess: publicProcedure
    .input(
      z.object({
        gameId: z.string(),
        playerId: z.string(),
        cardIndex: z.number().min(0).max(24),
      }),
    )
    .mutation(async ({ input }) => {
      const game = activeGames.get(input.gameId);
      if (!game) {
        throw new Error("Game not found");
      }

      const result = game.makeGuess(input.playerId, input.cardIndex);

      if (!result.success) {
        throw new Error(result.error ?? "Failed to make guess");
      }

      // Notify orchestrator of state change
      await gameOrchestrator.handleGameStateChange(input.gameId);

      return { success: true, gameOver: result.gameOver };
    }),

  passTurn: publicProcedure
    .input(
      z.object({
        gameId: z.string(),
        playerId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const game = activeGames.get(input.gameId);
      if (!game) {
        throw new Error("Game not found");
      }

      const result = game.passTurn(input.playerId);

      if (!result.success) {
        throw new Error(result.error ?? "Failed to pass turn");
      }

      // Notify orchestrator of state change
      await gameOrchestrator.handleGameStateChange(input.gameId);

      return { success: true };
    }),

  listGames: publicProcedure.query(async () => {
    const activeGames = gameOrchestrator.getActiveGames();
    
    return activeGames.map(({ id, state }) => ({
      id,
      players: state.players.map((p) => ({
        name: p.name,
        team: p.team,
        role: p.role,
        type: p.type,
      })),
      currentTeam: state.currentTeam,
      currentPhase: state.currentPhase,
      winner: state.winner,
      createdAt: state.createdAt,
    }));
  }),

  // Quick start - create a game with default human players
  quickStart: publicProcedure
    .input(
      z.object({
        playerNames: z.array(z.string()).length(4),
      }),
    )
    .mutation(async ({ input }) => {
      const words = CodenamesGameEngine.loadWords();
      const config: GameConfig = {
        words,
        players: [
          {
            name: input.playerNames[0]!,
            type: "human",
            team: "red",
            role: "spymaster",
          },
          {
            name: input.playerNames[1]!,
            type: "human",
            team: "red",
            role: "operative",
          },
          {
            name: input.playerNames[2]!,
            type: "human",
            team: "blue",
            role: "spymaster",
          },
          {
            name: input.playerNames[3]!,
            type: "human",
            team: "blue",
            role: "operative",
          },
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
    .input(
      z.object({
        humanPlayer: z.object({
          name: z.string(),
          team: z.enum(["red", "blue"]),
          role: z.enum(["spymaster", "operative"]),
        }),
        aiModels: z.object({
          redSpymaster: z.string().optional(),
          redOperative: z.string().optional(),
          blueSpymaster: z.string().optional(),
          blueOperative: z.string().optional(),
        }),
        aiWithReasoning: z.object({
          redSpymaster: z.boolean(),
          redOperative: z.boolean(),
          blueSpymaster: z.boolean(),
          blueOperative: z.boolean(),
        }),
      }),
    )
    .mutation(async ({ input }) => {
      const words = CodenamesGameEngine.loadWords();

      const players = [
        {
          name:
            input.humanPlayer.team === "red" &&
            input.humanPlayer.role === "spymaster"
              ? input.humanPlayer.name
              : "AI Red Spymaster",
          type:
            input.humanPlayer.team === "red" &&
            input.humanPlayer.role === "spymaster"
              ? ("human" as const)
              : ("ai" as const),
          team: "red" as const,
          role: "spymaster" as const,
          aiModel: input.aiModels.redSpymaster,
        },
        {
          name:
            input.humanPlayer.team === "red" &&
            input.humanPlayer.role === "operative"
              ? input.humanPlayer.name
              : "AI Red Operative",
          type:
            input.humanPlayer.team === "red" &&
            input.humanPlayer.role === "operative"
              ? ("human" as const)
              : ("ai" as const),
          team: "red" as const,
          role: "operative" as const,
          aiModel: input.aiModels.redOperative,
        },
        {
          name:
            input.humanPlayer.team === "blue" &&
            input.humanPlayer.role === "spymaster"
              ? input.humanPlayer.name
              : "AI Blue Spymaster",
          type:
            input.humanPlayer.team === "blue" &&
            input.humanPlayer.role === "spymaster"
              ? ("human" as const)
              : ("ai" as const),
          team: "blue" as const,
          role: "spymaster" as const,
          aiModel: input.aiModels.blueSpymaster,
        },
        {
          name:
            input.humanPlayer.team === "blue" &&
            input.humanPlayer.role === "operative"
              ? input.humanPlayer.name
              : "AI Blue Operative",
          type:
            input.humanPlayer.team === "blue" &&
            input.humanPlayer.role === "operative"
              ? ("human" as const)
              : ("ai" as const),
          team: "blue" as const,
          role: "operative" as const,
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
        humanPlayerId: gameState.players.find((p) => p.type === "human")?.id,
      };
    }),

  // Create AI vs AI game for testing/tournaments
  createGame: publicProcedure
    .input(
      z.object({
        redTeamSpymaster: z.object({
          aiModel: z.string().optional(),
          withReasoning: z.boolean().optional(),
        }),
        redTeamOperative: z.object({
          aiModel: z.string().optional(),
          withReasoning: z.boolean().optional(),
        }),
        blueTeamSpymaster: z.object({
          aiModel: z.string().optional(),
          withReasoning: z.boolean().optional(),
        }),
        blueTeamOperative: z.object({
          aiModel: z.string().optional(),
          withReasoning: z.boolean().optional(),
        }),
      }),
    )
    .mutation(
      async ({
        input: {
          redTeamSpymaster,
          redTeamOperative,
          blueTeamSpymaster,
          blueTeamOperative,
        },
      }) => {
        const words = CodenamesGameEngine.loadWords();
        const config: GameConfig = {
          words,
          players: [
            {
              name: "AI Red Spymaster",
              type: redTeamSpymaster.aiModel === "human" ? "human" : "ai",
              team: "red",
              role: "spymaster",
              aiModel: redTeamSpymaster.aiModel,
              withReasoning: redTeamSpymaster.withReasoning,
            },
            {
              name: "AI Red Operative",
              type: redTeamOperative.aiModel === "human" ? "human" : "ai",
              team: "red",
              role: "operative",
              aiModel: redTeamOperative.aiModel,
              withReasoning: redTeamOperative.withReasoning,
            },
            {
              name: "AI Blue Spymaster",
              type: blueTeamSpymaster.aiModel === "human" ? "human" : "ai",
              team: "blue",
              role: "spymaster",
              aiModel: blueTeamSpymaster.aiModel,
              withReasoning: blueTeamSpymaster.withReasoning,
            },
            {
              name: "AI Blue Operative",
              type: blueTeamOperative.aiModel === "human" ? "human" : "ai",
              team: "blue",
              role: "operative",
              aiModel: blueTeamOperative.aiModel,
              withReasoning: blueTeamOperative.withReasoning,
            },
          ],
        };

        const game = new CodenamesGameEngine(config);
        const gameState = game.getState();

        activeGames.set(gameState.id, game);

        return {
          gameId: gameState.id,
          players: gameState.players,
        };
      },
    ),
});
