import {
  generateObject,
  generateText,
  Output,
  zodSchema,
  type ToolCall,
} from "ai";
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
import { normalize } from "../utils/misc";

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
    historyToInclude = 10,
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
    historyToInclude = 10,
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

    const objectSchema = player.withReasoning
      ? z.object({
          reasoning: z
            .string()
            .describe("Think carefully before giving a clue"),
          word: z.string().describe("The word you are giving as a clue"),
          count: z
            .number()
            .describe("The number of cards that relate to the clue"),
        })
      : z.object({
          word: z.string().describe("The word you are giving as a clue"),
          count: z
            .number()
            .describe("The number of cards that relate to the clue"),
        });

    while (retries > 0) {
      try {
        const prompt = `You are playing Codenames as the ${myTeam} team spymaster. Your goal is to give a one-word clue that helps your operatives identify your team's cards while avoiding enemy cards, neutral cards, and especially the assassin. Your operative does not know which cards are yours, enemies, or neutrals.

  PREVIOUS TURN HISTORY:
  ${gameHistory
    .slice(-historyToInclude)
    .map((action) => {
      if (action.data._type === "clue") {
        const clue = action.data;
        return `- ${action.team} spymaster${
          action.team === myTeam ? " (you)" : ""
        } gave clue: "${clue.word}" - ${clue.count}`;
      } else if (action.data._type === "guess") {
        const guess = action.data;
        const card = gameState.cards[guess.cardIndex];
        return `- ${action.team} operative${
          action.team === myTeam ? " (your)" : ""
        } guessed: "${card?.word}" (was ${card?.type})`;
      }
      return `- ${action.team} ${action.data._type}`;
    })
    .join("\n")}

  GAME STATE:
  - Current turn: ${gameState.currentTeam} team (${gameState.currentTeam === myTeam ? "YOUR TURN" : "not your turn"})
  - Your team (${myTeam}) has ${gameState.currentTeam === "red" ? gameState.redAgentsRemaining : gameState.blueAgentsRemaining} agents remaining
  - Enemy team has ${gameState.currentTeam === "red" ? gameState.blueAgentsRemaining : gameState.redAgentsRemaining} agents remaining
  
  YOUR CARDS - that you want operatives to guess:
  ${myCards.map((card) => `- ${card.word}`).join("\n")}
  
  NEUTRAL CARDS - AVOID these (if your operative guesses one it ends the turn):
  ${neutralCards.map((card) => `- ${card.word}`).join("\n")}

  ENEMY CARDS - AVOID these (if your operative guesses one it ends the turn AND the enemy earns the point):
  ${enemyCards.map((card) => `- ${card.word}`).join("\n")}
  
  ASSASSIN CARD - NEVER hint at this (if your operative guesses it you lose instantly):
  ${assassinCard ? `- ${assassinCard.word}` : "- (already revealed)"}
  
  RULES:
  1. Give exactly ONE word as your clue
  2. Give a number indicating how many of your cards relate to this clue
  3. The clue cannot be any word currently visible on the board
  4. The clue must relate to the MEANING of words, not spelling or position
  5. Avoid clues that might accidentally point to enemy cards, neutral cards, or the assassin
  6. The clue must be a single valid English word
  
  STRATEGY:
  - Try to find connections between 2-3 of your cards
  - Be very careful not to accidentally reference enemy cards or the assassin
  - Consider what your operatives might think when they hear your clue

    ${lastError ? `RETRY...${previousClues.length > 0 ? `Your previous clue: ${previousClues.at(-1)} were invalid. ` : ""}Error: ${lastError.message}` : ""}
`;
        console.log(
          `[AI] ${player.name} ${player.aiModel} generating spymaster clue. withReasoning: ${player.withReasoning}, providerOptions.reasoning.enabled: ${player.providerOptions?.openrouter?.reasoning?.enabled}`,
        );

        let providerReasoning: string | undefined;
        let object: z.infer<typeof objectSchema> | null;

        if (
          player.aiModel.includes("anthropic") &&
          player.providerOptions?.openrouter?.reasoning?.enabled
        ) {
          const anthropicOutputPrompt = `
        YOU MUST OUTPUT **ONLY** A JSON OBJECT IN THIS FORMAT:
        {${player.withReasoning ? `\n  "reasoning": "think carefully before giving a clue",\n` : ""}
          "word": "the word you are giving as a clue",
          "count": "the number of cards that relate to the clue"
        }`;

          // need to do hack to get anthropic reasoning to work
          let text: string;
          ({ text, reasoning: providerReasoning } = await generateText({
            model: openrouter(player.aiModel),
            system: player.systemPrompt || undefined, // eslint-disable-line @typescript-eslint/prefer-nullish-coalescing
            prompt: `${prompt}\n${anthropicOutputPrompt}`,
            providerOptions: player.providerOptions,
          }));

          providerReasoning = `${providerReasoning}\n\nTEXT OUTPUT: ${text}`;

          const generateObjectModel = "mistralai/mistral-nemo";
          const time1 = performance.now();
          ({ object } = await generateObject({
            model: openrouter(generateObjectModel),
            system:
              "You will be given raw output from a model which should contain a JSON object output. Return the JSON object as your only result.",
            prompt: text,
            schema: objectSchema,
          }));
          const time2 = performance.now();
          console.log(
            `[AI] ${player.name} ${player.aiModel} anthropic hack generateObject time: ${time2 - time1}ms, model: ${generateObjectModel}`,
          );
        } else {
          const {
            text,
            toolCalls,
            reasoning: providerReasoningA,
          } = await generateText({
            model: openrouter(player.aiModel),
            system: player.systemPrompt || undefined, // eslint-disable-line @typescript-eslint/prefer-nullish-coalescing
            prompt,
            toolChoice: "required",
            tools: {
              giveClue: {
                description: "Your action: give a clue to the operative",
                parameters: objectSchema,
              },
            },
            providerOptions: player.providerOptions,
          });

          providerReasoning = `${providerReasoningA}${text ? `\n\nTEXT OUTPUT: ${text}` : ""}`;

          if (!toolCalls[0]) {
            throw new Error("The give clue tool was not used.");
          }

          object = toolCalls[0].args;
        }

        const { word, count } = object;

        previousClues.push(word.toLowerCase().trim());

        if (providerReasoning) {
          console.log(
            `[AI] ${player.name} ${player.aiModel} Provider reasoning: ${providerReasoning}`,
          );
        }

        console.log(
          `[AI] ${player.name} ${player.aiModel} generated clue: ${word} - ${count}. ${"reasoning" in object ? `Object reasoning: ${object.reasoning as string}` : ""}`,
        );

        const additionalFields =
          "reasoning" in object
            ? { reasoning: object.reasoning as string }
            : {};

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
          providerReasoning,
          ...additionalFields,
        };
      } catch (error) {
        lastError = error as Error;
        console.error(
          `[AI] ${player.aiModel} error: ${error instanceof Error ? error.message : String(error)}`,
        );
        retries--;
      }
    }

    console.error(
      `[AI] Failed to generate clue after all attempts. Error: ${lastError?.message ?? "Unknown error"}`,
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
    historyToInclude = 10,
  ): Promise<Guess | Pass> {
    const player = this.player;
    if (!player || player.data.role !== "operative") {
      throw new Error("Invalid operative player");
    }

    const myTeam = player.team;
    const unrevealedCards = gameState.cards.filter((card) => !card.revealed);
    const currentClue = gameState.currentClue;

    const usedGuesses =
      (currentClue?.count ?? 0) + 1 - gameState.remainingGuesses;

    if (!currentClue || currentClue.word === "") {
      return {
        _gameType: "codenames",
        _type: "pass",
        reasoning: `__SYSTEM__: currentClue is null or word is empty ${JSON.stringify(
          currentClue,
        )}`,
      };
    }

    if (
      player.data.alwaysPassOnBonusGuess &&
      usedGuesses === currentClue.count
    ) {
      return {
        _gameType: "codenames",
        _type: "pass",
        reasoning: `__SYSTEM__: alwaysPassOnBonusGuess is true`,
      };
    }

    const objectSchema = player.withReasoning
      ? z.object({
          reasoning: z.string().describe("Think carefully before guessing"),
          word: z.string().describe("The word you are guessing"),
          shouldPass: z
            .boolean()
            .describe("Whether to pass your turn")
            .nullable()
            .optional(),
        })
      : z.object({
          word: z.string().describe("The word you are guessing"),
          shouldPass: z
            .boolean()
            .describe("Whether to pass your turn")
            .nullable()
            .optional(),
        });

    const prompt = `You are playing Codenames as a ${myTeam} team operative. Your spymaster just gave you a clue, and you need to decide which card to guess or whether to pass your turn.

PREVIOUS TURN HISTORY:
${gameHistory
  .slice(-historyToInclude)
  .map((action) => {
    if (action.data._type === "clue") {
      const clue = action.data;
      return `- ${action.team} spymaster${
        action.team === myTeam ? " (your team)" : ""
      } gave clue: "${clue.word}" - ${clue.count}`;
    } else if (action.data._type === "guess") {
      const guess = action.data;
      const card = gameState.cards[guess.cardIndex];
      return `- ${action.team} operative${
        action.team === myTeam ? " (you)" : ""
      } guessed: "${card?.word}" (was ${card?.type})`;
    }
    return `- ${action.team} ${action.data._type}`;
  })
  .join("\n")}

CURRENT CLUE: "${currentClue.word}" - ${currentClue.count}
This means your spymaster thinks ${currentClue.count} cards on the board relate to "${currentClue.word}".

UNREVEALED CARDS:
${unrevealedCards.map((card, index) => `${index}: ${card.word}`).join("\n")}

GAME CONTEXT:
- Your team (${myTeam}) needs ${gameState.currentTeam === "red" ? gameState.redAgentsRemaining : gameState.blueAgentsRemaining} more agents
- Enemy team needs ${gameState.currentTeam === "red" ? gameState.blueAgentsRemaining : gameState.redAgentsRemaining} more agents
- There is 1 assassin card that will end the game if guessed (you lose)

${usedGuesses ? `You already correctly identified ${usedGuesses} for this clue. ${usedGuesses === currentClue.count ? "The only reason to use your bonus guess is if you think you can identify a card from a previous hint which you didn't get earlier." : ""}` : ""}

INSTRUCTIONS:
1. Think about which cards might relate to the clue "${currentClue.word}"
2. Consider the number ${currentClue.count} - this is how many cards your spymaster thinks relate
3. Be cautious - wrong guesses help the enemy or might hit the assassin
4. If you're unsure or have used up logical guesses
   (a) How to pass: Return an empty string for the word, and set shouldPass to true
`;

    try {
      console.log(
        `[AI] ${player.name} ${player.aiModel} generating operative guess. withReasoning: ${player.withReasoning}, providerOptions.reasoning.enabled: ${player.providerOptions?.openrouter?.reasoning?.enabled}`,
      );

      let providerReasoning: string | undefined;
      let object: z.infer<typeof objectSchema> | null;

      if (
        player.aiModel.includes("anthropic") &&
        player.providerOptions?.openrouter?.reasoning?.enabled
      ) {
        const anthropicOutputPrompt = `
        YOU MUST OUTPUT **ONLY** A JSON OBJECT IN THIS FORMAT:
        {${player.withReasoning ? `\n  "reasoning": "think carefully before guessing",\n` : ""}
          "word": "the word you are guessing",
          "shouldPass": "whether to pass your turn (true/false/null)"
        }`;

        // need to do hack to get anthropic reasoning to work
        let text = "";
        ({ text, reasoning: providerReasoning } = await generateText({
          model: openrouter(player.aiModel),
          system: player.systemPrompt || undefined, // eslint-disable-line @typescript-eslint/prefer-nullish-coalescing
          prompt: `${prompt}\n${anthropicOutputPrompt}`,
          providerOptions: player.providerOptions,
        }));

        providerReasoning = `${providerReasoning}\n\nTEXT OUTPUT: ${text}`;

        const generateObjectModel = "mistralai/mistral-nemo";
        const time1 = performance.now();
        ({ object } = await generateObject({
          model: openrouter(generateObjectModel),
          system:
            "You will be given raw output from a model which should contain a JSON object output. Return the JSON object as your only result.",
          prompt: text,
          schema: objectSchema,
        }));
        const time2 = performance.now();
        console.log(
          `[AI] generateObject time: ${time2 - time1}ms, model: ${generateObjectModel}`,
        );
      } else {
        const {
          text,
          toolCalls,
          reasoning: providerReasoningA,
        } = await generateText({
          model: openrouter(player.aiModel),
          system: player.systemPrompt || undefined, // eslint-disable-line @typescript-eslint/prefer-nullish-coalescing
          prompt,
          toolChoice: "required",
          tools: {
            guess: {
              description: "Your action: guess a card or pass",
              parameters: objectSchema,
            },
          },
          providerOptions: player.providerOptions ?? undefined,
        });

        providerReasoning = `${providerReasoningA}${text ? `\n\nTEXT OUTPUT: ${text}` : ""}`;

        if (!toolCalls[0]) {
          throw new Error("The guess tool was not used.");
        }

        object = toolCalls[0].args;
      }

      const { word } = object;

      if (providerReasoning) {
        console.log(
          `[AI] ${player.name} ${player.aiModel} Provider reasoning: ${providerReasoning}`,
        );
      }

      console.log(
        `[AI] ${player.name} ${player.aiModel} generated guess: ${word}. ${"reasoning" in object ? `Object reasoning: ${object.reasoning as string}` : ""}`,
      );

      const additionalFields =
        "reasoning" in object ? { reasoning: object.reasoning as string } : {};

      // Validate response
      if (!word || word.trim() === "" || object.shouldPass) {
        return {
          _gameType: "codenames",
          _type: "pass",
          providerReasoning,
          ...additionalFields,
        };
      }

      // Map back to original card index
      const cardIndex = gameState.cards.findIndex(
        (card) => normalize(card.word) === normalize(word) && !card.revealed,
      );

      if (cardIndex === -1) {
        return {
          _gameType: "codenames",
          _type: "pass",
          providerReasoning,
          ...additionalFields,
        };
      }

      return {
        _gameType: "codenames",
        _type: "guess",
        cardIndex,
        providerReasoning,
        ...additionalFields,
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
