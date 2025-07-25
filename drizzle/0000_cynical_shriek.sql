CREATE TYPE "public"."player_type" AS ENUM('human', 'ai');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('active', 'completed', 'abandoned');--> statement-breakpoint
CREATE TABLE "codenames_leaderboard_game_action" (
	"id" integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY (sequence name "codenames_leaderboard_game_action_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"game_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"team" text NOT NULL,
	"action_data" jsonb NOT NULL,
	"timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "codenames_leaderboard_game_event" (
	"id" integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY (sequence name "codenames_leaderboard_game_event_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"game_id" uuid NOT NULL,
	"team" text,
	"player_id" uuid,
	"action_id" integer,
	"event_data" jsonb NOT NULL,
	"game_state" jsonb,
	"timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "codenames_leaderboard_game" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "status" DEFAULT 'active' NOT NULL,
	"should_prompt_ai_move" boolean DEFAULT false NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"game_state" jsonb NOT NULL,
	"label" text,
	"winner" varchar(10),
	"started_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "codenames_leaderboard_player" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"team" text NOT NULL,
	"name" varchar(256) NOT NULL,
	"player_type" "player_type" NOT NULL,
	"ai_model" text,
	"with_reasoning" boolean,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "codenames_leaderboard_game_action" ADD CONSTRAINT "codenames_leaderboard_game_action_game_id_codenames_leaderboard_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."codenames_leaderboard_game"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "codenames_leaderboard_game_action" ADD CONSTRAINT "codenames_leaderboard_game_action_player_id_codenames_leaderboard_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."codenames_leaderboard_player"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "codenames_leaderboard_game_event" ADD CONSTRAINT "codenames_leaderboard_game_event_game_id_codenames_leaderboard_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."codenames_leaderboard_game"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "codenames_leaderboard_game_event" ADD CONSTRAINT "codenames_leaderboard_game_event_player_id_codenames_leaderboard_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."codenames_leaderboard_player"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "codenames_leaderboard_game_event" ADD CONSTRAINT "codenames_leaderboard_game_event_action_id_codenames_leaderboard_game_action_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."codenames_leaderboard_game_action"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "codenames_leaderboard_player" ADD CONSTRAINT "codenames_leaderboard_player_game_id_codenames_leaderboard_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."codenames_leaderboard_game"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "game_action_game_idx" ON "codenames_leaderboard_game_action" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "game_action_timestamp_idx" ON "codenames_leaderboard_game_action" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "game_event_game_idx" ON "codenames_leaderboard_game_event" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "game_event_timestamp_idx" ON "codenames_leaderboard_game_event" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "status_idx" ON "codenames_leaderboard_game" USING btree ("status");--> statement-breakpoint
CREATE INDEX "started_at_idx" ON "codenames_leaderboard_game" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "player_type_idx" ON "codenames_leaderboard_player" USING btree ("player_type");--> statement-breakpoint
CREATE INDEX "ai_model_idx" ON "codenames_leaderboard_player" USING btree ("ai_model");