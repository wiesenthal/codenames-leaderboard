// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import { sql } from "drizzle-orm";
import { index, pgTableCreator, jsonb, pgEnum } from "drizzle-orm/pg-core";
import type {
  GameActionData,
  GameEventData,
  GameState,
  PlayerData,
  Team,
} from "../../lib/codenames/types";

export const statusEnum = pgEnum("status", [
  "active",
  "completed",
  "abandoned",
]);
export const playerTypeEnum = pgEnum("player_type", ["human", "ai"]);

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator(
  (name) => `codenames_leaderboard_${name}`,
);

// Game related tables
export const games = createTable(
  "game",
  (d) => ({
    id: d.uuid().defaultRandom().primaryKey(),
    status: statusEnum("status").notNull().default("active"), // active, completed, abandoned
    shouldPromptAIMove: d.boolean().notNull().default(false), // true if the game will prompt the ai to act. If the ai has been prompted to act, this will be false
    archived: d.boolean().notNull().default(false),
    gameState: jsonb("game_state").$type<GameState>().notNull(),
    label: d.text(),
    winner: d.varchar({ length: 10 }).$type<Team>(), // red, blue, or null
    startedAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    completedAt: d.timestamp({ withTimezone: true }),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("status_idx").on(t.status),
    index("started_at_idx").on(t.startedAt),
  ],
);

export const players = createTable(
  "player",
  (d) => ({
    id: d.uuid().defaultRandom().primaryKey(),
    gameId: d
      .uuid()
      .notNull()
      .references(() => games.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    team: d.text().notNull(),
    name: d.varchar({ length: 256 }).notNull(),
    type: playerTypeEnum("player_type").notNull(), // human, ai
    aiModel: d.text(), // e.g., "gpt-4", "claude-3", null for humans
    withReasoning: d.boolean(),
    systemPrompt: d.text(),
    data: jsonb("data").$type<PlayerData>().notNull(),
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

export const gameActions = createTable(
  "game_action",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    gameId: d
      .uuid()
      .notNull()
      .references(() => games.id, { onDelete: "cascade", onUpdate: "cascade" }),
    playerId: d
      .uuid()
      .notNull()
      .references(() => players.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    team: d.text().notNull(),
    data: jsonb("action_data").$type<GameActionData>().notNull(),
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

export const gameEvents = createTable(
  "game_event",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    gameId: d
      .uuid()
      .notNull()
      .references(() => games.id, { onDelete: "cascade", onUpdate: "cascade" }),
    team: d.text(),
    playerId: d.uuid().references(() => players.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
    actionId: d.integer().references(() => gameActions.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
    data: jsonb("event_data").$type<GameEventData>().notNull(),
    gameState: jsonb("game_state").$type<GameState>(),
    timestamp: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  }),
  (t) => [
    index("game_event_game_idx").on(t.gameId),
    index("game_event_timestamp_idx").on(t.timestamp),
  ],
);
