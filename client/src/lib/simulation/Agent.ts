import * as THREE from 'three';

export interface AgentCharacteristics {
  energy: number;
  speed: number;
  influence: number;
  age: number;
  status: 'active' | 'resting' | 'moving';
  lastUpdated: string;
}

export interface AgentData {
  id: string;
  position: { x: number; y: number };
  state: string;
  connections: string[];
  characteristics: AgentCharacteristics;
}

export class Agent {
  public id: string;
  public position: THREE.Vector2;
  private targetPosition: THREE.Vector2;
  private velocity: THREE.Vector2;
  public state: string;
  public characteristics: AgentCharacteristics;
  public mesh: THREE.Mesh;
  private glowMesh?: THREE.Mesh;
  private isHovered: boolean = false;
  private isSelected: boolean = false;
  private pulseAnimation: number = 0;
  private readonly BASE_SIZE = 0.1; // Reduced from 0.15 for smaller agents
  private readonly GLOW_SIZE = 0.2; // Adjusted glow size proportionally
  private readonly LERP_FACTOR = 0.04;

  constructor(data: AgentData) {
    this.id = data.id;
    this.position = new THREE.Vector2(data.position.x, data.position.y);
    this.targetPosition = this.position.clone();
    this.velocity = new THREE.Vector2(0, 0);
    this.state = data.state;
    this.characteristics = data.characteristics;

    const geometry = new THREE.CircleGeometry(this.BASE_SIZE, 32);
    const material = new THREE.MeshBasicMaterial({ 
      color: this.getColorFromCharacteristics(),
      transparent: true,
      opacity: 0.9
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(this.position.x, this.position.y, 0);

    // Enhanced glow effect
    const glowGeometry = new THREE.CircleGeometry(this.GLOW_SIZE, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending
    });
    this.glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    this.glowMesh.position.set(0, 0, -0.1);
    this.mesh.add(this.glowMesh);

    this.mesh.userData.agent = this;
  }

  private getColorFromCharacteristics(): number {
    const energyHue = (this.characteristics.energy / 100) * 0.3;
    const color = new THREE.Color().setHSL(
      energyHue,
      this.characteristics.status === 'active' ? 0.9 : 0.7,
      this.characteristics.status === 'moving' ? 0.6 : 0.5
    );
    return color.getHex();
  }

  setHovered(hovered: boolean) {
    this.isHovered = hovered;
    if (this.glowMesh) {
      (this.glowMesh.material as THREE.MeshBasicMaterial).opacity = 
        hovered ? 0.6 : (this.isSelected ? 0.4 : 0);
    }

    // Moderate scale effect
    this.mesh.scale.set(
      hovered ? 1.3 : (this.isSelected ? 1.2 : 1),
      hovered ? 1.3 : (this.isSelected ? 1.2 : 1),
      1
    );
  }

  setSelected(selected: boolean) {
    this.isSelected = selected;
    if (this.glowMesh) {
      (this.glowMesh.material as THREE.MeshBasicMaterial).opacity = 
        selected ? 0.4 : (this.isHovered ? 0.6 : 0);
    }

    // Moderate scale effect
    this.mesh.scale.set(
      selected ? 1.2 : (this.isHovered ? 1.3 : 1),
      selected ? 1.2 : (this.isHovered ? 1.3 : 1),
      1
    );
  }

  update(data: AgentData) {
    // Update target position
    this.targetPosition.set(data.position.x, data.position.y);

    // Calculate new position with smooth interpolation
    const deltaX = this.targetPosition.x - this.position.x;
    const deltaY = this.targetPosition.y - this.position.y;

    // Update velocity with damping for smoother movement
    this.velocity.x = this.velocity.x * 0.95 + deltaX * this.LERP_FACTOR;
    this.velocity.y = this.velocity.y * 0.95 + deltaY * this.LERP_FACTOR;

    // Apply velocity with damping
    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;

    // Update mesh position
    this.mesh.position.set(this.position.x, this.position.y, 0);

    // Update state and characteristics
    this.state = data.state;
    this.characteristics = data.characteristics;

    // Update color based on new characteristics
    (this.mesh.material as THREE.MeshBasicMaterial).color.setHex(
      this.getColorFromCharacteristics()
    );

    // Subtle glow animation when selected
    if (this.isSelected && this.glowMesh) {
      this.pulseAnimation += 0.05;
      const pulse = Math.sin(this.pulseAnimation) * 0.2 + 0.4;
      (this.glowMesh.material as THREE.MeshBasicMaterial).opacity = pulse;
    }
  }
}