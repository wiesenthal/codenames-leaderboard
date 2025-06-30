// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import { sql } from "drizzle-orm";
import { index, pgTableCreator, text, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator(
  (name) => `codenames-leaderboard_${name}`,
);

export const posts = createTable(
  "post",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    name: d.varchar({ length: 256 }),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [index("name_idx").on(t.name)],
);

// Game related tables
export const games = createTable(
  "game",
  (d) => ({
    id: d.varchar({ length: 256 }).primaryKey(),
    gameType: d.varchar({ length: 50 }).notNull().default('codenames'),
    status: d.varchar({ length: 20 }).notNull().default('active'), // active, completed, abandoned
    gameState: jsonb("game_state").notNull(),
    winner: d.varchar({ length: 10 }), // red, blue, or null
    startedAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    completedAt: d.timestamp({ withTimezone: true }),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("game_type_idx").on(t.gameType),
    index("status_idx").on(t.status),
    index("started_at_idx").on(t.startedAt),
  ],
);

export const players = createTable(
  "player",
  (d) => ({
    id: d.varchar({ length: 256 }).primaryKey(),
    name: d.varchar({ length: 256 }).notNull(),
    type: d.varchar({ length: 20 }).notNull(), // human, ai
    aiModel: d.varchar({ length: 100 }), // e.g., "gpt-4", "claude-3", null for humans
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  }),
  (t) => [
    index("player_type_idx").on(t.type),
    index("ai_model_idx").on(t.aiModel),
  ],
);

export const gameParticipants = createTable(
  "game_participant",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    gameId: d.varchar({ length: 256 }).notNull().references(() => games.id),
    playerId: d.varchar({ length: 256 }).notNull().references(() => players.id),
    team: d.varchar({ length: 10 }).notNull(), // red, blue
    role: d.varchar({ length: 20 }).notNull(), // spymaster, operative
    joinedAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  }),
  (t) => [
    index("game_participant_game_idx").on(t.gameId),
    index("game_participant_player_idx").on(t.playerId),
  ],
);

export const gameActions = createTable(
  "game_action",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    gameId: d.varchar({ length: 256 }).notNull().references(() => games.id),
    playerId: d.varchar({ length: 256 }).notNull().references(() => players.id),
    actionType: d.varchar({ length: 20 }).notNull(), // clue, guess, pass
    actionData: jsonb("action_data").notNull(),
    timestamp: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  }),
  (t) => [
    index("game_action_game_idx").on(t.gameId),
    index("game_action_timestamp_idx").on(t.timestamp),
  ],
);

// Leaderboard and statistics
export const playerStats = createTable(
  "player_stats",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    playerId: d.varchar({ length: 256 }).notNull().references(() => players.id),
    gameType: d.varchar({ length: 50 }).notNull().default('codenames'),
    gamesPlayed: d.integer().notNull().default(0),
    gamesWon: d.integer().notNull().default(0),
    gamesLost: d.integer().notNull().default(0),
    winRate: d.real().notNull().default(0),
    averageGameDuration: d.integer(), // in minutes
    spymasterGames: d.integer().notNull().default(0),
    operativeGames: d.integer().notNull().default(0),
    eloRating: d.integer().notNull().default(1200),
    lastUpdated: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("player_stats_player_idx").on(t.playerId),
    index("player_stats_elo_idx").on(t.eloRating),
    index("player_stats_winrate_idx").on(t.winRate),
  ],
);

export const tournaments = createTable(
  "tournament",
  (d) => ({
    id: d.varchar({ length: 256 }).primaryKey(),
    name: d.varchar({ length: 256 }).notNull(),
    gameType: d.varchar({ length: 50 }).notNull().default('codenames'),
    status: d.varchar({ length: 20 }).notNull().default('planned'), // planned, active, completed
    tournamentType: d.varchar({ length: 20 }).notNull(), // round-robin, elimination, swiss
    maxParticipants: d.integer(),
    currentRound: d.integer().notNull().default(0),
    totalRounds: d.integer(),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    startedAt: d.timestamp({ withTimezone: true }),
    completedAt: d.timestamp({ withTimezone: true }),
  }),
  (t) => [
    index("tournament_status_idx").on(t.status),
    index("tournament_type_idx").on(t.tournamentType),
  ],
);
