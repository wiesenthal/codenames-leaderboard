import { eq } from "drizzle-orm";
import type {
  GameState,
  GameConfig,
  Card,
  CardType,
  Team,
  Clue,
  Guess,
  GameAction,
  Player,
  Game,
  GameActionInput,
} from "./types";
import { readFileSync } from "fs";
import path from "path";
import { db, type Transaction } from "../../server/db";
import {
  gameActions,
  gameEvents,
  games,
  players,
} from "../../server/db/schema";
import wordExists from "word-exists";
import { GameOrchestrator } from "../../server/game/game-orchestrator";

const _gameType = "codenames";

export type InitializedCodenamesGameEngine = CodenamesGameEngine & {
  isInitialized: true;
};

export class CodenamesGameEngine {
  public gameId: string;
  public players: Player[]; // Store players because assume they won't change after initialization
  public isInitialized: boolean;

  constructor({ gameId }: { gameId: string }) {
    this.gameId = gameId;
    this.isInitialized = false;
    this.players = [];
  }

  private ensureInitialized(): this is InitializedCodenamesGameEngine {
    if (!this.isInitialized) throw new Error("Game not initialized");
    return true;
  }

  public static async init(
    config: GameConfig,
  ): Promise<InitializedCodenamesGameEngine> {
    return await db.transaction(async (trx) => {
      const gameState = CodenamesGameEngine.initializeGameState(config);
      const [game] = await trx
        .insert(games)
        .values({
          status: "active",
          label: config.label,
          gameState,
        })
        .returning();

      if (!game) throw new Error("Failed to initialize game, no game returned");

      const dbPlayers = await trx
        .insert(players)
        .values(
          config.players.map((p) => ({
            ...p,
            gameId: game.id,
          })),
        )
        .returning();

      const gameEngine = new CodenamesGameEngine({ gameId: game.id });
      gameEngine.isInitialized = true;
      gameEngine.players = dbPlayers;

      return gameEngine as InitializedCodenamesGameEngine;
    });
  }

  public static async initLoad(
    gameId: string,
  ): Promise<InitializedCodenamesGameEngine> {
    const gameEngine = new CodenamesGameEngine({ gameId });
    await gameEngine.loadFromDb();
    return gameEngine as InitializedCodenamesGameEngine;
  }

  public async loadFromDb(): Promise<Game> {
    const game = await db.query.games.findFirst({
      where: eq(games.id, this.gameId),
      with: {
        players: true,
        gameHistory: true,
      },
    });
    if (!game) throw new Error("Game not found");
    this.isInitialized = true;
    this.players = game.players;
    return game;
  }

  private static initializeGameState(config: GameConfig): GameState {
    // Select 25 random words
    const shuffledWords = [...config.words].sort(() => Math.random() - 0.5);
    const gameWords = shuffledWords.slice(0, 25);

    // Generate the key card - determine team assignments
    const startingTeam: Team = Math.random() < 0.5 ? "red" : "blue";
    const { cards, redCount, blueCount } = this.generateKeyCard(
      gameWords,
      startingTeam,
    );

    const gameState: GameState = {
      _gameType,
      cards,
      currentTeam: startingTeam,
      currentPhase: "giving-clue",
      currentClue: null,
      remainingGuesses: 0,
      winner: null,
      startingTeam,
      redAgentsRemaining: redCount,
      blueAgentsRemaining: blueCount,
    };

    return gameState;
  }

  private static generateKeyCard(
    words: string[],
    startingTeam: Team,
  ): { cards: Card[]; redCount: number; blueCount: number } {
    const cards: Card[] = [];
    const positions = Array.from({ length: 25 }, (_, i) => i);

    // Shuffle positions
    positions.sort(() => Math.random() - 0.5);

    // Starting team gets 9 agents, other team gets 8
    const redCount = startingTeam === "red" ? 9 : 8;
    const blueCount = startingTeam === "blue" ? 9 : 8;

    // Assign card types
    const cardTypes: CardType[] = [
      ...(Array(redCount).fill("red") as CardType[]),
      ...(Array(blueCount).fill("blue") as CardType[]),
      ...(Array(7).fill("neutral") as CardType[]), // 7 neutral cards
      "assassin" as CardType, // 1 assassin
    ];

    // Shuffle card types
    cardTypes.sort(() => Math.random() - 0.5);

    // Create cards
    for (let i = 0; i < 25; i++) {
      cards.push({
        word: words[i]!,
        type: cardTypes[i]!,
        revealed: false,
        position: i,
      });
    }

    return { cards, redCount, blueCount };
  }

  public async getState(trx?: Transaction): Promise<GameState | null> {
    this.ensureInitialized();
    const [game] = await (trx ?? db)
      .select()
      .from(games)
      .where(eq(games.id, this.gameId));
    if (!game) return null;
    return game.gameState;
  }

  public getPlayer(playerId: string): Player | null {
    this.ensureInitialized();
    return this.players.find((p) => p.id === playerId) ?? null;
  }

  public async getPublicState(playerId: string): Promise<GameState | null> {
    this.ensureInitialized();

    const state = await this.getState();
    if (!state) return null;

    const player = this.getPlayer(playerId);
    const isSpymaster = player?.data?.role === "spymaster";

    return {
      ...state,
      cards: state.cards.map((card) => ({
        ...card,
        // Only spymasters can see unrevealed card types
        type:
          card.revealed || isSpymaster ? card.type : ("neutral" as CardType),
      })),
    };
  }

  public async getCurrentPlayer(): Promise<Player | null> {
    this.ensureInitialized();
    const state = await this.getState();
    if (!state) return null;
    const currentTeam = state.currentTeam;
    const currentPhase = state.currentPhase;

    if (currentPhase === "giving-clue")
      return (
        this.players.find(
          (p) => p.team === currentTeam && p.data.role === "spymaster",
        ) ?? null
      );
    if (currentPhase === "guessing")
      return (
        this.players.find(
          (p) => p.team === currentTeam && p.data.role === "operative",
        ) ?? null
      );

    return null;
  }

  public async takeAction(
    action: GameActionInput,
  ): Promise<{ success: boolean; error?: string; gameState?: GameState }> {
    this.ensureInitialized();

    const type = action.data._type;
    let result: { success: boolean; error?: string; gameState?: GameState } = {
      success: false,
    };
    if (type === "clue") {
      result = await this.giveClue(
        action.playerId,
        action.data.word,
        action.data.count,
      );
    } else if (type === "guess") {
      result = await this.makeGuess(action.playerId, action.data.cardIndex);
    } else if (type === "pass") {
      result = await this.passTurn(action.playerId);
    }

    if (result.gameState)
      await GameOrchestrator.handleGameStateChange(
        this.gameId,
        result.gameState,
      );
    else {
      console.log(
        `[GameEngine] No game state returned for action ${type} by player ${action.playerId}`,
      );
    }

    return result;
  }

  public async giveClue(
    playerId: string,
    word: string,
    count: number,
  ): Promise<{ success: boolean; error?: string }> {
    this.ensureInitialized();

    const player = this.getPlayer(playerId);
    return await db.transaction(async (trx) => {
      const state = await this.getState(trx);

      if (!player) {
        return { success: false, error: "Player not found" };
      }

      if (player.data.role !== "spymaster") {
        return {
          success: false,
          error: "Only spymasters can give clues",
        };
      }

      if (player.team !== state?.currentTeam) {
        return { success: false, error: "Not your turn" };
      }

      if (state?.currentPhase !== "giving-clue") {
        return {
          success: false,
          error: "Not in clue-giving phase",
        };
      }

      const clueValidation = CodenamesGameEngine.validateClue(
        state,
        word,
        count,
      );
      if (!clueValidation.valid) {
        return { success: false, error: clueValidation.error };
      }

      const clue: Clue = {
        _gameType,
        _type: "clue",
        word: word.toLowerCase(),
        count,
      };

      const [gameAction] = await trx
        .insert(gameActions)
        .values({
          gameId: this.gameId,
          playerId,
          team: player.team,
          data: clue,
        })
        .returning();

      const actionId = gameAction?.id;

      if (clue.word === "" && count === 0) {
        await trx.insert(gameEvents).values({
          gameId: this.gameId,
          team: player.team,
          playerId,
          actionId,
          gameState: state,
          data: {
            _gameType: "codenames",
            _type: "spymaster_failed",
            clue,
          },
        });
      }

      const updatedState: GameState = {
        ...state,
        currentClue: clue,
        currentPhase: "guessing",
        remainingGuesses: count + 1,
      };

      // update game state
      await db
        .update(games)
        .set({
          gameState: updatedState,
        })
        .where(eq(games.id, this.gameId));

      return {
        success: true,
        gameState: updatedState,
      };
    });
  }

  public async makeGuess(
    playerId: string,
    cardIndex: number,
  ): Promise<{ success: boolean; error?: string; gameState?: GameState }> {
    this.ensureInitialized();

    const player = this.getPlayer(playerId);

    return await db.transaction(
      async (
        trx,
      ): Promise<{
        success: boolean;
        error?: string;
        gameState?: GameState;
      }> => {
        const state = await this.getState(trx);

        if (!player) {
          return { success: false, error: "Player not found" };
        }

        if (player.data.role !== "operative") {
          return { success: false, error: "Only operatives can make guesses" };
        }

        if (player.team !== state?.currentTeam) {
          return { success: false, error: "Not your turn" };
        }

        if (state?.currentPhase !== "guessing") {
          return { success: false, error: "Not in guessing phase" };
        }

        if (cardIndex < 0 || cardIndex >= 25) {
          return { success: false, error: "Invalid card index" };
        }

        const card = state?.cards[cardIndex];
        if (!card) {
          return { success: false, error: "Card not found" };
        }
        if (card.revealed) {
          return { success: false, error: "Card already revealed" };
        }

        // Reveal the card
        card.revealed = true;

        const guess: Guess = {
          _gameType,
          _type: "guess",
          cardIndex,
        };

        const action: GameAction = {
          timestamp: new Date(),
          playerId,
          gameId: this.gameId,
          team: player.team,
          data: guess,
        };

        const [gameAction] = await trx
          .insert(gameActions)
          .values(action)
          .returning();

        const actionId = gameAction?.id;

        // Check what type of card was revealed
        const guessingTeam = player.team;

        if (card.type === "assassin") {
          // Game over - guessing team loses
          state.winner = guessingTeam === "red" ? "blue" : "red";
          state.currentPhase = "game-over";
          await trx.insert(gameEvents).values({
            gameId: this.gameId,
            team: player.team,
            playerId,
            actionId,
            gameState: state,
            data: {
              _gameType: "codenames",
              _type: "guessing_round_ended",
              reason: "guessed_assassin",
              clue: state.currentClue,
            },
          });
        } else if (card.type === "neutral") {
          // Neutral card - end turn
          CodenamesGameEngine.endTurn(state);
          await trx.insert(gameEvents).values({
            gameId: this.gameId,
            team: player.team,
            playerId,
            gameState: state,
            actionId,
            data: {
              _gameType: "codenames",
              _type: "guessing_round_ended",
              reason: "guessed_neutral",
              clue: state.currentClue,
            },
          });
        } else if (card.type === guessingTeam) {
          // Correct guess - update remaining agents and continue guessing
          if (guessingTeam === "red") {
            state.redAgentsRemaining--;
          } else {
            state.blueAgentsRemaining--;
          }

          // Check for win condition
          if (state.redAgentsRemaining === 0) {
            state.winner = "red";
            state.currentPhase = "game-over";
            await trx.insert(gameEvents).values({
              gameId: this.gameId,
              team: player.team,
              playerId,
              actionId,
              gameState: state,
              data: {
                _gameType: "codenames",
                _type: "guessing_round_ended",
                reason: "victory",
                clue: state.currentClue,
              },
            });
          }

          if (state.blueAgentsRemaining === 0) {
            state.winner = "blue";
            state.currentPhase = "game-over";
            await trx.insert(gameEvents).values({
              gameId: this.gameId,
              team: player.team,
              playerId,
              actionId,
              gameState: state,
              data: {
                _gameType: "codenames",
                _type: "guessing_round_ended",
                reason: "victory",
                clue: state.currentClue,
              },
            });
          }

          // Continue guessing
          state.remainingGuesses--;
          if (state.remainingGuesses <= 0) {
            CodenamesGameEngine.endTurn(state);
            await trx.insert(gameEvents).values({
              gameId: this.gameId,
              team: player.team,
              playerId,
              actionId,
              gameState: state,
              data: {
                _gameType: "codenames",
                _type: "guessing_round_ended",
                reason: "ran_out_of_guesses",
                clue: state.currentClue,
              },
            });
          }
        }
        // Enemy agent
        else {
          // Enemy agent - update their count
          if (card.type === "red") {
            state.redAgentsRemaining--;
          } else if (card.type === "blue") {
            state.blueAgentsRemaining--;
          }

          // Check for win condition - these should never
          if (state.redAgentsRemaining === 0) {
            state.winner = "red";
            state.currentPhase = "game-over";
          }

          if (state.blueAgentsRemaining === 0) {
            state.winner = "blue";
            state.currentPhase = "game-over";
          }

          // end turn
          CodenamesGameEngine.endTurn(state);
          await trx.insert(gameEvents).values({
            gameId: this.gameId,
            team: player.team,
            playerId,
            actionId,
            gameState: state,
            data: {
              _gameType: "codenames",
              _type: "guessing_round_ended",
              reason: "guessed_enemy",
              clue: state.currentClue,
            },
          });
        }

        await trx
          .update(games)
          .set({
            gameState: state,
          })
          .where(eq(games.id, this.gameId));

        return {
          success: true,
          gameState: state,
        };
      },
    );
  }

  public async passTurn(
    playerId: string,
  ): Promise<{ success: boolean; error?: string; gameState?: GameState }> {
    this.ensureInitialized();

    const player = this.getPlayer(playerId);
    return await db.transaction(async (trx) => {
      const state = await this.getState(trx);

      if (!player) {
        return { success: false, error: "Player not found" };
      }

      if (player.team !== state?.currentTeam) {
        return { success: false, error: "Not your turn" };
      }

      if (state?.currentPhase !== "guessing") {
        return { success: false, error: "Can only pass during guessing phase" };
      }

      const action: GameAction = {
        timestamp: new Date(),
        playerId,
        gameId: this.gameId,
        team: player.team,
        data: {
          _gameType,
          _type: "pass",
        },
      };

      const [gameAction] = await trx
        .insert(gameActions)
        .values(action)
        .returning();

      const actionId = gameAction?.id;

      CodenamesGameEngine.endTurn(state);
      await trx.insert(gameEvents).values({
        gameId: this.gameId,
        team: player.team,
        playerId,
        gameState: state,
        actionId,
        data: {
          _gameType: "codenames",
          _type: "guessing_round_ended",
          reason: "passed",
          clue: state.currentClue,
        },
      });

      await trx
        .update(games)
        .set({
          gameState: state,
        })
        .where(eq(games.id, this.gameId));

      return { success: true, gameState: state };
    });
  }

  private static endTurn(state: GameState): void {
    state.currentTeam = state.currentTeam === "red" ? "blue" : "red";
    state.currentPhase = "giving-clue";
    state.currentClue = null;
    state.remainingGuesses = 0;
  }

  public static validateClue(
    state: GameState,
    word: string,
    count: number,
  ): { valid: boolean; error?: string } {
    // Basic validation
    if (!word || word.trim().length === 0) {
      if (count === 0) {
        // Assume it was an AI error - pass
        return { valid: true };
      }

      return { valid: false, error: "Clue word cannot be empty" };
    }

    if (count < 0 || count > 9) {
      return { valid: false, error: "Count must be between 0 and 9" };
    }

    if (word.includes(" ")) {
      return { valid: false, error: "Clue must be a single word" };
    }

    if (!wordExists(word)) {
      return { valid: false, error: "Clue must be a valid English word" };
    }

    const normalizedClue = word.toLowerCase().trim();

    // Check if clue matches any visible word
    const visibleWords = state.cards
      .filter((card) => !card.revealed)
      .map((card) => card.word.toLowerCase());

    if (
      visibleWords.some(
        (w) => w.includes(normalizedClue) || normalizedClue.includes(w),
      )
    ) {
      return {
        valid: false,
        error: "Clue cannot be a substring of a visible word",
      };
    }

    if (visibleWords.includes(normalizedClue)) {
      return {
        valid: false,
        error: "Clue cannot be the same as a visible word",
      };
    }

    return { valid: true };
  }

  public static loadWords(): string[] {
    try {
      const wordsPath = path.join(process.cwd(), "data", "words.txt");
      const wordsContent = readFileSync(wordsPath, "utf-8");
      return wordsContent
        .trim()
        .split("\n")
        .map((word) => word.trim())
        .filter((word) => word.length > 0);
    } catch (error) {
      console.error("Error loading words:", error);
      // Fallback words if file can't be loaded
      throw new Error("Failed to load words", { cause: error });
    }
  }
}
