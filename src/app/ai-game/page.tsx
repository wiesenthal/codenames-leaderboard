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

  const [aiWithReasoning, setAiWithReasoning] = useState({
    redSpymaster: true,
    redOperative: true,
    blueSpymaster: true,
    blueOperative: true,
  });

  const [gameId, setGameId] = useState<string | null>(null);
  const [gamePlayers, setGamePlayers] = useState<Player[] | null>(null);

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
      setGameId(data.gameId);
      setGamePlayers(data.players);
    },
  });

  const handleCreateAIvsAI = () => {
    createGame.mutate(players);
  };

  const getRoleLink = (player: Player) => {
    if (!gameId) return "";
    
    if (player.type === "human") {
      return `/game/${gameId}?playerId=${player.id}`;
    } else {
      return `/game/${gameId}?spectate=true`;
    }
  };

  const getRoleName = (player: Player) => {
    const team = player.team === "red" ? "Red" : "Blue";
    const role = player.role === "spymaster" ? "Spymaster" : "Operative";
    return `${team} Team ${role}`;
  };

  // If game is created, show the role links
  if (gameId && gamePlayers) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
        <div className="container mx-auto flex flex-col px-4 py-6">
          <div className="text-center">
            <h1 className="mb-4 text-5xl font-bold text-gray-800">
              Game Created!
            </h1>
            <p className="text-xl text-gray-600">
              Choose your role or spectate the AI players
            </p>
          </div>

          <div className="mx-auto mt-12 max-w-4xl">
            <div className="rounded-lg bg-white p-6 shadow-lg">
              <h2 className="mb-6 text-2xl font-semibold text-gray-800 text-center">
                Game Links
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {gamePlayers.map((player) => (
                  <div key={player.id} className="border rounded-lg p-4">
                    <h3 className={`text-lg font-medium mb-2 ${
                      player.team === 'red' ? 'text-red-600' : 'text-blue-600'
                    }`}>
                      {getRoleName(player)}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      {player.type === "human" ? "Human Player" : (player.aiModel ?? "AI")}
                    </p>
                    <a
                      href={getRoleLink(player)}
                      className={`inline-block w-full text-center px-4 py-2 rounded font-medium text-white transition-colors ${
                        player.type === "human" 
                          ? "bg-green-600 hover:bg-green-700" 
                          : "bg-gray-600 hover:bg-gray-700"
                      }`}
                    >
                      {player.type === "human" ? "Play as this role" : "Spectate AI"}
                    </a>
                  </div>
                ))}
              </div>

              <div className="mt-6 text-center">
                <button
                  onClick={() => {
                    setGameId(null);
                    setGamePlayers(null);
                  }}
                  className="mr-4 rounded-md bg-gray-600 px-6 py-3 font-semibold text-white hover:bg-gray-700"
                >
                  Create Another Game
                </button>
                <a
                  href={`/game/${gameId}?spectate=true`}
                  className="inline-block rounded-md bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700"
                >
                  Spectate Entire Game
                </a>
              </div>
            </div>
          </div>
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
                                  setAiWithReasoning((prev) => ({
                                    ...prev,
                                    redSpymaster: e.target.checked,
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
                                  setAiWithReasoning((prev) => ({
                                    ...prev,
                                    redOperative: e.target.checked,
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
                                checked={players.blueTeamSpymaster.withReasoning}
                                onChange={(e) => {
                                  setPlayers((prev) => ({
                                    ...prev,
                                    blueTeamSpymaster: {
                                      ...prev.blueTeamSpymaster,
                                      withReasoning: e.target.checked,
                                    },
                                  }));
                                  setAiWithReasoning((prev) => ({
                                    ...prev,
                                    blueSpymaster: e.target.checked,
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
                                checked={players.blueTeamOperative.withReasoning}
                                onChange={(e) => {
                                  setPlayers((prev) => ({
                                    ...prev,
                                    blueTeamOperative: {
                                      ...prev.blueTeamOperative,
                                      withReasoning: e.target.checked,
                                    },
                                  }));
                                  setAiWithReasoning((prev) => ({
                                    ...prev,
                                    blueOperative: e.target.checked,
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

              <button
                onClick={handleCreateAIvsAI}
                disabled={createGame.isPending}
                className="w-full rounded-md bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {createGame.isPending
                  ? "Creating Battle..."
                  : "Start Game"}
              </button>

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
