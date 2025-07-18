import { z } from "zod";

export type Team = string; // red | blue
export type CardType = "red" | "blue" | "neutral" | "assassin";
export type GamePhase = "setup" | "giving-clue" | "guessing" | "game-over";
export type PlayerType = "human" | "ai";
type _gameType = "codenames";

export interface Card {
  word: string;
  type: CardType;
  revealed: boolean;
  position: number; // 0-24 for 5x5 grid
}

export interface PlayerData {
  _gameType: _gameType;
  role: "spymaster" | "operative";
}

export interface Player {
  id: string;
  name: string;
  type: PlayerType;
  team: Team;
  data: PlayerData;
  aiModel: string | null; // OpenRouter model ID for AI players
  withReasoning: boolean | null;
}

export type AIPlayer = Player & {
  aiModel: string;
  withReasoning: boolean;
};

export type PlayerWithoutId = Omit<Player, "id">;

export interface GameState {
  _gameType: _gameType;
  cards: Card[];
  currentTeam: Team;
  currentPhase: GamePhase;
  currentClue: Clue | null;
  remainingGuesses: number;
  winner: Team | null;
  startingTeam: Team;
  redAgentsRemaining: number;
  blueAgentsRemaining: number;
}

export interface Game {
  id: string;
  status: "active" | "completed" | "abandoned";
  gameState: GameState;
  winner: Team | null;
  startedAt: Date;
  completedAt: Date | null;
  updatedAt: Date | null;
  // Added fields from select
  players: Player[];
  gameHistory: GameAction[];
}

export const ClueSchema = z.object({
  _gameType: z.literal("codenames"),
  _type: z.literal("clue"),
  word: z.string(),
  count: z.number(),
});

export type Clue = z.infer<typeof ClueSchema>;

export const GuessSchema = z.object({
  _gameType: z.literal("codenames"),
  _type: z.literal("guess"),
  cardIndex: z.number(),
});

export type Guess = z.infer<typeof GuessSchema>;

export const PassSchema = z.object({
  _gameType: z.literal("codenames"),
  _type: z.literal("pass"),
});

export type Pass = z.infer<typeof PassSchema>;

export type GameActionData = Clue | Guess | Pass;

export const GameActionInputSchema = z.object({
  playerId: z.string(),
  data: z.discriminatedUnion("_type", [ClueSchema, GuessSchema, PassSchema]),
});

export type GameActionInput = z.infer<typeof GameActionInputSchema>;

export type GameAction = GameActionInput & {
  timestamp: Date;
  gameId: string;
  team: Team;
};

export interface GameConfig {
  words: string[];
  players: PlayerWithoutId[];
}
