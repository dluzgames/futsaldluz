import express from "express";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";

async function startServer() {
  const app = express();
  const server = createServer(app);
  const PORT = 3000;

  // WebSocket Server
  const wss = new WebSocketServer({ server });

  interface BoardState {
    players: any[];
    ball: any;
    drawings: any[];
    frames: any[];
    isAnimating: boolean;
  }

  interface Tactic {
    id: string;
    name: string;
    state: BoardState;
    createdAt: string;
  }

  let boardState: BoardState = {
    players: [
      // Team A (Blue)
      { id: 'a1', x: 0.1, y: 0.5, color: '#3b82f6', number: '1', team: 'A' },
      { id: 'a2', x: 0.25, y: 0.2, color: '#3b82f6', number: '2', team: 'A' },
      { id: 'a3', x: 0.25, y: 0.8, color: '#3b82f6', number: '3', team: 'A' },
      { id: 'a4', x: 0.4, y: 0.5, color: '#3b82f6', number: '4', team: 'A' },
      { id: 'a5', x: 0.05, y: 0.5, color: '#3b82f6', number: 'GK', team: 'A' },
      // Team B (Red)
      { id: 'b1', x: 0.9, y: 0.5, color: '#ef4444', number: '1', team: 'B' },
      { id: 'b2', x: 0.75, y: 0.2, color: '#ef4444', number: '2', team: 'B' },
      { id: 'b3', x: 0.75, y: 0.8, color: '#ef4444', number: '3', team: 'B' },
      { id: 'b4', x: 0.6, y: 0.5, color: '#ef4444', number: '4', team: 'B' },
      { id: 'b5', x: 0.95, y: 0.5, color: '#ef4444', number: 'GK', team: 'B' },
    ],
    ball: { x: 0.5, y: 0.5 },
    drawings: [],
    frames: [],
    isAnimating: false
  };

  let savedTactics: Tactic[] = [];

  wss.on("connection", (ws) => {
    console.log("Client connected");
    
    // Send initial state
    ws.send(JSON.stringify({ type: "init", state: boardState, savedTactics }));

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === "update") {
          boardState = { ...boardState, ...message.state };
          // Broadcast to all other clients
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: "update", state: boardState }));
            }
          });
        } else if (message.type === "save_tactic") {
          const newTactic: Tactic = {
            id: Date.now().toString(),
            name: message.name || `Tática ${savedTactics.length + 1}`,
            state: JSON.parse(JSON.stringify(boardState)),
            createdAt: new Date().toISOString()
          };
          savedTactics.push(newTactic);
          // Broadcast new tactics list to all
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: "tactics_updated", savedTactics }));
            }
          });
        } else if (message.type === "delete_tactic") {
          savedTactics = savedTactics.filter(t => t.id !== message.id);
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: "tactics_updated", savedTactics }));
            }
          });
        } else if (message.type === "play_animation") {
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: "play_animation" }));
            }
          });
        }
      } catch (e) {
        console.error("Error parsing message", e);
      }
    });
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
