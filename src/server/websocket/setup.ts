import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { initializeSocketServer } from "./socket-server";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT ?? "3000", 10);

// Only run this in a standalone server mode, not during build
export async function startCustomServer() {
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();

  await app.prepare();

  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    void handle(req, res, parsedUrl).catch((err) => {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    });
  });

  // Initialize Socket.IO
  const io = initializeSocketServer(httpServer);
  console.log("[WebSocket] Socket.IO server initialized");

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
}

// For development hot-reloading support
let socketServerInitialized = false;

export function ensureSocketServer() {
  if (!socketServerInitialized && typeof window === "undefined") {
    // This is a simplified version for Next.js API routes
    // In production, you'd use the custom server above
    socketServerInitialized = true;
    console.log("[WebSocket] Socket server marked as initialized (API route mode)");
  }
} 