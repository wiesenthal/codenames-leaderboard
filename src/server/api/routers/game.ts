import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { CodenamesGameEngine } from "~/lib/codenames/game-engine";
import { GameActionInputSchema, type GameConfig } from "~/lib/codenames/types";
import { GameOrchestrator } from "~/server/game/game-orchestrator";
import { db } from "~/server/db";
import { games } from "~/server/db/schema";
import { and, eq } from "drizzle-orm";

export const gameRouter = createTRPCRouter({
  deleteGame: publicProcedure
    .input(z.object({ gameId: z.string() }))
    .mutation(async ({ input }) => {
      await db
        .update(games)
        .set({ archived: true })
        .where(eq(games.id, input.gameId));
    }),

  listGames: publicProcedure
    .input(
      z.object({
        limit: z.number().optional().default(100),
        includeArchived: z.boolean().optional().default(false),
      }),
    )
    .query(async ({ input }) => {
      try {
        const archivedFilter = input.includeArchived
          ? []
          : [eq(games.archived, false)];

        return await db.query.games.findMany({
          where: and(...archivedFilter),
          limit: input.limit,
          with: {
            players: true,
            gameHistory: true,
          },
          orderBy: ({ startedAt }, { desc }) => [desc(startedAt)],
        });
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
      await gameEngine.loadFromDb();

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
            systemPrompt: z.string().optional(),
            alwaysPassOnBonusGuess: z.boolean().optional(),
          }),
          redTeamOperative: z.object({
            aiModel: z.string().optional(),
            withReasoning: z.boolean().optional(),
            systemPrompt: z.string().optional(),
            alwaysPassOnBonusGuess: z.boolean().optional(),
          }),
          blueTeamSpymaster: z.object({
            aiModel: z.string().optional(),
            withReasoning: z.boolean().optional(),
            systemPrompt: z.string().optional(),
            alwaysPassOnBonusGuess: z.boolean().optional(),
          }),
          blueTeamOperative: z.object({
            aiModel: z.string().optional(),
            withReasoning: z.boolean().optional(),
            systemPrompt: z.string().optional(),
            alwaysPassOnBonusGuess: z.boolean().optional(),
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
                alwaysPassOnBonusGuess: redTeamSpymaster.alwaysPassOnBonusGuess,
              },
              aiModel: redTeamSpymaster.aiModel ?? null,
              withReasoning: redTeamSpymaster.withReasoning ?? false,
              systemPrompt: redTeamSpymaster.systemPrompt ?? null,
            },
            {
              name: "AI Red Operative",
              type: redTeamOperative.aiModel === "human" ? "human" : "ai",
              team: "red",
              data: {
                _gameType: "codenames",
                role: "operative",
                alwaysPassOnBonusGuess: redTeamOperative.alwaysPassOnBonusGuess,
              },
              aiModel: redTeamOperative.aiModel ?? null,
              withReasoning: redTeamOperative.withReasoning ?? false,
              systemPrompt: redTeamOperative.systemPrompt ?? null,
            },
            {
              name: "AI Blue Spymaster",
              type: blueTeamSpymaster.aiModel === "human" ? "human" : "ai",
              team: "blue",
              data: {
                _gameType: "codenames",
                role: "spymaster",
                alwaysPassOnBonusGuess: blueTeamSpymaster.alwaysPassOnBonusGuess,
              },
              aiModel: blueTeamSpymaster.aiModel ?? null,
              withReasoning: blueTeamSpymaster.withReasoning ?? false,
              systemPrompt: blueTeamSpymaster.systemPrompt ?? null,
            },
            {
              name: "AI Blue Operative",
              type: blueTeamOperative.aiModel === "human" ? "human" : "ai",
              team: "blue",
              data: {
                _gameType: "codenames",
                role: "operative",
                alwaysPassOnBonusGuess: blueTeamOperative.alwaysPassOnBonusGuess,
              },
              aiModel: blueTeamOperative.aiModel ?? null,
              withReasoning: blueTeamOperative.withReasoning ?? false,
              systemPrompt: blueTeamOperative.systemPrompt ?? null,
            },
          ],
        };

        const gameEngine = await GameOrchestrator.createGame(config);

        return gameEngine;
      },
    ),
});
