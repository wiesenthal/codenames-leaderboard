import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { AIPlayer, AVAILABLE_MODELS } from "~/lib/ai/openrouter";
import { activeGames } from "./game";

export const aiRouter = createTRPCRouter({
  getAvailableModels: publicProcedure.query(async () => {
    return AVAILABLE_MODELS;
  }),

  triggerAIMove: publicProcedure
    .input(
      z.object({
        gameId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const game = activeGames.get(input.gameId);

      if (!game) {
        throw new Error("Game not found");
      }

      const gameState = game.getState();

      console.log(
        `[AI] Game ${input.gameId} - Current team: ${gameState.currentTeam}, Phase: ${gameState.currentPhase}`,
      );

      // Find the correct AI player for the current phase
      let aiToMove = null;
      if (gameState.currentPhase === "giving-clue") {
        aiToMove = gameState.players.find(
          (p) =>
            p.team === gameState.currentTeam &&
            p.role === "spymaster" &&
            p.type === "ai",
        );
      } else if (gameState.currentPhase === "guessing") {
        aiToMove = gameState.players.find(
          (p) =>
            p.team === gameState.currentTeam &&
            p.role === "operative" &&
            p.type === "ai",
        );
      }

      if (!aiToMove) {
        console.log(
          `[AI] No AI player to move for ${gameState.currentTeam} team in ${gameState.currentPhase} phase`,
        );
        return {
          success: false,
          message: `No AI player to move for ${gameState.currentTeam} team in ${gameState.currentPhase} phase`,
          debug: {
            currentTeam: gameState.currentTeam,
            currentPhase: gameState.currentPhase,
            players: gameState.players.map((p) => ({
              name: p.name,
              team: p.team,
              role: p.role,
              type: p.type,
            })),
          },
        };
      }

      console.log(
        `[AI] ${aiToMove.name} (${aiToMove.team} ${aiToMove.role}) is making a move...`,
      );

      // Make the AI move using the player's assigned model or default
      const modelId = aiToMove.aiModel ?? "openai/gpt-4o-mini";
      const aiPlayer = new AIPlayer(modelId, aiToMove.withReasoning);

      try {
        if (
          aiToMove.role === "spymaster" &&
          gameState.currentPhase === "giving-clue"
        ) {
          const clue = await aiPlayer.generateSpymasterClue(
            gameState,
            aiToMove.id,
          );
          const result = game.giveClue(aiToMove.id, clue.word, clue.count);

          console.log(
            `[AI] ${aiToMove.name} gave clue: "${clue.word}" - ${clue.count}`,
          );

          return {
            success: result.success,
            action: "clue",
            player: aiToMove,
            data: clue,
          };
        } else if (
          aiToMove.role === "operative" &&
          gameState.currentPhase === "guessing"
        ) {
          const decision = await aiPlayer.generateOperativeGuess(
            gameState,
            aiToMove.id,
          );

          if (decision.shouldPass) {
            const result = game.passTurn(aiToMove.id);
            console.log(`[AI] ${aiToMove.name} passed their turn`);

            return {
              success: result.success,
              action: "pass",
              player: aiToMove,
              data: {},
            };
          } else {
            const result = game.makeGuess(aiToMove.id, decision.cardIndex);
            const card = gameState.cards[decision.cardIndex];
            console.log(
              `[AI] ${aiToMove.name} guessed: "${card?.word}" (was ${card?.type})`,
            );

            return {
              success: result.success,
              action: "guess",
              player: aiToMove,
              data: {
                cardIndex: decision.cardIndex,
                cardWord: card?.word,
                cardType: card?.type,
                gameOver: result.gameOver,
              },
            };
          }
        }

        console.log(
          `[AI] Invalid game state: ${aiToMove.role} cannot act during ${gameState.currentPhase}`,
        );
        return {
          success: false,
          message: `Invalid game state: ${aiToMove.role} cannot act during ${gameState.currentPhase}`,
          debug: {
            playerRole: aiToMove.role,
            gamePhase: gameState.currentPhase,
            expectedRole:
              gameState.currentPhase === "giving-clue"
                ? "spymaster"
                : "operative",
          },
        };
      } catch (error) {
        console.error("Trigger AI move error:", error);
        return {
          success: false,
          message: `AI move failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),
});
