# WebSocket Architecture for Codenames

## Overview

The Codenames game has been re-architected to use WebSocket connections for real-time game state updates. This eliminates the need for polling and moves AI orchestration from the frontend to the backend.

## Key Components

### Backend

1. **Socket.IO Server** (`src/server/websocket/socket-server.ts`)
   - Handles WebSocket connections
   - Manages game rooms and event subscriptions
   - Emits game state updates, AI thinking indicators, and game endings

2. **Game Orchestrator** (`src/server/game/game-orchestrator.ts`)
   - Manages all active games
   - Automatically triggers AI moves when it's their turn
   - Emits WebSocket events for game state changes
   - Handles game cleanup after completion

3. **Custom Server** (`server.js`)
   - Required to run Socket.IO with Next.js
   - Integrates the WebSocket server with the Next.js application

### Frontend

1. **Socket Hooks** (`src/hooks/use-socket.ts`)
   - `useSocket()` - Base hook for Socket.IO connection
   - `useGameSocket(gameId)` - Hook for real-time game updates
   - `useGameEndingsSocket()` - Hook for listening to game endings on the main page

## Running the Application

### Development with WebSockets (Default)

```bash
# Run the custom server with Socket.IO support
npm run dev
```

### Development without WebSockets (Fallback Mode)

```bash
# Standard Next.js dev server (polling only, no WebSocket support)
npm run dev:no-socket
```

### Production

```bash
# Build the application
npm run build

# Start with Socket.IO support
npm start
```

## Important Notes

1. **Always use `npm run dev`** for development with WebSocket support
2. The custom server (`server.js`) is required for Socket.IO to work with Next.js
3. When running without the custom server, the app will fall back to polling
4. Socket.IO cannot be deployed on Vercel (use a platform that supports WebSockets)

## Architecture Benefits

1. **Real-time Updates**: Game state changes are pushed to clients immediately
2. **Backend Orchestration**: AI moves are handled server-side, preventing race conditions
3. **Reduced Network Traffic**: No more polling every 2 seconds
4. **Better UX**: Instant feedback for all game actions
5. **Scalable**: Can handle many concurrent games efficiently

## WebSocket Events

### Client to Server Events
- `joinGame(gameId)` - Join a specific game room
- `leaveGame(gameId)` - Leave a game room
- `subscribeToGameEndings()` - Subscribe to all game endings
- `unsubscribeFromGameEndings()` - Unsubscribe from game endings

### Server to Client Events
- `gameStateUpdate(state)` - Partial game state update
- `gameEnded(data)` - Game has ended with winner info
- `aiThinking(data)` - AI is processing their move
- `aiMoveComplete(data)` - AI has completed their move
- `gameError(error)` - An error occurred in the game

## Migration Notes

- The frontend no longer needs to trigger AI moves via `triggerAIMove`
- Game state updates are received via WebSocket instead of polling
- The `useGameSocket` hook provides both game state and AI thinking status
- When WebSocket is unavailable, the app falls back to polling behavior 