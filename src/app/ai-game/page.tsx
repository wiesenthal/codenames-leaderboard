"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";

export default function AIGamePage() {
  const [humanPlayer, setHumanPlayer] = useState({
    name: "",
    team: "red" as "red" | "blue",
    role: "spymaster" as "spymaster" | "operative",
  });

  const [aiModels, setAiModels] = useState({
    redSpymaster: "openai/gpt-4o-mini",
    redOperative: "openai/gpt-4o-mini",
    blueSpymaster: "openai/gpt-4o-mini",
    blueOperative: "openai/gpt-4o-mini",
  });

  const router = useRouter();

  const { data: availableModels } = api.ai.getAvailableModels.useQuery();

  const createAIGame = api.game.createAIGame.useMutation({
    onSuccess: (data) => {
      if (data.humanPlayerId) {
        router.push(`/game/${data.gameId}?playerId=${data.humanPlayerId}`);
      }
    },
  });

  const createAIvsAIGame = api.game.createAIvsAIGame.useMutation({
    onSuccess: (data) => {
      router.push(`/game/${data.gameId}?spectate=true`);
    },
  });

  const handleCreateHumanVsAI = (e: React.FormEvent) => {
    e.preventDefault();
    if (humanPlayer.name.trim()) {
      createAIGame.mutate({
        humanPlayer: {
          name: humanPlayer.name.trim(),
          team: humanPlayer.team,
          role: humanPlayer.role,
        },
        aiModels,
      });
    }
  };

  const handleCreateAIvsAI = () => {
    createAIvsAIGame.mutate({
      redTeamModels: {
        spymaster: aiModels.redSpymaster,
        operative: aiModels.redOperative,
      },
      blueTeamModels: {
        spymaster: aiModels.blueSpymaster,
        operative: aiModels.blueOperative,
      },
    });
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-5xl font-bold text-gray-800">
            AI Codenames
          </h1>
          <p className="text-xl text-gray-600">
            Play against AI or watch AI vs AI matches
          </p>
        </div>

        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Human vs AI */}
          <div className="rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-6 text-2xl font-semibold text-gray-800">
              Human vs AI
            </h2>

            <form onSubmit={handleCreateHumanVsAI} className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Your Name
                </label>
                <input
                  type="text"
                  value={humanPlayer.name}
                  onChange={(e) =>
                    setHumanPlayer((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  placeholder="Enter your name"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Your Team
                  </label>
                  <select
                    value={humanPlayer.team}
                    onChange={(e) =>
                      setHumanPlayer((prev) => ({
                        ...prev,
                        team: e.target.value as "red" | "blue",
                      }))
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    <option value="red">Red Team</option>
                    <option value="blue">Blue Team</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Your Role
                  </label>
                  <select
                    value={humanPlayer.role}
                    onChange={(e) =>
                      setHumanPlayer((prev) => ({
                        ...prev,
                        role: e.target.value as "spymaster" | "operative",
                      }))
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    <option value="spymaster">Spymaster</option>
                    <option value="operative">Operative</option>
                  </select>
                </div>
              </div>

              <div>
                <h3 className="mb-4 text-lg font-medium text-gray-800">
                  AI Models Configuration
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-md mb-2 font-medium text-red-600">
                      Red Team
                    </h4>
                    <div className="space-y-2">
                      <div>
                        <label className="mb-1 block text-xs text-gray-600">
                          Spymaster
                        </label>
                        <select
                          value={aiModels.redSpymaster}
                          onChange={(e) =>
                            setAiModels((prev) => ({
                              ...prev,
                              redSpymaster: e.target.value,
                            }))
                          }
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:ring-1 focus:ring-red-500 focus:outline-none"
                        >
                          {availableModels?.map((model) => (
                            <option key={model.id} value={model.id}>
                              {model.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-600">
                          Operative
                        </label>
                        <select
                          value={aiModels.redOperative}
                          onChange={(e) =>
                            setAiModels((prev) => ({
                              ...prev,
                              redOperative: e.target.value,
                            }))
                          }
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:ring-1 focus:ring-red-500 focus:outline-none"
                        >
                          {availableModels?.map((model) => (
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
                        <label className="mb-1 block text-xs text-gray-600">
                          Spymaster
                        </label>
                        <select
                          value={aiModels.blueSpymaster}
                          onChange={(e) =>
                            setAiModels((prev) => ({
                              ...prev,
                              blueSpymaster: e.target.value,
                            }))
                          }
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        >
                          {availableModels?.map((model) => (
                            <option key={model.id} value={model.id}>
                              {model.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-600">
                          Operative
                        </label>
                        <select
                          value={aiModels.blueOperative}
                          onChange={(e) =>
                            setAiModels((prev) => ({
                              ...prev,
                              blueOperative: e.target.value,
                            }))
                          }
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        >
                          {availableModels?.map((model) => (
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
                type="submit"
                disabled={createAIGame.isPending || !humanPlayer.name.trim()}
                className="w-full rounded-md bg-purple-600 px-6 py-3 font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {createAIGame.isPending
                  ? "Creating Game..."
                  : "Start Human vs AI Game"}
              </button>

              {createAIGame.error && (
                <p className="text-sm text-red-600">
                  {createAIGame.error.message}
                </p>
              )}
            </form>
          </div>

          {/* AI vs AI */}
          <div className="rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-6 text-2xl font-semibold text-gray-800">
              AI vs AI Tournament
            </h2>

            <div className="space-y-6">
              <div>
                <h3 className="mb-4 text-lg font-medium text-gray-800">
                  Battle Configuration
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-md mb-2 font-medium text-red-600">
                      Red Team AI
                    </h4>
                    <div className="space-y-2">
                      <div>
                        <label className="mb-1 block text-xs text-gray-600">
                          Spymaster Model
                        </label>
                        <select
                          value={aiModels.redSpymaster}
                          onChange={(e) =>
                            setAiModels((prev) => ({
                              ...prev,
                              redSpymaster: e.target.value,
                            }))
                          }
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:ring-1 focus:ring-red-500 focus:outline-none"
                        >
                          {availableModels?.map((model) => (
                            <option key={model.id} value={model.id}>
                              {model.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-600">
                          Operative Model
                        </label>
                        <select
                          value={aiModels.redOperative}
                          onChange={(e) =>
                            setAiModels((prev) => ({
                              ...prev,
                              redOperative: e.target.value,
                            }))
                          }
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:ring-1 focus:ring-red-500 focus:outline-none"
                        >
                          {availableModels?.map((model) => (
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
                      Blue Team AI
                    </h4>
                    <div className="space-y-2">
                      <div>
                        <label className="mb-1 block text-xs text-gray-600">
                          Spymaster Model
                        </label>
                        <select
                          value={aiModels.blueSpymaster}
                          onChange={(e) =>
                            setAiModels((prev) => ({
                              ...prev,
                              blueSpymaster: e.target.value,
                            }))
                          }
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        >
                          {availableModels?.map((model) => (
                            <option key={model.id} value={model.id}>
                              {model.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-600">
                          Operative Model
                        </label>
                        <select
                          value={aiModels.blueOperative}
                          onChange={(e) =>
                            setAiModels((prev) => ({
                              ...prev,
                              blueOperative: e.target.value,
                            }))
                          }
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        >
                          {availableModels?.map((model) => (
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
                disabled={createAIvsAIGame.isPending}
                className="w-full rounded-md bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {createAIvsAIGame.isPending
                  ? "Creating Battle..."
                  : "Start AI vs AI Battle"}
              </button>

              {createAIvsAIGame.error && (
                <p className="text-sm text-red-600">
                  {createAIvsAIGame.error.message}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mx-auto mt-12 max-w-4xl rounded-lg bg-white p-6 shadow-lg">
          <h2 className="mb-4 text-2xl font-semibold text-gray-800">
            AI Setup Instructions
          </h2>
          <div className="space-y-4 text-gray-600">
            <div>
              <h3 className="mb-2 font-semibold text-gray-800">
                1. Get OpenRouter API Key
              </h3>
              <p className="text-sm">
                Visit{" "}
                <a
                  href="https://openrouter.ai/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  openrouter.ai
                </a>
                , create an account, and get your API key.
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-semibold text-gray-800">
                2. Set Environment Variable
              </h3>
              <p className="text-sm">
                Add{" "}
                <code className="rounded bg-gray-100 px-1">
                  OPENROUTER_API_KEY=your_key_here
                </code>{" "}
                to your <code className="rounded bg-gray-100 px-1">.env</code>{" "}
                file.
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-semibold text-gray-800">
                3. Choose Your Battle
              </h3>
              <p className="text-sm">
                Human vs AI: Play against AI opponents. AI vs AI: Watch
                different AI models compete.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
