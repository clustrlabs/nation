import { WebSocket } from 'ws';
import { WorldState } from './WorldState';
import { Agent } from '../../client/src/lib/simulation/Agent';
import { performance } from 'perf_hooks';

const UPDATE_INTERVAL = 16; // ~60fps for smoother updates
const BROADCAST_INTERVAL = 64; // Reduced frequency (was 32)
const PING_INTERVAL = 30000; // 30 seconds
const MAX_MISSED_PINGS = 3;

interface ClientState {
  isAlive: boolean;
  missedPings: number;
  lastBroadcastTime: number;
  lastState: string; // Cache last sent state
}

export class AgentManager {
  private worldState: WorldState;
  private clients: Map<WebSocket, ClientState>;
  private updateInterval: NodeJS.Timeout;
  private broadcastInterval: NodeJS.Timeout;
  private pingInterval: NodeJS.Timeout;
  private lastUpdateTime: number = performance.now();
  private isCleaningUp: boolean = false;

  constructor() {
    this.worldState = new WorldState();
    this.clients = new Map();

    this.updateInterval = setInterval(() => {
      this.update();
    }, UPDATE_INTERVAL);

    this.broadcastInterval = setInterval(() => {
      this.broadcastState();
    }, BROADCAST_INTERVAL);

    this.pingInterval = setInterval(() => {
      this.pingClients();
    }, PING_INTERVAL);

    console.log('AgentManager initialized with optimized network usage');
  }

  private pingClients() {
    if (this.isCleaningUp) return;

    const now = Date.now();
    this.clients.forEach((state, client) => {
      if (client.readyState === WebSocket.OPEN) {
        if (!state.isAlive) {
          state.missedPings++;
          if (state.missedPings >= MAX_MISSED_PINGS) {
            console.log('Client exceeded maximum missed pings, closing connection');
            this.removeClient(client);
            return;
          }
        }

        // Check for stale connections
        if (now - state.lastBroadcastTime > PING_INTERVAL * 2) {
          console.log('Client connection stale, closing');
          this.removeClient(client);
          return;
        }

        state.isAlive = false;
        try {
          client.ping();
        } catch (err) {
          console.error('Error pinging client:', err);
          this.removeClient(client);
        }
      } else {
        this.removeClient(client);
      }
    });
  }

  private removeClient(ws: WebSocket) {
    console.log('Removing client connection');
    try {
      ws.terminate();
    } catch (err) {
      console.error('Error terminating client:', err);
    }
    this.clients.delete(ws);
  }

  addClient(ws: WebSocket) {
    // Skip Vite HMR connections
    if (ws.protocol === 'vite-hmr') {
      console.log('Ignoring Vite HMR connection');
      return;
    }

    console.log('New simulation client connected');
    this.clients.set(ws, {
      isAlive: true,
      missedPings: 0,
      lastBroadcastTime: Date.now(),
      lastState: ''
    });

    // Send initial state immediately to new client
    const state = {
      agents: this.worldState.getAgentData(),
      timestamp: Date.now()
    };

    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(state));
      } catch (err) {
        console.error('Error sending initial state:', err);
        this.removeClient(ws);
        return;
      }
    }

    ws.on('pong', () => {
      const clientState = this.clients.get(ws);
      if (clientState) {
        clientState.isAlive = true;
        clientState.missedPings = 0;
        clientState.lastBroadcastTime = Date.now();
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.removeClient(ws);
    });

    ws.on('close', () => {
      console.log('Client disconnected');
      this.removeClient(ws);
    });
  }

  private update() {
    if (this.isCleaningUp) return;

    const now = performance.now();
    const deltaTime = Math.min(now - this.lastUpdateTime, 32); // Cap delta time at 32ms
    this.lastUpdateTime = now;

    try {
      this.worldState.update(deltaTime);
    } catch (err) {
      console.error('Error updating world state:', err);
    }
  }

  private broadcastState() {
    if (this.isCleaningUp || this.clients.size === 0) return;

    const state = {
      agents: this.worldState.getAgentData(),
      timestamp: Date.now()
    };

    const stateStr = JSON.stringify(state);
    const now = Date.now();

    for (const [client, clientState] of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          // Only send if state has changed
          if (stateStr !== clientState.lastState) {
            client.send(stateStr);
            clientState.lastState = stateStr;
            clientState.lastBroadcastTime = now;
          }
        } catch (err) {
          console.error('Error sending state to client:', err);
          this.removeClient(client);
        }
      }
    }
  }

  cleanup() {
    console.log('Cleaning up AgentManager...');
    this.isCleaningUp = true;

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
    }
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    for (const [client] of this.clients) {
      this.removeClient(client);
    }
    this.clients.clear();
  }
}