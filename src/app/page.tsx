"use client";

import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";
import { useRefetchAIMoves } from "~/hooks/useRefetchAIMoves";

export default function HomePage() {
  const router = useRouter();

  const listGames = api.game.listGames.useQuery();

  const deleteGame = api.game.deleteGame.useMutation({
    onSuccess: () => void listGames.refetch(),
  });

  useRefetchAIMoves();

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-5xl font-bold text-gray-800">
            Codenames Leaderboard
          </h1>
          <p className="text-xl text-gray-600">
            AI vs Human vs AI Game Testing Platform
          </p>

          {/* Navigation */}
          <div className="mt-6 flex justify-center gap-4">
            <Link
              href="/ai-game"
              className="rounded-md bg-purple-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-purple-700"
            >
              🤖 Create Game
            </Link>
          </div>
        </div>

        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8">
          {/* Active Games Section */}
          <div className="rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-6 text-2xl font-semibold text-gray-800">
              Active Games
            </h2>

            {listGames.isLoading && (
              <p className="text-gray-600">Loading games...</p>
            )}

            {listGames.data && listGames.data.length === 0 && (
              <p className="text-gray-600">No active games found.</p>
            )}

            {listGames.data && listGames.data.length > 0 && (
              <div className="space-y-3">
                {listGames.data.map((game) => (
                  <div
                    key={game.id}
                    className="rounded-md border border-gray-200 p-4"
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-800">
                          Game {game.id.slice(-6)}
                        </p>
                        <p className="text-sm text-gray-600">
                          Current:{" "}
                          <span
                            className={
                              game.gameState.currentTeam === "red"
                                ? "text-red-600"
                                : "text-blue-600"
                            }
                          >
                            {game.gameState.currentTeam} team
                          </span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600 capitalize">
                          {game.gameState.currentPhase?.replace("-", " ")}
                        </p>
                        {game.gameState.winner && (
                          <p
                            className={`text-sm font-medium ${game.gameState.winner === "red" ? "text-red-600" : "text-blue-600"}`}
                          >
                            {game.gameState.winner.toUpperCase()} WINS
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-gray-500">
                      <p>
                        Players:{" "}
                        {game.players
                          .map((p) => `${p.name} (${p.team} ${p.data.role})`)
                          .join(", ")}
                      </p>
                      <p>
                        Started: {new Date(game.startedAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="mt-3 flex justify-between">
                      <button
                        onClick={() => router.push(`/game/${game.id}`)}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        View Game →
                      </button>
                      <button
                        onClick={() => deleteGame.mutate({ gameId: game.id })}
                        disabled={deleteGame.isPending}
                        className="ml-3 text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        {deleteGame.isPending ? "Archiving..." : "Archive"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => listGames.refetch()}
              disabled={listGames.isFetching}
              className="mt-4 w-full rounded-md border border-gray-300 px-4 py-2 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              {listGames.isFetching ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="mx-auto mt-12 max-w-4xl rounded-lg bg-white p-6 shadow-lg">
          <h2 className="mb-4 text-2xl font-semibold text-gray-800">
            How to Play
          </h2>
          <div className="grid grid-cols-1 gap-6 text-gray-600 md:grid-cols-2">
            <div>
              <h3 className="mb-2 font-semibold text-gray-800">
                For Spymasters:
              </h3>
              <ul className="space-y-1 text-sm">
                <li>• See all card colors on the board</li>
                <li>• Give one-word clues with a number</li>
                <li>• Help your team find your agents</li>
                <li>• Avoid the assassin at all costs!</li>
              </ul>
            </div>
            <div>
              <h3 className="mb-2 font-semibold text-gray-800">
                For Operatives:
              </h3>
              <ul className="space-y-1 text-sm">
                <li>• Listen to your spymaster&apos;s clues</li>
                <li>• Click cards to make guesses</li>
                <li>• Find all your team&apos;s agents first</li>
                <li>• Pass your turn when unsure</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
