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

app.prepare().then(() => {
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

    socket.on("joinGame", (gameId) => {
      console.log(`[Socket] Client ${socket.id} joining game ${gameId}`);
      socket.join(`game:${gameId}`);
      socket.data.gameId = gameId;
    });

    socket.on("leaveGame", (gameId) => {
      console.log(`[Socket] Client ${socket.id} leaving game ${gameId}`);
      socket.leave(`game:${gameId}`);
      socket.data.gameId = undefined;
    });

    socket.on("subscribeToGameEndings", () => {
      console.log(`[Socket] Client ${socket.id} subscribing to game endings`);
      socket.join("game-endings");
    });

    socket.on("unsubscribeFromGameEndings", () => {
      console.log(`[Socket] Client ${socket.id} unsubscribing from game endings`);
      socket.leave("game-endings");
    });

    socket.on("disconnect", () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Socket.IO server running`);
  });
}); 