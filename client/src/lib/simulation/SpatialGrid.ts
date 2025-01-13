import { Agent } from './Agent';

export class SpatialGrid {
  private cells: Map<string, Agent>[][];
  private cellSize: number;

  constructor(width: number, height: number, cellSize = 1) {
    this.cellSize = cellSize;
    this.cells = Array(Math.ceil(height/cellSize))
      .fill(null)
      .map(() => Array(Math.ceil(width/cellSize))
        .fill(null)
        .map(() => new Map()));
  }

  getCellIndex(x: number, y: number): [number, number] {
    return [
      Math.floor(x / this.cellSize),
      Math.floor(y / this.cellSize)
    ];
  }

  insert(agent: Agent) {
    const [x, y] = this.getCellIndex(agent.position.x, agent.position.y);
    if (this.cells[y] && this.cells[y][x]) {
      this.cells[y][x].set(agent.id, agent);
    }
  }

  getNearby(x: number, y: number, radius: number): Agent[] {
    const [cellX, cellY] = this.getCellIndex(x, y);
    const cellRadius = Math.ceil(radius / this.cellSize);
    const nearby: Agent[] = [];

    for (let dy = -cellRadius; dy <= cellRadius; dy++) {
      for (let dx = -cellRadius; dx <= cellRadius; dx++) {
        const cy = cellY + dy;
        const cx = cellX + dx;
        if (cy >= 0 && cy < this.cells.length && 
            cx >= 0 && cx < this.cells[cy].length) {
          this.cells[cy][cx].forEach(agent => nearby.push(agent));
        }
      }
    }

    return nearby;
  }

  clear() {
    for (let y = 0; y < this.cells.length; y++) {
      for (let x = 0; x < this.cells[y].length; x++) {
        this.cells[y][x].clear();
      }
    }
  }
}