import { generateObject } from "ai";
import type {
  AIPlayer,
  Clue,
  GameAction,
  GameActionInput,
  GameState,
  Guess,
  Pass,
  Player,
} from "./types";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";
import { CodenamesGameEngine } from "./game-engine";

export class CodenamesAI {
  private player: AIPlayer;

  constructor(player: Player) {
    if (!player.aiModel) {
      throw new Error("AI Player does not have an AI model defined");
    }
    this.player = {
      ...player,
      aiModel: player.aiModel,
      withReasoning: player.withReasoning ?? false,
    };
  }

  async takeAction(
    gameState: GameState,
    gameHistory: GameAction[],
    historyToInclude = 5,
  ): Promise<GameActionInput> {
    const player = this.player;
    if (player.data.role === "spymaster") {
      return {
        playerId: player.id,
        data: await this.generateSpymasterClue(
          gameState,
          gameHistory,
          historyToInclude,
        ),
      };
    } else if (player.data.role === "operative") {
      return {
        playerId: player.id,
        data: await this.generateOperativeGuess(
          gameState,
          gameHistory,
          historyToInclude,
        ),
      };
    }
    throw new Error("Invalid player role", { cause: player });
  }

  async generateSpymasterClue(
    gameState: GameState,
    gameHistory: GameAction[],
    historyToInclude = 5,
  ): Promise<Clue> {
    const player = this.player;
    if (!player || player.data.role !== "spymaster") {
      throw new Error("Invalid spymaster player");
    }

    const myTeam = player.team;
    const myCards = gameState.cards.filter(
      (card) => !card.revealed && card.type === myTeam,
    );
    const enemyCards = gameState.cards.filter(
      (card) =>
        !card.revealed && card.type !== myTeam && card.type !== "neutral",
    );
    const neutralCards = gameState.cards.filter(
      (card) => !card.revealed && card.type === "neutral",
    );
    const assassinCard = gameState.cards.find(
      (card) => !card.revealed && card.type === "assassin",
    );

    let retries = 4;
    let lastError: Error | null = null;
    const previousClues: string[] = [];

    while (retries > 0) {
      try {
        const prompt = `You are playing Codenames as the ${myTeam} team spymaster. Your goal is to give a one-word clue that helps your operatives identify your team's cards while avoiding enemy cards, neutral cards, and especially the assassin.

    
  PREVIOUS GAME HISTORY:
  ${gameHistory
    .slice(-historyToInclude)
    .map((action) => {
      if (action.data._type === "clue") {
        const clue = action.data;
        return `- ${action.team} spymaster gave clue: "${clue.word}" - ${clue.count}`;
      } else if (action.data._type === "guess") {
        const guess = action.data;
        const card = gameState.cards[guess.cardIndex];
        return `- ${action.team} operative guessed: "${card?.word}" (was ${card?.type})`;
      }
      return `- ${action.team} ${action.data._type}`;
    })
    .join("\n")}


    GAME STATE:
    - Current turn: ${gameState.currentTeam} team (${gameState.currentTeam === myTeam ? "YOUR TURN" : "not your turn"})
    - Your team (${myTeam}) has ${gameState.currentTeam === "red" ? gameState.redAgentsRemaining : gameState.blueAgentsRemaining} agents remaining
    - Enemy team has ${gameState.currentTeam === "red" ? gameState.blueAgentsRemaining : gameState.redAgentsRemaining} agents remaining
    
    YOUR CARDS (that you want operatives to guess):
    ${myCards.map((card) => `- ${card.word}`).join("\n")}
    
    ENEMY CARDS (avoid these):
    ${enemyCards.map((card) => `- ${card.word}`).join("\n")}
    
    NEUTRAL CARDS (avoid these):
    ${neutralCards.map((card) => `- ${card.word}`).join("\n")}
    
    ASSASSIN CARD (NEVER hint at this - instant loss):
    ${assassinCard ? `- ${assassinCard.word}` : "- (already revealed)"}
    
    RULES:
    1. Give exactly ONE word as your clue
    2. Give a number indicating how many of your cards relate to this clue
    3. The clue cannot be any word currently visible on the board
    4. The clue must relate to the MEANING of words, not spelling or position
    5. Avoid clues that might accidentally point to enemy cards, neutral cards, or the assassin
    
    STRATEGY:
    - Try to find connections between 2-3 of your cards
    - Be very careful not to accidentally reference enemy cards or the assassin
    - Consider what your operatives might think when they hear your clue
    
    Respond with ONLY a JSON object in this format:
    {
      ${player.withReasoning ? `"reasoning": "think carefully before giving a clue",` : ""}
      "word": "your_clue_word",
      "count": number_of_related_cards
    }

    ${lastError ? `Your previous clue: ${previousClues.at(-1)} were invalid. Last error: ${lastError.message}` : ""}
    `;

        const { object } = await generateObject({
          model: openrouter(player.aiModel),
          prompt,
          temperature: 0.7,
          schema: z.object({
            ...(player.withReasoning ? { reasoning: z.string() } : {}),
            word: z.string(),
            count: z.number(),
          }),
        });

        const { word, count } = object;

        previousClues.push(word.toLowerCase().trim());

        console.log(
          `${player.aiModel} generated clue: ${word} - ${count} - ${player.withReasoning ? (object.reasoning as string) : ""}`,
        );

        const { valid, error } = CodenamesGameEngine.validateClue(
          gameState,
          word,
          count,
        );

        if (!valid) {
          throw new Error(error ?? "Invalid clue");
        }

        return {
          _gameType: "codenames",
          _type: "clue",
          word: word.toLowerCase().trim(),
          count,
        };
      } catch (error) {
        lastError = error as Error;
        retries--;
      }
    }

    console.log(
      `[AI] Failed to generate clue after ${historyToInclude} attempts. Error: ${lastError?.message ?? "Unknown error"}`,
    );

    const clue: Clue = {
      _gameType: "codenames",
      _type: "clue",
      word: "",
      count: 0,
    };

    return clue;
  }

  async generateOperativeGuess(
    gameState: GameState,
    gameHistory: GameAction[],
    historyToInclude = 5,
  ): Promise<Guess | Pass> {
    const player = this.player;
    if (!player || player.data.role !== "operative") {
      throw new Error("Invalid operative player");
    }

    const myTeam = player.team;
    const unrevealedCards = gameState.cards.filter((card) => !card.revealed);
    const currentClue = gameState.currentClue;

    if (!currentClue || !unrevealedCards.length) {
      return {
        _gameType: "codenames",
        _type: "pass",
      };
    }

    const prompt = `You are playing Codenames as a ${myTeam} team operative. Your spymaster just gave you a clue, and you need to decide which card to guess or whether to pass your turn.

CURRENT CLUE: "${currentClue.word}" - ${currentClue.count}
This means your spymaster thinks ${currentClue.count} cards on the board relate to "${currentClue.word}".

REMAINING GUESSES: ${gameState.remainingGuesses}

UNREVEALED CARDS:
${unrevealedCards.map((card, index) => `${index}: ${card.word}`).join("\n")}

GAME CONTEXT:
- Your team (${myTeam}) needs ${gameState.currentTeam === "red" ? gameState.redAgentsRemaining : gameState.blueAgentsRemaining} more agents
- Enemy team needs ${gameState.currentTeam === "red" ? gameState.blueAgentsRemaining : gameState.redAgentsRemaining} more agents
- There is 1 assassin card that will end the game if guessed (you lose)

PREVIOUS GAME HISTORY:
${gameHistory
  .slice(-historyToInclude)
  .map((action) => {
    if (action.data._type === "clue") {
      const clue = action.data;
      return `- ${action.team} spymaster gave clue: "${clue.word}" - ${clue.count}`;
    } else if (action.data._type === "guess") {
      const guess = action.data;
      const card = gameState.cards[guess.cardIndex];
      return `- ${action.team} operative guessed: "${card?.word}" (was ${card?.type})`;
    }
    return `- ${action.team} ${action.data._type}`;
  })
  .join("\n")}

INSTRUCTIONS:
1. Think about which cards might relate to the clue "${currentClue.word}"
2. Consider the number ${currentClue.count} - this is how many cards your spymaster thinks relate
3. Be cautious - wrong guesses help the enemy or might hit the assassin
4. If you're unsure or have used up logical guesses, you should pass

Respond with ONLY a JSON object in this format:
{
  ${player.withReasoning ? `"reasoning": "think carefully before guessing",` : ""}
  "cardIndex": number_from_list_above_or_-1_if_passing,
  "shouldPass": boolean
}`;

    try {
      const { object } = await generateObject({
        model: openrouter(player.aiModel),
        prompt,
        temperature: 0.8,
        schema: z.object({
          ...(player.withReasoning ? { reasoning: z.string() } : {}),
          cardIndex: z.number(),
          shouldPass: z.boolean(),
        }),
      });

      const { cardIndex, shouldPass } = object;

      console.log(
        `${player.aiModel} generated guess: ${shouldPass ? "pass" : unrevealedCards[cardIndex]?.word} - ${player.withReasoning ? (object.reasoning as string) : ""}`,
      );

      // Validate response
      if (shouldPass || cardIndex === -1) {
        return {
          _gameType: "codenames",
          _type: "pass",
        };
      }

      if (
        typeof cardIndex !== "number" ||
        cardIndex < 0 ||
        cardIndex >= unrevealedCards.length
      ) {
        return {
          _gameType: "codenames",
          _type: "pass",
        };
      }

      // Map back to original card index
      const originalCardIndex = gameState.cards.findIndex(
        (card) =>
          card.word === unrevealedCards[cardIndex]?.word && !card.revealed,
      );

      return {
        _gameType: "codenames",
        _type: "guess",
        cardIndex: originalCardIndex,
      };
    } catch (error) {
      console.error("AI Operative error:", error);
      // Fallback to passing
      return {
        _gameType: "codenames",
        _type: "pass",
      };
    }
  }
}
