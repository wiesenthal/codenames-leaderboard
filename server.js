// @ts-nocheck
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

// Create the Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url || "", true);
    handle(req, res, parsedUrl).catch((err) => {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    });
  });

  // Initialize Socket.IO
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: dev ? ["http://localhost:3000"] : false,
      credentials: true,
    },
  });

  // Make io globally available for the orchestrator
  global.io = io;

  // Set up Socket.IO event handlers
  io.on("connection", (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    socket.on("joinGame", async (gameId) => {
      console.log(
        `server.js [Socket] Client ${socket.id} joining game ${gameId}`,
      );
      void socket.join(`game:${gameId}`);
      socket.data.gameId = gameId;
    });

    socket.on("leaveGame", (gameId) => {
      console.log(
        `server.js [Socket] Client ${socket.id} leaving game ${gameId}`,
      );
      void socket.leave(`game:${gameId}`);
      socket.data.gameId = undefined;
    });

    socket.on("subscribeToGameEndings", () => {
      console.log(
        `server.js [Socket] Client ${socket.id} subscribing to game endings`,
      );
      void socket.join("game-endings");
    });

    socket.on("unsubscribeFromGameEndings", () => {
      console.log(
        `server.js [Socket] Client ${socket.id} unsubscribing from game endings`,
      );
      void socket.leave("game-endings");
    });

    socket.on(
      "takeAction",
      async (
        action,
        callback,
      ) => {
        console.log(
          `server.js [Socket] Client ${socket.id} taking action: ${JSON.stringify(action)}`,
        );
        const gameId = socket.data.gameId;
        if (!gameId) {
          console.error(
            `server.js [Socket] Client ${socket.id} not in a game`,
          );
          callback({ success: false, error: "Not in a game" });
          return;
        }
        const gameEngine = await global.__gameOrchestrator.getGameEngine(gameId);

        // check that the client is the current player
        const currentPlayer = await gameEngine.getCurrentPlayer();
        if (currentPlayer?.id !== socket.id) {
          console.error(
            `server.js [Socket] Client ${socket.id} is not the current player`,
          );
          callback({ success: false, error: "Not the current player" });
          return;
        }

        const result = await gameEngine.takeAction(action);
        if (!result.success) {
          console.error(`[Socket] Failed to take action: ${result.error}`);
          callback({ success: false, error: result.error });
          return;
        }
        callback({ success: true });
      },
    );

    socket.on("disconnect", () => {
      console.log(
        `server.js [Socket] Client disconnected: ${socket.id}`,
      );
    });
  });
  console.log("[WebSocket] Socket.IO server initialized");

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Socket.IO server running`);
  });
}); 