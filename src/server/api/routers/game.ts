import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { CodenamesGameEngine } from "~/lib/codenames/game-engine";
import { GameActionInputSchema, type GameConfig } from "~/lib/codenames/types";
import { GameOrchestrator } from "~/server/game/game-orchestrator";
import { db } from "~/server/db";
import { games } from "~/server/db/schema";
import { eq } from "drizzle-orm";

export const gameRouter = createTRPCRouter({
  deleteGame: publicProcedure
    .input(z.object({ gameId: z.string() }))
    .mutation(async ({ input }) => {
      await db
        .update(games)
        .set({ archived: true })
        .where(eq(games.id, input.gameId));
    }),

  listGames: publicProcedure.query(async () => {
    try {
      const activeGames = await GameOrchestrator.getActiveGames();

      return activeGames;
    } catch (error) {
      console.error(error);
      return [];
    }
  }),

  getGame: publicProcedure
    .input(z.object({ gameId: z.string() }))
    .query(async ({ input }) => {
      return await GameOrchestrator.getGame(input.gameId);
    }),

  checkIfAIMoveIsNeeded: publicProcedure.query(async () => {
    await GameOrchestrator.checkIfAIMoveIsNeeded();
    return true;
  }),

  takeAction: publicProcedure
    .input(z.object({ gameId: z.string(), action: GameActionInputSchema }))
    .mutation(async ({ input }) => {
      const gameEngine = await GameOrchestrator.getGameEngine(input.gameId);

      // check that the client is the current player
      const currentPlayer = await gameEngine.getCurrentPlayer();
      if (currentPlayer?.id !== input.action.playerId) {
        console.error(
          `socket-server.ts [Socket] Client ${input.action.playerId} is not the current player`,
        );
        return { success: false, error: "Not the current player" };
      }

      const result = await gameEngine.takeAction(input.action);
      if (!result.success) {
        console.error(`[Socket] Failed to take action: ${result.error}`);
      }
      return result;
    }),

  // Create AI vs AI game for testing/tournaments
  createGame: publicProcedure
    .input(
      z.object({
        label: z.string().optional(),
        players: z.object({
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
      }),
    )
    .mutation(
      async ({
        input: {
          label,
          players: {
            redTeamSpymaster,
            redTeamOperative,
            blueTeamSpymaster,
            blueTeamOperative,
          },
        },
      }) => {
        const words = CodenamesGameEngine.loadWords();
        const config: GameConfig = {
          label,
          words,
          players: [
            {
              name: "AI Red Spymaster",
              type: redTeamSpymaster.aiModel === "human" ? "human" : "ai",
              team: "red",
              data: {
                _gameType: "codenames",
                role: "spymaster",
              },
              aiModel: redTeamSpymaster.aiModel ?? null,
              withReasoning: redTeamSpymaster.withReasoning ?? false,
            },
            {
              name: "AI Red Operative",
              type: redTeamOperative.aiModel === "human" ? "human" : "ai",
              team: "red",
              data: {
                _gameType: "codenames",
                role: "operative",
              },
              aiModel: redTeamOperative.aiModel ?? null,
              withReasoning: redTeamOperative.withReasoning ?? false,
            },
            {
              name: "AI Blue Spymaster",
              type: blueTeamSpymaster.aiModel === "human" ? "human" : "ai",
              team: "blue",
              data: {
                _gameType: "codenames",
                role: "spymaster",
              },
              aiModel: blueTeamSpymaster.aiModel ?? null,
              withReasoning: blueTeamSpymaster.withReasoning ?? false,
            },
            {
              name: "AI Blue Operative",
              type: blueTeamOperative.aiModel === "human" ? "human" : "ai",
              team: "blue",
              data: {
                _gameType: "codenames",
                role: "operative",
              },
              aiModel: blueTeamOperative.aiModel ?? null,
              withReasoning: blueTeamOperative.withReasoning ?? false,
            },
          ],
        };

        const gameEngine = await GameOrchestrator.createGame(config);

        return gameEngine;
      },
    ),
});
