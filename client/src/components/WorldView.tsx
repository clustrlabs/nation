import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { WorldMap } from '../lib/simulation/WorldMap';
import AgentDetails from './AgentDetails';
import { useToast } from '@/hooks/use-toast';
import type { Agent } from '../lib/simulation/Agent';
import { MousePointer2 } from 'lucide-react';

const WEBSOCKET_RECONNECT_DELAY = 1000;
const MAX_RETRY_COUNT = 3;
const CAMERA_DISTANCE = 12;
const MIN_POLAR_ANGLE = 0; // Minimum vertical rotation (radians)
const MAX_POLAR_ANGLE = Math.PI; // Maximum vertical rotation (180 degrees)

export default function WorldView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const worldMapRef = useRef<WorldMap | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const { toast } = useToast();
  const lastHoveredAgent = useRef<Agent | null>(null);
  const isSelecting = useRef(false);

  // Refs for Three.js objects
  const sceneRef = useRef<THREE.Scene>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const controlsRef = useRef<OrbitControls>();
  const animationFrameId = useRef<number>();
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const wsRef = useRef<WebSocket | null>(null);

  // Handle mouse move for hover detection
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!containerRef.current || isSelecting.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }, []);

  // Handle click for agent selection
  const handleClick = useCallback((event: MouseEvent) => {
    if (!containerRef.current || !cameraRef.current || !sceneRef.current) return;

    // Prevent default event handling
    event.preventDefault();
    event.stopPropagation();

    // Temporarily disable controls during selection
    if (controlsRef.current) {
      // Save controls state
      const currentTarget = controlsRef.current.target.clone();
      const currentPosition = cameraRef.current.position.clone();

      // Disable controls temporarily
      const wasEnabled = controlsRef.current.enabled;
      controlsRef.current.enabled = false;

      const rect = containerRef.current.getBoundingClientRect();
      mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.current.setFromCamera(mouse.current, cameraRef.current);
      const intersects = raycaster.current.intersectObjects(sceneRef.current.children, true);

      let clickedAgent: Agent | null = null;
      for (const intersect of intersects) {
        if (intersect.object.userData.agent) {
          clickedAgent = intersect.object.userData.agent;
          break;
        }
      }

      // Update selection state
      if (selectedAgent && selectedAgent !== clickedAgent) {
        selectedAgent.setSelected(false);
      }
      if (clickedAgent && clickedAgent !== selectedAgent) {
        clickedAgent.setSelected(true);
      }

      setSelectedAgent(prev => prev === clickedAgent ? null : clickedAgent);

      // Restore camera and controls state
      requestAnimationFrame(() => {
        if (controlsRef.current && cameraRef.current) {
          cameraRef.current.position.copy(currentPosition);
          controlsRef.current.target.copy(currentTarget);
          controlsRef.current.update();
          controlsRef.current.enabled = wasEnabled;
        }
      });
    }
  }, [selectedAgent]);

  // Handle window resize
  const handleResize = useCallback(() => {
    if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    cameraRef.current.aspect = width / height;
    cameraRef.current.updateProjectionMatrix();
    rendererRef.current.setSize(width, height);
  }, []);

  // Animation loop
  const animate = useCallback(() => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) {
      animationFrameId.current = requestAnimationFrame(animate);
      return;
    }

    // Update controls if they exist
    if (controlsRef.current) {
      controlsRef.current.update();
    }

    // Update world state
    if (worldMapRef.current) {
      worldMapRef.current.update();
    }

    // Handle hover effects only when not selecting
    if (!isSelecting.current) {
      raycaster.current.setFromCamera(mouse.current, cameraRef.current);
      const intersects = raycaster.current.intersectObjects(sceneRef.current.children, true);

      let hoveredAgent: Agent | null = null;
      for (const intersect of intersects) {
        if (intersect.object.userData.agent) {
          hoveredAgent = intersect.object.userData.agent;
          break;
        }
      }

      if (hoveredAgent !== lastHoveredAgent.current) {
        if (lastHoveredAgent.current) {
          lastHoveredAgent.current.setHovered(false);
        }
        if (hoveredAgent) {
          hoveredAgent.setHovered(true);
        }
        lastHoveredAgent.current = hoveredAgent;
      }
    }

    // Always render the scene
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    animationFrameId.current = requestAnimationFrame(animate);
  }, []);

  // Setup Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    try {
      // Scene setup with error handling
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x111827);
      sceneRef.current = scene;

      // Camera setup with improved positioning
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
      camera.position.set(0, 0, CAMERA_DISTANCE);
      cameraRef.current = camera;

      // Enhanced renderer setup
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        precision: 'mediump',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      containerRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // Improved controls setup with strict constraints
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.minDistance = 6;
      controls.maxDistance = 14; // Reduced by 30% from 20
      controls.minPolarAngle = MIN_POLAR_ANGLE;
      controls.maxPolarAngle = MAX_POLAR_ANGLE;
      controls.enablePan = true;
      controls.screenSpacePanning = true;
      controls.autoRotate = false;
      controls.enableRotate = true;
      controls.rotateSpeed = 0.5;
      controls.target.set(0, 0, 0);
      controls.saveState(); // Save initial state
      controls.update();
      controlsRef.current = controls;

      // World map setup
      const worldMap = new WorldMap(scene, camera);
      worldMapRef.current = worldMap;

      // Start animation loop
      animationFrameId.current = requestAnimationFrame(animate);

      // Setup event listeners with capture phase
      window.addEventListener('click', handleClick, true);
      window.addEventListener('mousemove', handleMouseMove, true);
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('click', handleClick, true);
        window.removeEventListener('mousemove', handleMouseMove, true);
        window.removeEventListener('resize', handleResize);

        if (animationFrameId.current) {
          cancelAnimationFrame(animationFrameId.current);
        }

        if (selectedAgent) {
          selectedAgent.setSelected(false);
        }

        if (worldMapRef.current) {
          worldMapRef.current.cleanup();
        }

        if (controlsRef.current) {
          controlsRef.current.dispose();
        }

        if (rendererRef.current && containerRef.current) {
          containerRef.current.removeChild(rendererRef.current.domElement);
          rendererRef.current.dispose();
        }
      };
    } catch (error) {
      console.error('Error setting up Three.js scene:', error);
      toast({
        title: "Rendering Error",
        description: "Failed to initialize 3D view. Please refresh the page.",
        variant: "destructive",
      });
    }
  }, [animate, handleClick, handleMouseMove, handleResize]);

  // WebSocket setup with improved connection management
  useEffect(() => {
    let retryCount = 0;
    let retryTimeout: NodeJS.Timeout;
    let mountedRef = true;

    const connectWebSocket = () => {
      if (!mountedRef || retryCount >= MAX_RETRY_COUNT) {
        if (mountedRef) {
          toast({
            title: "Connection Error",
            description: "Failed to connect to simulation server. Please refresh the page.",
            variant: "destructive",
          });
        }
        return;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        retryCount = 0;
        if (retryTimeout) {
          clearTimeout(retryTimeout);
        }
      };

      ws.onmessage = (event) => {
        if (!mountedRef) return;
        try {
          const data = JSON.parse(event.data);
          if (data.agents && worldMapRef.current) {
            worldMapRef.current.updateAgents(data.agents);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        if (!mountedRef) return;
        console.error('WebSocket error:', error);
      };

      ws.onclose = (event) => {
        if (!mountedRef) return;
        console.log('WebSocket closed:', event.code, event.reason);
        wsRef.current = null;

        // Only attempt reconnection if not cleanly closed and component is still mounted
        if (event.code !== 1000 && mountedRef) {
          retryCount++;
          const delay = WEBSOCKET_RECONNECT_DELAY * Math.min(retryCount, 5);
          console.log(`Reconnecting in ${delay}ms... (attempt ${retryCount})`);
          retryTimeout = setTimeout(connectWebSocket, delay);
        }
      };
    };

    connectWebSocket();

    return () => {
      mountedRef = false;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close(1000, 'Component unmounting');
      }
    };
  }, [toast]);

  // Show controls tooltip
  useEffect(() => {
    const timer = setTimeout(() => {
      toast({
        title: "World Controls",
        description: (
          <div className="space-y-2 flex flex-col">
            <div className="flex items-center gap-2">
              <MousePointer2 className="h-4 w-4" />
              <span>Navigation Controls:</span>
            </div>
            <p>• Use mouse wheel to zoom in/out</p>
            <p>• Click and drag to pan around</p>
            <p>• Click on agents to see details</p>
          </div>
        ),
        duration: 5000,
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      {selectedAgent && (
        <AgentDetails
          agent={selectedAgent}
          onClose={() => {
            if (selectedAgent) {
              selectedAgent.setSelected(false);
            }
            setSelectedAgent(null);
          }}
        />
      )}
    </div>
  );
}