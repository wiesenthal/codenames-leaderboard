"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { api } from "~/trpc/react";
import type { Player, Card, GameState } from "~/lib/codenames/types";
import Link from "next/link";
import { useGameSocket } from "~/hooks/use-socket";

export default function GamePage() {
  const params = useParams();
  const gameId = params.id as string;

  const [clueWord, setClueWord] = useState("");
  const [clueCount, setClueCount] = useState(1);
  const [playerId, setPlayerId] = useState("");
  const [isSpectating, setIsSpectating] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);

  // Get game state
  const { data: gameState, refetch } = api.game.getGame.useQuery(
    { gameId, playerId: playerId || "spectator" },
    { enabled: !!gameId, refetchInterval: 2000 },
  );

  // Mutations
  const giveClue = api.game.giveClue.useMutation({
    onSuccess: () => {
      setClueWord("");
      setClueCount(1);
      void refetch();
    },
  });

  const makeGuess = api.game.makeGuess.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  const passTurn = api.game.passTurn.useMutation({
    onSuccess: () => void refetch(),
  });

  // AI moves are now handled by the backend via WebSockets
  // const triggerAIMove = api.ai.triggerAIMove.useMutation({
  //   onSuccess: (data) => {
  //     console.log("AI Move Result:", data);
  //     setAiThinking(false);
  //     void refetch();
  //   },
  //   onError: (error) => {
  //     console.error("AI Move Error:", error);
  //     setAiThinking(false);
  //   },
  // });

  // Set player ID from URL or localStorage
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlPlayerId = urlParams.get("playerId");
    const spectate = urlParams.get("spectate");

    if (spectate === "true") {
      setIsSpectating(true);
    } else if (urlPlayerId) {
      setPlayerId(urlPlayerId);
      localStorage.setItem("codenames-player-id", urlPlayerId);
    } else {
      const storedPlayerId = localStorage.getItem("codenames-player-id");
      if (storedPlayerId) {
        setPlayerId(storedPlayerId);
      }
    }
  }, []);

  // Use WebSocket for real-time game updates
  const {
    gameState: socketGameState,
    aiThinking: socketAiThinking,
    connected: socketConnected,
  } = useGameSocket(gameId);

  // Prefer WebSocket state over polling state when available
  const currentGameState =
    socketConnected && socketGameState ? socketGameState : gameState;

  // Use WebSocket AI thinking state
  useEffect(() => {
    if (socketConnected) {
      setAiThinking(socketAiThinking);
    }
  }, [socketAiThinking, socketConnected]);

  if (!currentGameState) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading game...</p>
          {!playerId && !isSpectating && (
            <div className="mt-4">
              <p className="text-sm text-gray-500">
                No player ID found. Add ?playerId=your-id to the URL
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const currentPlayer = currentGameState.players?.find(
    (p: Player) => p.id === playerId,
  );
  const isMyTurn = currentPlayer?.team === currentGameState.currentTeam;
  const canGiveClue =
    isMyTurn &&
    currentPlayer?.role === "spymaster" &&
    currentGameState.currentPhase === "giving-clue";
  const canGuess =
    isMyTurn &&
    currentPlayer?.role === "operative" &&
    currentGameState.currentPhase === "guessing";

  // Get current AI player info
  const currentAIPlayer = currentGameState.players?.find(
    (p) =>
      p.team === currentGameState.currentTeam &&
      p.type === "ai" &&
      ((currentGameState.currentPhase === "giving-clue" &&
        p.role === "spymaster") ||
        (currentGameState.currentPhase === "guessing" &&
          p.role === "operative")),
  );

  const handleClueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (clueWord.trim() && clueCount > 0) {
      giveClue.mutate({
        gameId,
        playerId,
        word: clueWord.trim(),
        count: clueCount,
      });
    }
  };

  const handleCardClick = (cardIndex: number) => {
    if (canGuess && !currentGameState.cards?.[cardIndex]?.revealed) {
      makeGuess.mutate({
        gameId,
        playerId,
        cardIndex,
      });
    }
  };

  const getCardClassName = (card: Card) => {
    let baseClass =
      "aspect-square border-2 border-gray-300 rounded-lg flex items-center justify-center text-sm font-semibold cursor-pointer transition-all duration-200 ";

    if (card.revealed) {
      switch (card.type) {
        case "red":
          baseClass += "bg-red-500 text-white border-red-600";
          break;
        case "blue":
          baseClass += "bg-blue-500 text-white border-blue-600";
          break;
        case "neutral":
          baseClass += "bg-gray-300 text-gray-700 border-gray-400";
          break;
        case "assassin":
          baseClass += "bg-black text-white border-gray-800";
          break;
      }
    } else {
      // Unrevealed cards
      if (currentPlayer?.role === "spymaster" || isSpectating) {
        // Spymasters and spectators can see the types
        switch (card.type) {
          case "red":
            baseClass += "bg-red-100 border-red-300 text-red-800";
            break;
          case "blue":
            baseClass += "bg-blue-100 border-blue-300 text-blue-800";
            break;
          case "neutral":
            baseClass += "bg-gray-100 border-gray-300 text-gray-600";
            break;
          case "assassin":
            baseClass += "bg-gray-800 border-gray-900 text-white";
            break;
        }
      } else {
        baseClass += "bg-yellow-50 hover:bg-yellow-100 text-gray-800";
      }
    }

    if (canGuess && !card.revealed) {
      baseClass += " hover:scale-105 hover:shadow-md";
    } else if (!canGuess || card.revealed) {
      baseClass += " cursor-not-allowed";
    }

    return baseClass;
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 p-4">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-800">Codenames</h1>
            <div className="text-right">
              <p className="text-sm text-gray-600">Game ID: {gameId}</p>
              {isSpectating ? (
                <p className="text-sm text-gray-600">👁️ Spectating</p>
              ) : (
                <p className="text-sm text-gray-600">
                  You: {currentPlayer?.name} ({currentPlayer?.role})
                </p>
              )}
            </div>
          </div>

          {/* Game Status */}
          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="text-center">
              <p className="text-sm text-gray-600">Current Turn</p>
              <p
                className={`text-lg font-semibold ${currentGameState.currentTeam === "red" ? "text-red-600" : "text-blue-600"}`}
              >
                {currentGameState.currentTeam?.toUpperCase()} TEAM
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Phase</p>
              <p className="text-lg font-semibold capitalize">
                {currentGameState.currentPhase?.replace("-", " ")}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Remaining Agents</p>
              <p className="text-lg">
                <span className="font-semibold text-red-600">
                  Red: {currentGameState.redAgentsRemaining}
                </span>
                {" | "}
                <span className="font-semibold text-blue-600">
                  Blue: {currentGameState.blueAgentsRemaining}
                </span>
              </p>
            </div>
          </div>

          {/* Players */}
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <h3 className="mb-1 text-sm font-medium text-red-600">
                Red Team
              </h3>
              <div className="space-y-1 text-xs">
                {currentGameState.players
                  ?.filter((p) => p.team === "red")
                  .map((p) => (
                    <div key={p.id} className="flex items-center">
                      {p.type === "ai" ? "🤖" : "👤"} {p.name} ({p.role})
                      {p.aiModel && (
                        <span className="ml-1 text-gray-500">
                          - {p.aiModel}
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
            <div>
              <h3 className="mb-1 text-sm font-medium text-blue-600">
                Blue Team
              </h3>
              <div className="space-y-1 text-xs">
                {currentGameState.players
                  ?.filter((p) => p.team === "blue")
                  .map((p) => (
                    <div key={p.id} className="flex items-center">
                      {p.type === "ai" ? "🤖" : "👤"} {p.name} ({p.role})
                      {p.aiModel && (
                        <span className="ml-1 text-gray-500">
                          - {p.aiModel}
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {!currentGameState.winner && (
            <>
              {/* Activity Indicator */}
              <div className="mb-4 rounded-lg border border-purple-300 bg-purple-100 p-3">
                <div className="flex items-center">
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-purple-600"></div>
                  <p className="text-purple-800">
                    {currentAIPlayer && aiThinking
                      ? `🤖 ${currentAIPlayer.name} is thinking...`
                      : "..."}
                  </p>
                </div>
              </div>
              {/* Current Clue */}
              <div className="mb-4 rounded-lg bg-gray-50 p-4">
                <p className="h-6 text-center">
                  {currentGameState.currentClue && (
                    <>
                      <span className="text-sm text-gray-600">
                        Current Clue:{" "}
                      </span>
                      <span className="text-lg font-semibold">
                        &quot;{currentGameState.currentClue.word.toUpperCase()}
                        &quot; - {currentGameState.currentClue.count}
                      </span>
                      <span className="ml-2 text-sm text-gray-600">
                        ({currentGameState.remainingGuesses} guesses left)
                      </span>
                    </>
                  )}
                </p>
              </div>
            </>
          )}

          {/* Winner */}
          {currentGameState.winner && (
            <div
              className={`mb-4 flex flex-col gap-2 rounded-lg p-4 text-center ${currentGameState.winner === "red" ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"}`}
            >
              <h2 className="text-2xl font-bold">
                {currentGameState.winner.toUpperCase()} TEAM WINS!
              </h2>
              <Link
                href="/"
                className="mx-auto mt-4 rounded-md bg-violet-600 px-6 py-2 text-white hover:bg-violet-700 disabled:opacity-50"
              >
                🏠 Home
              </Link>
            </div>
          )}
        </div>

        {/* Game Board */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
          <div className="mb-6 grid grid-cols-5 gap-3">
            {currentGameState.cards?.map((card, index) => (
              <div
                key={index}
                className={getCardClassName(card)}
                onClick={() => handleCardClick(index)}
              >
                <span className="px-2 text-center">{card.word}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Panel */}
        <div className="rounded-lg bg-white p-6 shadow-md">
          {canGiveClue && (
            <div>
              <h3 className="mb-4 text-lg font-semibold">Give a Clue</h3>
              <form
                onSubmit={handleClueSubmit}
                className="flex items-end gap-4"
              >
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Clue Word
                  </label>
                  <input
                    type="text"
                    value={clueWord}
                    onChange={(e) => setClueWord(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Enter your clue..."
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Count
                  </label>
                  <select
                    value={clueCount}
                    onChange={(e) => setClueCount(parseInt(e.target.value))}
                    className="rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                      <option key={num} value={num}>
                        {num}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={giveClue.isPending}
                  className="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {giveClue.isPending ? "Giving..." : "Give Clue"}
                </button>
              </form>
              {giveClue.error && (
                <p className="mt-2 text-sm text-red-600">
                  {giveClue.error.message}
                </p>
              )}
            </div>
          )}

          {canGuess && (
            <div>
              <h3 className="mb-4 text-lg font-semibold">Make Your Guess</h3>
              <p className="mb-4 text-gray-600">
                Click on a card to guess it. You have{" "}
                {currentGameState.remainingGuesses} guesses remaining.
              </p>
              <button
                onClick={() => passTurn.mutate({ gameId, playerId })}
                disabled={passTurn.isPending}
                className="rounded-md bg-gray-600 px-6 py-2 text-white hover:bg-gray-700 disabled:opacity-50"
              >
                {passTurn.isPending ? "Passing..." : "Pass Turn"}
              </button>
              {makeGuess.error && (
                <p className="mt-2 text-sm text-red-600">
                  {makeGuess.error.message}
                </p>
              )}
            </div>
          )}

          {!isMyTurn &&
            currentGameState.currentPhase !== "game-over" &&
            !isSpectating && (
              <div className="text-center">
                <p className="text-gray-600">
                  Waiting for {currentGameState.currentTeam} team...
                </p>
              </div>
            )}

          {isSpectating && currentGameState.currentPhase !== "game-over" && (
            <div className="text-center">
              <p className="text-gray-600">
                👁️ Spectating - {currentGameState.currentTeam} team&apos;s turn
              </p>
              {currentAIPlayer && (
                <p className="mt-2 text-sm text-gray-500">
                  Current player: {currentAIPlayer.name} ({currentAIPlayer.role}
                  )
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      <Link
        href="/"
        className="mx-auto mt-4 rounded-md bg-violet-600 px-6 py-2 text-white hover:bg-violet-700 disabled:opacity-50"
      >
        🏠 Home
      </Link>
    </div>
  );
}
