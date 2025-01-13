import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocket, WebSocketServer } from 'ws';
import { AgentManager } from './simulation/AgentManager';

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Initialize WebSocket server for real-time agent updates
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: "/ws",
    perMessageDeflate: false // Disable compression for better performance
  });

  // Initialize agent simulation manager
  const agentManager = new AgentManager();

  // Handle WebSocket connections
  wss.on('connection', (ws: WebSocket) => {
    // Skip Vite HMR connections
    if (ws.protocol === 'vite-hmr') {
      console.log('Ignoring Vite HMR connection');
      return;
    }

    console.log('New simulation client connected');
    agentManager.addClient(ws);

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    ws.on('close', () => {
      console.log('Client disconnected');
    });
  });

  // Clean up on server shutdown
  httpServer.on('close', () => {
    console.log('Server shutting down, cleaning up simulation...');
    agentManager.cleanup();
    wss.close();
  });

  return httpServer;
}