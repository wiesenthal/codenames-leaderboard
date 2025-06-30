export type Team = "red" | "blue";
export type CardType = "red" | "blue" | "neutral" | "assassin";
export type GamePhase = "setup" | "giving-clue" | "guessing" | "game-over";
export type PlayerType = "human" | "ai";

export interface Card {
  word: string;
  type: CardType;
  revealed: boolean;
  position: number; // 0-24 for 5x5 grid
}

export interface Player {
  id: string;
  name: string;
  type: PlayerType;
  team: Team;
  role: "spymaster" | "operative";
  aiModel?: string; // OpenRouter model ID for AI players
  withReasoning?: boolean;
}

export interface Clue {
  word: string;
  count: number;
  team: Team;
  spymasterId: string;
}

export interface Guess {
  cardIndex: number;
  playerId: string;
  team: Team;
}

export interface GameState {
  id: string;
  cards: Card[];
  players: Player[];
  currentTeam: Team;
  currentPhase: GamePhase;
  currentClue: Clue | null;
  remainingGuesses: number;
  winner: Team | null;
  startingTeam: Team;
  redAgentsRemaining: number;
  blueAgentsRemaining: number;
  gameHistory: GameAction[];
  createdAt: Date;
  updatedAt: Date;
}

export type GameAction =
  | {
      type: "clue";
      timestamp: Date;
      playerId: string;
      team: Team;
      data: Clue;
    }
  | {
      type: "guess";
      timestamp: Date;
      playerId: string;
      team: Team;
      data: Guess;
    }
  | {
      type: "pass";
      timestamp: Date;
      playerId: string;
      team: Team;
      data: Record<string, never>;
    };

export interface GameConfig {
  words: string[];
  players: Omit<Player, "id">[];
}
