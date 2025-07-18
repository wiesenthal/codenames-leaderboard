import { relations } from "drizzle-orm";
import { gameActions, games, players } from "./schema";

export const gameRelations = relations(games, ({ many }) => ({
  players: many(players),
  gameHistory: many(gameActions),
}));

export const playerRelations = relations(players, ({ one, many }) => ({
  game: one(games, { fields: [players.gameId], references: [games.id] }),
  actions: many(gameActions),
}));

export const gameActionRelations = relations(gameActions, ({ one }) => ({
  game: one(games, { fields: [gameActions.gameId], references: [games.id] }),
  player: one(players, {
    fields: [gameActions.playerId],
    references: [players.id],
  }),
}));
