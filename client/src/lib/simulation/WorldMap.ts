import * as THREE from 'three';
import { Agent, AgentData } from './Agent';

interface RegionData {
  name: string;
  description: string;
  position: { x: number; y: number };
}

export class WorldMap {
  private scene: THREE.Scene;
  private agents: Map<string, Agent>;
  private topographyMesh: THREE.Mesh;
  private hologramOverlay: THREE.Mesh;
  private regions: THREE.Sprite[] = [];
  private camera: THREE.Camera;
  private frustum: THREE.Frustum;
  private cameraViewMatrix: THREE.Matrix4;
  private readonly WORLD_WIDTH = 20;
  private readonly WORLD_HEIGHT = 12;

  private readonly REGIONS: RegionData[] = [
    {
      name: "Trading Hub Alpha",
      description: "Central trading nexus where AI agents engage in high-frequency market operations and strategic negotiations",
      position: { x: -8, y: 4 }
    },
    {
      name: "Innovation District",
      description: "Advanced research zone focusing on breakthrough AI technologies and experimental trading algorithms",
      position: { x: 8, y: 4 }
    },
    {
      name: "Market Analytics Core",
      description: "Sophisticated analysis center processing real-time market data and predictive modeling",
      position: { x: -6, y: -3 }
    },
    {
      name: "Quantum Computing Zone",
      description: "High-performance computing facility optimizing complex trading algorithms and market simulations",
      position: { x: 0, y: -5 }
    },
    {
      name: "Strategic Operations Center",
      description: "Command center coordinating automated trading strategies and risk management protocols",
      position: { x: 6, y: -3 }
    },
    {
      name: "Data Synthesis Hub",
      description: "Advanced data processing center integrating market feeds and generating actionable insights",
      position: { x: -4, y: 2 }
    },
    {
      name: "AI Development Sector",
      description: "Specialized zone for training and evolving next-generation trading algorithms",
      position: { x: 4, y: 2 }
    }
  ];

  private createTextSprite(name: string, description: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;  // Doubled for more room
    canvas.height = 1024;  // Doubled for more room
    const ctx = canvas.getContext('2d')!;

    // Enhanced glow effect
    ctx.shadowColor = '#4adeec';
    ctx.shadowBlur = 30;  
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Create and register custom font
    const style = document.createElement('style');
    style.textContent = `
      @font-face {
        font-family: 'SandroGrottesco';
        src: url('/fonts/sandrogrottesco-regular.ttf') format('truetype');
        font-weight: normal;
        font-style: normal;
      }
    `;
    document.head.appendChild(style);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      opacity: 0.9
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(3.5, 1.8, 1);  // Increased size for better visibility

    // Wait for font to load before rendering text
    document.fonts.load('84px SandroGrottesco').then(() => {  
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Enhanced title rendering with more vertical space
      ctx.font = '84px SandroGrottesco';  // Increased from 74px
      ctx.textAlign = 'center';
      ctx.fillStyle = '#4adeec';
      ctx.fillText(name, canvas.width/2, 200);  // Moved down for better spacing

      // Enhanced description text with better wrapping
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#a8b9c0';
      ctx.font = '42px SandroGrottesco';  // Changed from Arial and increased from 38px
      const words = description.split(' ');
      let line = '';
      let y = 300;  // Start description text lower
      const maxWidth = canvas.width - 200;  // Add margins

      for (const word of words) {
        const testLine = line + word + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth) {  
          ctx.fillText(line, canvas.width/2, y);
          line = word + ' ';
          y += 48;  // Increased line spacing
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, canvas.width/2, y);

      texture.needsUpdate = true;
    }).catch(err => {
      console.warn('Failed to load Sandro Grottesco font:', err);
      ctx.font = '84px Arial';  // Increased from 74px
      ctx.fillText(name, canvas.width/2, 200);
    });

    return sprite;
  }

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
    this.agents = new Map();
    this.frustum = new THREE.Frustum();
    this.cameraViewMatrix = new THREE.Matrix4();

    scene.background = new THREE.Color(0x111827);

    // Create topography with enhanced detail
    const mapGeometry = new THREE.PlaneGeometry(this.WORLD_WIDTH, this.WORLD_HEIGHT, 256, 128);
    const vertices = mapGeometry.attributes.position.array;

    for (let i = 0; i < vertices.length; i += 3) {
      const x = Math.floor(i / 3) % 256;
      const y = Math.floor(i / (3 * 256));

      vertices[i + 2] =
        Math.sin(x * 0.2) * Math.cos(y * 0.2) * 0.3 +
        Math.sin(x * 0.4) * Math.cos(y * 0.4) * 0.2;
    }
    mapGeometry.computeVertexNormals();

    // Enhanced material settings
    const mapMaterial = new THREE.MeshPhongMaterial({
      color: 0x1a1a2e,
      specular: 0x222233,
      shininess: 30,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
    });

    this.topographyMesh = new THREE.Mesh(mapGeometry, mapMaterial);
    this.topographyMesh.position.z = -0.1;
    scene.add(this.topographyMesh);

    // Enhanced hologram effect
    const hologramGeometry = mapGeometry.clone();
    const hologramMaterial = new THREE.MeshPhongMaterial({
      color: 0x4287f5,
      wireframe: true,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
      emissive: 0x4287f5,
      emissiveIntensity: 0.2,
    });

    this.hologramOverlay = new THREE.Mesh(hologramGeometry, hologramMaterial);
    this.hologramOverlay.position.z = 0;
    scene.add(this.hologramOverlay);

    // Enhanced lighting
    const ambientLight = new THREE.AmbientLight(0x1a1a2e, 0.3);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0x4287f5, 0.5);
    mainLight.position.set(2, 2, 4);
    scene.add(mainLight);

    const blueLight = new THREE.DirectionalLight(0x4287f5, 0.3);
    blueLight.position.set(-2, -2, 4);
    scene.add(blueLight);

    // Create regions with enhanced visibility and higher z-position
    this.REGIONS.forEach(region => {
      const sprite = this.createTextSprite(region.name, region.description);
      sprite.position.set(region.position.x, region.position.y, 1); // Increased z-position to 1
      sprite.material.opacity = 0.9;
      sprite.renderOrder = 1; // Ensure regions render after agents
      this.regions.push(sprite);
      scene.add(sprite);
    });
  }

  private updateRegionVisibility() {
    this.camera.updateMatrixWorld();
    this.cameraViewMatrix.multiplyMatrices(
      (this.camera as THREE.PerspectiveCamera).projectionMatrix,
      this.camera.matrixWorldInverse
    );
    this.frustum.setFromProjectionMatrix(this.cameraViewMatrix);

    this.regions.forEach((sprite) => {
      const material = sprite.material as THREE.SpriteMaterial;
      const point = new THREE.Vector3(sprite.position.x, sprite.position.y, sprite.position.z);

      if (this.frustum.containsPoint(point)) {
        material.opacity = Math.min(0.9, material.opacity + 0.05);
      } else {
        material.opacity = Math.max(0, material.opacity - 0.05);
      }
    });
  }

  updateAgents(agentData: AgentData[]) {
    const currentIds = new Set(agentData.map(d => d.id));

    // Remove agents that no longer exist
    this.agents.forEach((agent, id) => {
      if (!currentIds.has(id)) {
        this.scene.remove(agent.mesh);
        this.agents.delete(id);
      }
    });

    // Update or create agents
    agentData.forEach(data => {
      if (this.agents.has(data.id)) {
        const agent = this.agents.get(data.id)!;
        agent.update(data);
        agent.mesh.position.z = 0.2; // Keep agents at z=0.2
        agent.mesh.renderOrder = 0; // Ensure agents render before regions
      } else {
        const agent = new Agent(data);
        agent.mesh.position.z = 0.2;
        agent.mesh.renderOrder = 0;
        this.agents.set(data.id, agent);
        this.scene.add(agent.mesh);
      }
    });
  }

  update() {
    if (this.topographyMesh && this.hologramOverlay) {
      const time = Date.now() * 0.0001;

      // Update terrain with smoother animation
      const terrainVertices = this.topographyMesh.geometry.attributes.position.array;
      const hologramVertices = this.hologramOverlay.geometry.attributes.position.array;

      for (let i = 0; i < terrainVertices.length; i += 3) {
        const x = Math.floor(i / 3) % 256;
        const y = Math.floor(i / (3 * 256));

        const height =
          Math.sin(x * 0.1 + time) * 0.2 +
          Math.cos(y * 0.1 + time) * 0.2 +
          Math.sin(time * 2 + x * 0.05 + y * 0.05) * 0.1;

        terrainVertices[i + 2] = height - 0.1;
        hologramVertices[i + 2] = height;
      }

      this.topographyMesh.geometry.attributes.position.needsUpdate = true;
      this.hologramOverlay.geometry.attributes.position.needsUpdate = true;

      this.updateRegionVisibility();

      // Enhanced hologram effect
      (this.hologramOverlay.material as THREE.MeshPhongMaterial).opacity =
        0.1 + Math.sin(time * 3) * 0.05;
      (this.hologramOverlay.material as THREE.MeshPhongMaterial).emissiveIntensity =
        0.2 + Math.sin(time * 4) * 0.1;
    }
  }

  cleanup() {
    // Cleanup resources if needed
  }
}