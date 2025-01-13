interface AgentState {
  id: string;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  state: string;
  characteristics: {
    energy: number;
    speed: number;
    influence: number;
    age: number;
    status: 'active' | 'resting' | 'moving';
    lastUpdated: string;
  };
}

export class WorldState {
  private agents: Map<string, AgentState>;
  private readonly INITIAL_AGENTS = 1000;
  private readonly MAX_SPEED = 0.01; // Increased from 0.005 for faster movement
  private readonly WORLD_WIDTH = 20;
  private readonly WORLD_HEIGHT = 12;
  private readonly DAMPING = 0.98; // Slightly reduced damping for more movement
  private readonly MIN_MOVEMENT_THRESHOLD = 0.0001;

  constructor() {
    this.agents = new Map();
    this.initializeAgents();
  }

  private initializeAgents() {
    for (let i = 0; i < this.INITIAL_AGENTS; i++) {
      const id = `agent-${i}`;
      this.agents.set(id, {
        id,
        position: {
          x: (Math.random() - 0.5) * this.WORLD_WIDTH,
          y: (Math.random() - 0.5) * this.WORLD_HEIGHT
        },
        velocity: {
          x: (Math.random() - 0.5) * this.MAX_SPEED,
          y: (Math.random() - 0.5) * this.MAX_SPEED
        },
        state: 'active',
        characteristics: {
          energy: Math.random() * 100,
          speed: Math.random() * 100,
          influence: Math.random() * 100,
          age: Math.floor(Math.random() * 100),
          status: 'active',
          lastUpdated: new Date().toISOString()
        }
      });
    }
  }

  update(deltaTime: number) {
    const timeScale = Math.min(deltaTime / 16.667, 2.0);

    this.agents.forEach(agent => {
      // Increased acceleration for more dynamic movement
      const acceleration = {
        x: (Math.random() - 0.5) * this.MAX_SPEED * 0.2, // Increased from 0.1
        y: (Math.random() - 0.5) * this.MAX_SPEED * 0.2  // Increased from 0.1
      };

      // Update velocity with time-scaled values
      agent.velocity.x = (agent.velocity.x + acceleration.x * timeScale) * this.DAMPING;
      agent.velocity.y = (agent.velocity.y + acceleration.y * timeScale) * this.DAMPING;

      // Apply minimum movement threshold
      if (Math.abs(agent.velocity.x) < this.MIN_MOVEMENT_THRESHOLD) {
        agent.velocity.x = 0;
      }
      if (Math.abs(agent.velocity.y) < this.MIN_MOVEMENT_THRESHOLD) {
        agent.velocity.y = 0;
      }

      // Update position with time-scaled velocity
      agent.position.x += agent.velocity.x * timeScale;
      agent.position.y += agent.velocity.y * timeScale;

      // Smooth boundary handling
      if (Math.abs(agent.position.x) > this.WORLD_WIDTH/2) {
        const overshoot = Math.abs(agent.position.x) - this.WORLD_WIDTH/2;
        agent.velocity.x = -agent.velocity.x * 0.5;
        agent.position.x = Math.sign(agent.position.x) * (this.WORLD_WIDTH/2 - overshoot * 0.5);
      }
      if (Math.abs(agent.position.y) > this.WORLD_HEIGHT/2) {
        const overshoot = Math.abs(agent.position.y) - this.WORLD_HEIGHT/2;
        agent.velocity.y = -agent.velocity.y * 0.5;
        agent.position.y = Math.sign(agent.position.y) * (this.WORLD_HEIGHT/2 - overshoot * 0.5);
      }

      // Update characteristics smoothly
      agent.characteristics.energy = Math.max(0, Math.min(100, 
        agent.characteristics.energy + (Math.random() - 0.5) * 0.2 * timeScale
      ));
      agent.characteristics.age += 0.01 * timeScale;

      // Calculate speed for status
      const speed = Math.sqrt(
        agent.velocity.x * agent.velocity.x + 
        agent.velocity.y * agent.velocity.y
      );

      // Update status based on speed and energy
      agent.characteristics.status = speed > this.MIN_MOVEMENT_THRESHOLD 
        ? 'moving' 
        : (agent.characteristics.energy > 50 ? 'active' : 'resting');

      agent.characteristics.lastUpdated = new Date().toISOString();
    });

    return true;
  }

  getAgentData() {
    return Array.from(this.agents.values()).map(({ id, position, state, characteristics }) => ({
      // Reduce precision of floating point numbers
      id,
      position: {
        x: Number(position.x.toFixed(3)),
        y: Number(position.y.toFixed(3))
      },
      state,
      connections: [], // Required by client
      characteristics: {
        energy: Math.round(characteristics.energy),
        speed: Math.round(characteristics.speed),
        influence: Math.round(characteristics.influence),
        age: Math.floor(characteristics.age),
        status: characteristics.status,
        lastUpdated: characteristics.lastUpdated
      }
    }));
  }
}