"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";
import type { Player } from "~/lib/codenames/types";

type PlayerConfig = {
  aiModel: string;
  withReasoning: boolean;
};

export default function AIGamePage() {
  const [players, setPlayers] = useState<{
    redTeamSpymaster: PlayerConfig;
    redTeamOperative: PlayerConfig;
    blueTeamSpymaster: PlayerConfig;
    blueTeamOperative: PlayerConfig;
  }>({
    redTeamSpymaster: {
      aiModel: "openai/gpt-4o-mini",
      withReasoning: true,
    },
    redTeamOperative: {
      aiModel: "openai/gpt-4o-mini",
      withReasoning: true,
    },
    blueTeamSpymaster: {
      aiModel: "openai/gpt-4o-mini",
      withReasoning: true,
    },
    blueTeamOperative: {
      aiModel: "openai/gpt-4o-mini",
      withReasoning: true,
    },
  });

  const [gameIds, setGameIds] = useState<string[]>([]);
  const [gamesPlayers, setGamesPlayers] = useState<Player[][] | null>(null);
  const [numberOfGames, setNumberOfGames] = useState(1);

  const router = useRouter();

  const { data: availableModels } = api.ai.getAvailableModels.useQuery();

  const modelOptions = availableModels
    ? [
        {
          id: "human",
          name: "Human",
        },
        ...availableModels,
      ]
    : [];

  const createGame = api.game.createGame.useMutation({
    onSuccess: (data) => {
      setGameIds((prev) => [...prev, data.gameId]);
      setGamesPlayers((prev) => {
        if (!prev) return [data.players];
        return [...prev, data.players];
      });
    },
  });

  const handleCreateAIvsAI = async () => {
    for (let i = 0; i < numberOfGames; i++) {
      await createGame.mutateAsync(players);
    }
  };

  const getRoleLink = (player: Player, gameId: string | undefined) => {
    if (!gameId) return "";

    if (player.type === "human") {
      return `/game/${gameId}?playerId=${player.id}`;
    } else {
      return `/game/${gameId}?spectate=true`;
    }
  };

  const getRoleName = (player: Player) => {
    const team = player.team === "red" ? "Red" : "Blue";
    const role = player.data.role === "spymaster" ? "Spymaster" : "Operative";
    return `${team} Team ${role}`;
  };

  // If game is created, show the role links
  if (gameIds.length > 0 && gamesPlayers?.length === gameIds.length) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
        <div className="container mx-auto flex flex-col px-4 py-6">
          <div className="text-center">
            <h1 className="mb-4 text-5xl font-bold text-gray-800">
              {gameIds.length > 1
                ? `${gameIds.length} Games Created!`
                : "Game Created!"}
            </h1>
            <p className="text-xl text-gray-600">
              Choose your role or spectate the AI players
            </p>
          </div>

          <div className="mx-auto mt-2 flex w-full max-w-lg justify-center gap-4 px-2">
            <button
              onClick={() => router.push("/")}
              className="flex-1 rounded-md bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Home
            </button>
            <button
              onClick={() => {
                setGameIds([]);
                setGamesPlayers([]);
              }}
              className="flex-1 rounded-md bg-violet-600 px-6 py-3 font-semibold text-white hover:bg-violet-700"
            >
              Create More Games
            </button>
          </div>

          {gamesPlayers?.map((gamePlayers, index) => (
            <div key={index} className="mx-auto mt-4 max-w-4xl">
              <div className="rounded-lg bg-white p-6 shadow-lg">
                <h2 className="mb-6 text-center text-2xl font-semibold text-gray-800">
                  Game Links
                </h2>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {gamePlayers.map((player) => (
                    <div key={player.id} className="rounded-lg border p-4">
                      <h3
                        className={`mb-2 text-lg font-medium ${
                          player.team === "red"
                            ? "text-red-600"
                            : "text-blue-600"
                        }`}
                      >
                        {getRoleName(player)}
                      </h3>
                      <p className="mb-3 text-sm text-gray-600">
                        {player.type === "human"
                          ? "Human Player"
                          : (player.aiModel ?? "AI")}
                      </p>
                      <a
                        href={getRoleLink(player, gameIds[index])}
                        className={`inline-block w-full rounded px-4 py-2 text-center font-medium text-white transition-colors ${
                          player.type === "human"
                            ? "bg-green-600 hover:bg-green-700"
                            : "bg-gray-600 hover:bg-gray-700"
                        }`}
                      >
                        {player.type === "human"
                          ? "Play as this role"
                          : "Spectate AI"}
                      </a>
                    </div>
                  ))}
                </div>

                <div className="mt-6 text-center">
                  <a
                    href={`/game/${gameIds[index]}?spectate=true`}
                    className="inline-block rounded-md bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700"
                  >
                    Spectate Entire Game
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
      <div className="container mx-auto flex flex-col px-4 py-6">
        <div className="text-center">
          <h1 className="mb-4 text-5xl font-bold text-gray-800">
            AI Codenames
          </h1>
          <p className="text-xl text-gray-600">
            Play against AI or watch AI vs AI matches
          </p>
        </div>

        {/* back button */}
        <button
          onClick={() => router.push("/")}
          className="mx-auto mt-8 rounded-md bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
        >
          Back to Home
        </button>

        <div className="mx-auto mt-12 max-w-6xl">
          {/* AI vs AI */}
          <div className="rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-6 text-2xl font-semibold text-gray-800">
              AI Game
            </h2>

            <div className="space-y-6">
              <div>
                <h3 className="mb-4 text-lg font-medium text-gray-800">
                  Battle Configuration
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-md mb-2 font-medium text-red-600">
                      Red Team
                    </h4>
                    <div className="space-y-2">
                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <label className="text-xs text-gray-600">
                            Spymaster Model
                          </label>
                          {players.redTeamSpymaster.aiModel !== "human" && (
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                id="redSpymasterReasoningAI"
                                checked={players.redTeamSpymaster.withReasoning}
                                onChange={(e) => {
                                  setPlayers((prev) => ({
                                    ...prev,
                                    redTeamSpymaster: {
                                      ...prev.redTeamSpymaster,
                                      withReasoning: e.target.checked,
                                    },
                                  }));
                                }}
                                className="mr-1 h-3 w-3 text-red-600 focus:ring-red-500"
                              />
                              <label
                                htmlFor="redSpymasterReasoningAI"
                                className="text-xs text-gray-600"
                              >
                                With Reasoning
                              </label>
                            </div>
                          )}
                        </div>
                        <select
                          value={players.redTeamSpymaster.aiModel}
                          onChange={(e) =>
                            setPlayers((prev) => ({
                              ...prev,
                              redTeamSpymaster: {
                                ...prev.redTeamSpymaster,
                                aiModel: e.target.value,
                              },
                            }))
                          }
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:ring-1 focus:ring-red-500 focus:outline-none"
                        >
                          {modelOptions?.map((model) => (
                            <option key={model.id} value={model.id}>
                              {model.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <label className="text-xs text-gray-600">
                            Operative Model
                          </label>
                          {players.redTeamOperative.aiModel !== "human" && (
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                id="redOperativeReasoningAI"
                                checked={players.redTeamOperative.withReasoning}
                                onChange={(e) => {
                                  setPlayers((prev) => ({
                                    ...prev,
                                    redTeamOperative: {
                                      ...prev.redTeamOperative,
                                      withReasoning: e.target.checked,
                                    },
                                  }));
                                }}
                                className="mr-1 h-3 w-3 text-red-600 focus:ring-red-500"
                              />
                              <label
                                htmlFor="redOperativeReasoningAI"
                                className="text-xs text-gray-600"
                              >
                                With Reasoning
                              </label>
                            </div>
                          )}
                        </div>
                        <select
                          value={players.redTeamOperative.aiModel}
                          onChange={(e) =>
                            setPlayers((prev) => ({
                              ...prev,
                              redTeamOperative: {
                                ...prev.redTeamOperative,
                                aiModel: e.target.value,
                              },
                            }))
                          }
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:ring-1 focus:ring-red-500 focus:outline-none"
                        >
                          {modelOptions?.map((model) => (
                            <option key={model.id} value={model.id}>
                              {model.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-md mb-2 font-medium text-blue-600">
                      Blue Team
                    </h4>
                    <div className="space-y-2">
                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <label className="text-xs text-gray-600">
                            Spymaster Model
                          </label>
                          {players.blueTeamSpymaster.aiModel !== "human" && (
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                id="blueSpymasterReasoningAI"
                                checked={
                                  players.blueTeamSpymaster.withReasoning
                                }
                                onChange={(e) => {
                                  setPlayers((prev) => ({
                                    ...prev,
                                    blueTeamSpymaster: {
                                      ...prev.blueTeamSpymaster,
                                      withReasoning: e.target.checked,
                                    },
                                  }));
                                }}
                                className="mr-1 h-3 w-3 text-blue-600 focus:ring-blue-500"
                              />
                              <label
                                htmlFor="blueSpymasterReasoningAI"
                                className="text-xs text-gray-600"
                              >
                                With Reasoning
                              </label>
                            </div>
                          )}
                        </div>
                        <select
                          value={players.blueTeamSpymaster.aiModel}
                          onChange={(e) =>
                            setPlayers((prev) => ({
                              ...prev,
                              blueTeamSpymaster: {
                                ...prev.blueTeamSpymaster,
                                aiModel: e.target.value,
                              },
                            }))
                          }
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        >
                          {modelOptions?.map((model) => (
                            <option key={model.id} value={model.id}>
                              {model.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <label className="text-xs text-gray-600">
                            Operative Model
                          </label>
                          {players.blueTeamOperative.aiModel !== "human" && (
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                id="blueOperativeReasoningAI"
                                checked={
                                  players.blueTeamOperative.withReasoning
                                }
                                onChange={(e) => {
                                  setPlayers((prev) => ({
                                    ...prev,
                                    blueTeamOperative: {
                                      ...prev.blueTeamOperative,
                                      withReasoning: e.target.checked,
                                    },
                                  }));
                                }}
                                className="mr-1 h-3 w-3 text-blue-600 focus:ring-blue-500"
                              />
                              <label
                                htmlFor="blueOperativeReasoningAI"
                                className="text-xs text-gray-600"
                              >
                                With Reasoning
                              </label>
                            </div>
                          )}
                        </div>
                        <select
                          value={players.blueTeamOperative.aiModel}
                          onChange={(e) =>
                            setPlayers((prev) => ({
                              ...prev,
                              blueTeamOperative: {
                                ...prev.blueTeamOperative,
                                aiModel: e.target.value,
                              },
                            }))
                          }
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        >
                          {modelOptions?.map((model) => (
                            <option key={model.id} value={model.id}>
                              {model.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex w-full items-center justify-between gap-2">
                <button
                  onClick={handleCreateAIvsAI}
                  disabled={createGame.isPending}
                  className="w-full rounded-md bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {createGame.isPending ? "Creating Battle..." : "Start Game"}
                </button>
                <input
                  type="number"
                  value={numberOfGames}
                  onChange={(e) => setNumberOfGames(Number(e.target.value))}
                  className="h-12 w-16 rounded-md border border-gray-300 px-2 py-1 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {createGame.error && (
                <p className="text-sm text-red-600">
                  {createGame.error.message}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
