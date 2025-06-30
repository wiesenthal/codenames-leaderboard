import { useEffect, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import type { 
  ServerToClientEvents, 
  ClientToServerEvents
} from "~/server/websocket/socket-server";
import type { GameState, Team } from "~/lib/codenames/types";

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3000";

export function useSocket() {
  const [socket, setSocket] = useState<TypedSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<TypedSocket | null>(null);

  useEffect(() => {
    // Create socket connection
    const socketInstance = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    }) as TypedSocket;

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    socketInstance.on("connect", () => {
      console.log("[Socket] Connected to server");
      setConnected(true);
    });

    socketInstance.on("disconnect", () => {
      console.log("[Socket] Disconnected from server");
      setConnected(false);
    });

    // Cleanup on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return { socket, connected };
}

// Hook for game-specific socket connection
export function useGameSocket(gameId: string | undefined) {
  const { socket, connected } = useSocket();
  const [gameState, setGameState] = useState<Partial<GameState> | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const currentGameIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!socket || !connected || !gameId) return;

    // Only join if it's a different game
    if (currentGameIdRef.current !== gameId) {
      // Leave previous game if any
      if (currentGameIdRef.current) {
        socket.emit("leaveGame", currentGameIdRef.current);
      }
      
      // Join new game
      socket.emit("joinGame", gameId);
      currentGameIdRef.current = gameId;
    }

    // Set up event listeners
    const handleGameStateUpdate = (state: Partial<GameState>) => {
      console.log("[Socket] Game state updated", state);
      setGameState(state);
    };

    const handleAIThinking = (data: { playerId: string; playerName: string }) => {
      console.log(`[Socket] AI thinking: ${data.playerName}`);
      setAiThinking(true);
    };

    const handleAIMoveComplete = (data: { playerId: string; action: string }) => {
      console.log(`[Socket] AI move complete: ${data.action}`);
      setAiThinking(false);
    };

    const handleGameEnded = (data: { gameId: string; winner: Team; players: Array<{ name: string; team: Team; role: string; type: string }> }) => {
      console.log(`[Socket] Game ended: ${data.winner} wins!`);
    };

    const handleGameError = (error: { message: string; code?: string }) => {
      console.error("[Socket] Game error:", error);
      setAiThinking(false);
    };

    socket.on("gameStateUpdate", handleGameStateUpdate);
    socket.on("aiThinking", handleAIThinking);
    socket.on("aiMoveComplete", handleAIMoveComplete);
    socket.on("gameEnded", handleGameEnded);
    socket.on("gameError", handleGameError);

    // Cleanup listeners
    return () => {
      socket.off("gameStateUpdate", handleGameStateUpdate);
      socket.off("aiThinking", handleAIThinking);
      socket.off("aiMoveComplete", handleAIMoveComplete);
      socket.off("gameEnded", handleGameEnded);
      socket.off("gameError", handleGameError);
    };
  }, [socket, connected, gameId]);

  useEffect(() => {
    // Leave game on unmount
    return () => {
      if (socket && connected && currentGameIdRef.current) {
        socket.emit("leaveGame", currentGameIdRef.current);
      }
    };
  }, [socket, connected]);

  return { socket, connected, gameState, aiThinking };
}

// Hook for main page to listen to game endings
export function useGameEndingsSocket() {
  const { socket, connected } = useSocket();
  const [recentGameEndings, setRecentGameEndings] = useState<Array<{
    gameId: string;
    winner: Team;
    players: Array<{ name: string; team: Team; role: string; type: string }>;
    timestamp: Date;
  }>>([]);

  useEffect(() => {
    if (!socket || !connected) return;

    socket.emit("subscribeToGameEndings");

    const handleGameEnded = (data: { 
      gameId: string; 
      winner: Team;
      players: Array<{ name: string; team: Team; role: string; type: string }>;
    }) => {
      console.log(`[Socket] Game ${data.gameId} ended: ${data.winner} wins!`);
      setRecentGameEndings(prev => [
        { ...data, timestamp: new Date() },
        ...prev.slice(0, 9) // Keep last 10 games
      ]);
    };

    socket.on("gameEnded", handleGameEnded);

    return () => {
      socket.off("gameEnded", handleGameEnded);
      socket.emit("unsubscribeFromGameEndings");
    };
  }, [socket, connected]);

  return { recentGameEndings };
} 