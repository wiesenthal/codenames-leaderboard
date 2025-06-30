'use client';

import { useState } from 'react';
import { api } from '~/trpc/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function HomePage() {
  const [playerNames, setPlayerNames] = useState(['', '', '', '']);
  const router = useRouter();
  
  const createGame = api.game.quickStart.useMutation({
    onSuccess: (data) => {
      // Redirect each player to the game with their player ID
      const redSpymaster = data.players.find(p => p.team === 'red' && p.role === 'spymaster')?.id;
      if (redSpymaster) {
        // Open the game for the first player (red spymaster)
        router.push(`/game/${data.gameId}?playerId=${redSpymaster}`);
      }
    },
  });
  
  const listGames = api.game.listGames.useQuery();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerNames.every(name => name.trim())) {
      createGame.mutate({ playerNames: playerNames.map(name => name.trim()) });
    }
  };
  
  const handlePlayerNameChange = (index: number, value: string) => {
    const newNames = [...playerNames];
    newNames[index] = value;
    setPlayerNames(newNames);
  };
  
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">Codenames Leaderboard</h1>
          <p className="text-xl text-gray-600">AI vs Human vs AI Game Testing Platform</p>
          
          {/* Navigation */}
          <div className="flex justify-center gap-4 mt-6">
            <Link
              href="/ai-game"
              className="px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-semibold transition-colors"
            >
              🤖 Play with AI
            </Link>
            <button
              onClick={() => window.scrollTo({ top: 400, behavior: 'smooth' })}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold transition-colors"
            >
              👥 Human vs Human
            </button>
          </div>
        </div>
        
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Create Game Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Create New Game</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-medium text-red-600 mb-2">Red Team</h3>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Red Spymaster"
                      value={playerNames[0]}
                      onChange={(e) => handlePlayerNameChange(0, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Red Operative"
                      value={playerNames[1]}
                      onChange={(e) => handlePlayerNameChange(1, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-blue-600 mb-2">Blue Team</h3>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Blue Spymaster"
                      value={playerNames[2]}
                      onChange={(e) => handlePlayerNameChange(2, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Blue Operative"
                      value={playerNames[3]}
                      onChange={(e) => handlePlayerNameChange(3, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
              </div>
              
              <button
                type="submit"
                disabled={createGame.isPending || !playerNames.every(name => name.trim())}
                className="w-full px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {createGame.isPending ? 'Creating Game...' : 'Start Game'}
              </button>
              
              {createGame.error && (
                <p className="text-red-600 text-sm">{createGame.error.message}</p>
              )}
            </form>
            
            {createGame.isSuccess && (
              <div className="mt-4 p-4 bg-green-100 rounded-md">
                <p className="text-green-800 font-medium">Game Created Successfully!</p>
                <p className="text-green-700 text-sm mt-1">Share these links with players:</p>
                <div className="mt-2 space-y-1 text-xs">
                  {createGame.data?.players.map((player) => (
                    <div key={player.id} className="bg-white p-2 rounded border">
                      <strong>{player.name}</strong> ({player.team} {player.role}):
                      <br />
                      <code className="text-blue-600">
                        {window.location.origin}/game/{createGame.data?.gameId}?playerId={player.id}
                      </code>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Active Games Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Active Games</h2>
            
            {listGames.isLoading && (
              <p className="text-gray-600">Loading games...</p>
            )}
            
            {listGames.data && listGames.data.length === 0 && (
              <p className="text-gray-600">No active games found.</p>
            )}
            
            {listGames.data && listGames.data.length > 0 && (
              <div className="space-y-3">
                {listGames.data.map((game) => (
                  <div key={game.id} className="border border-gray-200 rounded-md p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-gray-800">Game {game.id.slice(-6)}</p>
                        <p className="text-sm text-gray-600">
                          Current: <span className={game.currentTeam === 'red' ? 'text-red-600' : 'text-blue-600'}>
                            {game.currentTeam} team
                          </span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600 capitalize">{game.currentPhase?.replace('-', ' ')}</p>
                        {game.winner && (
                          <p className={`text-sm font-medium ${game.winner === 'red' ? 'text-red-600' : 'text-blue-600'}`}>
                            {game.winner.toUpperCase()} WINS
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      <p>Players: {game.players.map(p => `${p.name} (${p.team} ${p.role})`).join(', ')}</p>
                      <p>Started: {new Date(game.createdAt).toLocaleString()}</p>
                    </div>
                    
                    <div className="mt-3">
                      <button
                        onClick={() => router.push(`/game/${game.id}`)}
                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                      >
                        View Game →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <button
              onClick={() => listGames.refetch()}
              disabled={listGames.isFetching}
              className="mt-4 w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              {listGames.isFetching ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
        
        {/* Instructions */}
        <div className="max-w-4xl mx-auto mt-12 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">How to Play</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-600">
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">For Spymasters:</h3>
              <ul className="space-y-1 text-sm">
                <li>• See all card colors on the board</li>
                <li>• Give one-word clues with a number</li>
                <li>• Help your team find your agents</li>
                <li>• Avoid the assassin at all costs!</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">For Operatives:</h3>
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
