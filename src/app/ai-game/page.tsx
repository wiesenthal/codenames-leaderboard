"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";
import type { Player } from "~/lib/codenames/types";
import { sleep } from "~/lib/utils/misc";
import type { JSONValue } from "ai";

type PlayerConfig = {
  aiModel: string;
  withReasoning: boolean;
  systemPrompt?: string;
  alwaysPassOnBonusGuess?: boolean;
  providerOptions?: Record<string, Record<string, JSONValue>>;
};

type PlayerRole =
  | "redTeamSpymaster"
  | "redTeamOperative"
  | "blueTeamSpymaster"
  | "blueTeamOperative";

export default function AIGamePage() {
  const [players, setPlayers] = useState<{
    redTeamSpymaster: PlayerConfig;
    redTeamOperative: PlayerConfig;
    blueTeamSpymaster: PlayerConfig;
    blueTeamOperative: PlayerConfig;
  }>({
    redTeamSpymaster: {
      aiModel: "google/gemini-2.5-flash",
      withReasoning: false,
      systemPrompt: ``,
      alwaysPassOnBonusGuess: false,
    },
    redTeamOperative: {
      aiModel: "google/gemini-2.5-flash",
      withReasoning: false,
      systemPrompt: ``,
      alwaysPassOnBonusGuess: false,
    },
    blueTeamSpymaster: {
      aiModel: "google/gemini-2.5-flash",
      withReasoning: false,
      systemPrompt: ``,
      alwaysPassOnBonusGuess: false,
    },
    blueTeamOperative: {
      aiModel: "google/gemini-2.5-flash",
      withReasoning: false,
      systemPrompt: ``,
      alwaysPassOnBonusGuess: false,
    },
  });

  const [label, setLabel] = useState("");
  const [gameIds, setGameIds] = useState<string[]>([]);
  const [gamesPlayers, setGamesPlayers] = useState<Player[][] | null>(null);
  const [numberOfGames, setNumberOfGames] = useState(1);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentEditingRole, setCurrentEditingRole] =
    useState<PlayerRole | null>(null);
  const [tempPrompt, setTempPrompt] = useState("");

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

  // Modal functions
  const openPromptModal = (role: PlayerRole) => {
    setCurrentEditingRole(role);
    setTempPrompt(players[role].systemPrompt ?? "");
    setIsModalOpen(true);
  };

  const closePromptModal = () => {
    setIsModalOpen(false);
    setCurrentEditingRole(null);
    setTempPrompt("");
  };

  const savePrompt = () => {
    if (currentEditingRole) {
      setPlayers((prev) => ({
        ...prev,
        [currentEditingRole]: {
          ...prev[currentEditingRole],
          systemPrompt: tempPrompt,
        },
      }));
    }
    closePromptModal();
  };

  const handleCreateAIvsAI = async () => {
    console.log("creating games", numberOfGames, label);
    await Promise.all(
      Array.from({ length: numberOfGames }).map((_, i) =>
        sleep(i).then(() =>
          createGame.mutateAsync({
            players,
            label,
          }),
        ),
      ),
    );
  };

  const getRoleLink = (player: Player, gameId: string | undefined) => {
    if (!gameId) return "";

    if (player.type === "human") {
      return `/game/${gameId}?playerId=${player.id}`;
    } else {
      return `/game/${gameId}?spectate=true`;
    }
  };

  const getRoleDisplayName = (role: PlayerRole) => {
    const roleMap = {
      redTeamSpymaster: "Red Team Spymaster",
      redTeamOperative: "Red Team Operative",
      blueTeamSpymaster: "Blue Team Spymaster",
      blueTeamOperative: "Blue Team Operative",
    };
    return roleMap[role];
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
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Enter a label for the game"
                  className="mb-4 w-full rounded border border-gray-300 px-2 py-1 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
                <div className="flex flex-row justify-between">
                  <div className="flex w-1/2 items-start">
                    <input // For now I am just going to have all players have the same alwaysPassOnBonusGuess
                      type="checkbox"
                      id="alwaysPassOnBonusGuess"
                      checked={players.redTeamOperative.alwaysPassOnBonusGuess}
                      onChange={(e) => {
                        setPlayers((prev) => ({
                          ...prev,
                          redTeamOperative: {
                            ...prev.redTeamOperative,
                            alwaysPassOnBonusGuess: e.target.checked,
                          },
                        }));
                      }}
                      className="mr-1 h-3 w-3 text-green-600 focus:ring-green-500"
                    />
                    <label
                      htmlFor="blueOperativeReasoningAI"
                      className="text-xs text-red-600"
                    >
                      Always Pass on Bonus Guess
                    </label>
                  </div>
                  <div className="flex w-1/2 items-start">
                    <input
                      type="checkbox"
                      id="alwaysPassOnBonusGuess"
                      checked={players.blueTeamOperative.alwaysPassOnBonusGuess}
                      onChange={(e) => {
                        setPlayers((prev) => ({
                          ...prev,
                          blueTeamOperative: {
                            ...prev.blueTeamOperative,
                            alwaysPassOnBonusGuess: e.target.checked,
                          },
                        }));
                      }}
                      className="mr-1 h-3 w-3 text-green-600 focus:ring-green-500"
                    />
                    <label
                      htmlFor="bluealwaysPassOnBonusGuess"
                      className="text-xs text-blue-600"
                    >
                      Always Pass on Bonus Guess
                    </label>
                  </div>
                </div>
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
                        {players.redTeamSpymaster.aiModel !== "human" && (
                          <button
                            type="button"
                            onClick={() => openPromptModal("redTeamSpymaster")}
                            className="mt-1 w-full rounded border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100"
                          >
                            {players.redTeamSpymaster.systemPrompt
                              ? "Edit Prompt"
                              : "Add Prompt"}
                          </button>
                        )}
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
                        {players.redTeamOperative.aiModel !== "human" && (
                          <button
                            type="button"
                            onClick={() => openPromptModal("redTeamOperative")}
                            className="mt-1 w-full rounded border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100"
                          >
                            {players.redTeamOperative.systemPrompt
                              ? "Edit Prompt"
                              : "Add Prompt"}
                          </button>
                        )}
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
                        {players.blueTeamSpymaster.aiModel !== "human" && (
                          <button
                            type="button"
                            onClick={() => openPromptModal("blueTeamSpymaster")}
                            className="mt-1 w-full rounded border border-blue-300 bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100"
                          >
                            {players.blueTeamSpymaster.systemPrompt
                              ? "Edit Prompt"
                              : "Add Prompt"}
                          </button>
                        )}
                      </div>
                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <label className="text-xs text-gray-600">
                            Operative Model
                          </label>
                          {players.blueTeamOperative.aiModel !== "human" && (
                            <>
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
                            </>
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
                        {players.blueTeamOperative.aiModel !== "human" && (
                          <button
                            type="button"
                            onClick={() => openPromptModal("blueTeamOperative")}
                            className="mt-1 w-full rounded border border-blue-300 bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100"
                          >
                            {players.blueTeamOperative.systemPrompt
                              ? "Edit Prompt"
                              : "Add Prompt"}
                          </button>
                        )}
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
                  {createGame.isPending
                    ? "Creating Battle..."
                    : numberOfGames > 1
                      ? "Start Games"
                      : "Start Game"}
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

      {/* Prompt Editing Modal */}
      {isModalOpen && currentEditingRole && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-sm`}
          onClick={closePromptModal}
        >
          <div
            className="mx-4 w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">
                Edit System Prompt - {getRoleDisplayName(currentEditingRole)}
              </h3>
              <button
                onClick={closePromptModal}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                System Prompt
              </label>
              <textarea
                value={tempPrompt}
                onChange={(e) => setTempPrompt(e.target.value)}
                placeholder="Enter custom system prompt for this AI player..."
                className="h-64 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
              <p className="mt-1 text-xs text-gray-500">
                This prompt will be used to guide the AI&apos;s behavior for
                this specific role.
              </p>
            </div>

            <div>
              {/* Provider Options */}
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Anthropic Reasoning
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={
                        !!players[currentEditingRole]?.providerOptions
                          ?.anthropic?.thinking
                      }
                      onChange={(e) => {
                        setPlayers((prev) => ({
                          ...prev,
                          [currentEditingRole]: {
                            ...prev[currentEditingRole],
                            providerOptions: e.target.checked
                              ? {
                                  ...prev[currentEditingRole].providerOptions,
                                  anthropic: {
                                    thinking: {
                                      type: "enabled",
                                      budgetTokens: 500,
                                    },
                                  },
                                }
                              : {
                                  ...prev[currentEditingRole].providerOptions,
                                  anthropic: undefined,
                                },
                          },
                        }));
                      }}
                      className="mr-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">
                      Enable Anthropic thinking (12k token budget)
                    </span>
                  </label>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Configure provider-specific options for this AI player.
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={closePromptModal}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={savePrompt}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Save Prompt
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
