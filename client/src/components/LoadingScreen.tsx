import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";

interface LoadingScreenProps {
  onLoadComplete: () => void;
}

interface MeshData {
  mesh: THREE.Points;
  verticesDown: number;
  verticesUp: number;
  direction: number;
  speed: number;
  delay: number;
  start: number;
}

interface CloneMeshData {
  mesh: THREE.Points;
  speed: number;
}

export default function LoadingScreen({ onLoadComplete }: LoadingScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const composerRef = useRef<EffectComposer>();

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize renderer first
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Scene setup with closer camera position
    const camera = new THREE.PerspectiveCamera(
      35,
      window.innerWidth / window.innerHeight,
      1,
      10000,
    );
    camera.position.set(0, 200, 1200);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000104);
    scene.fog = new THREE.FogExp2(0x000104, 0.0000675);

    camera.lookAt(0, 0, 0);

    const parent = new THREE.Object3D();
    scene.add(parent);

    const meshes: MeshData[] = [];
    const cloneMeshes: CloneMeshData[] = [];

    function createHumanoidParticles(
      x: number,
      y: number,
      z: number,
      color: number,
    ) {
      const geometry = new THREE.BufferGeometry();
      const positions: number[] = [];

      // Head (more particles for better definition)
      for (let i = 0; i < 150; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const radius = 25;
        positions.push(
          radius * Math.sin(phi) * Math.cos(theta),
          radius * Math.cos(phi) + 120,
          radius * Math.sin(phi) * Math.sin(theta),
        );
      }

      // Body (denser particle distribution)
      for (let i = 0; i < 300; i++) {
        positions.push(
          (Math.random() - 0.5) * 50,
          Math.random() * 100 + 0,
          (Math.random() - 0.5) * 25,
        );
      }

      // Arms (more defined shape)
      for (let i = 0; i < 150; i++) {
        // Left arm
        positions.push(
          -35 + (Math.random() - 0.5) * 15,
          Math.random() * 80 + 40,
          (Math.random() - 0.5) * 15,
        );
        // Right arm
        positions.push(
          35 + (Math.random() - 0.5) * 15,
          Math.random() * 80 + 40,
          (Math.random() - 0.5) * 15,
        );
      }

      // Legs (more particles)
      for (let i = 0; i < 150; i++) {
        // Left leg
        positions.push(
          -18 + (Math.random() - 0.5) * 15,
          Math.random() * 100 - 80,
          (Math.random() - 0.5) * 15,
        );
        // Right leg
        positions.push(
          18 + (Math.random() - 0.5) * 15,
          Math.random() * 100 - 80,
          (Math.random() - 0.5) * 15,
        );
      }

      const vertices = new Float32Array(positions);
      geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
      geometry.setAttribute(
        "initialPosition",
        new THREE.BufferAttribute(vertices.slice(), 3),
      );

      // Reduced clone offsets for closer view
      const cloneOffsets = [
        [500, 0, -400],
        [400, 0, 0],
        [100, 0, 500],
        [100, 0, -500],
        [400, 0, 200],
        [-400, 0, 100],
        [-500, 0, -500],
        [0, 0, 0],
      ];

      for (let i = 0; i < cloneOffsets.length; i++) {
        const c = i < cloneOffsets.length - 1 ? 0x252525 : color;
        const mesh = new THREE.Points(
          geometry.clone(),
          new THREE.PointsMaterial({
            size: 3.5,
            color: c,
            sizeAttenuation: true,
          }),
        );

        mesh.position.set(
          x + cloneOffsets[i][0],
          y + cloneOffsets[i][1],
          z + cloneOffsets[i][2],
        );

        parent.add(mesh);
        cloneMeshes.push({ mesh, speed: 0.5 + Math.random() });
      }

      meshes.push({
        mesh: cloneMeshes[cloneMeshes.length - 1].mesh,
        verticesDown: 0,
        verticesUp: 0,
        direction: 0,
        speed: 35,
        delay: Math.floor(200 + 200 * Math.random()),
        start: Math.floor(100 + 200 * Math.random()),
      });
    }

    // Create ground grid with reduced size
    const grid = new THREE.Points(
      new THREE.PlaneGeometry(3000, 3000, 48, 48),
      new THREE.PointsMaterial({
        color: 0xff0000,
        size: 8,
        sizeAttenuation: true,
      }),
    );
    grid.position.y = -400;
    grid.rotation.x = -Math.PI / 2;
    parent.add(grid);

    // Create particle systems closer to the camera
    createHumanoidParticles(-150, -300, 150, 0xff7744);  // Orange-red
    createHumanoidParticles(150, -300, 0, 0xff5522);     // Deep orange
    createHumanoidParticles(-300, -300, 0, 0xffdd44);    // Yellow
    createHumanoidParticles(0, -300, 0, 0xffffff);       // White
    createHumanoidParticles(300, -300, -200, 0x44ff88);  // Mint green
    createHumanoidParticles(-200, -300, -300, 0x88aaff); // Light blue
    createHumanoidParticles(200, -300, 300, 0xff88dd);   // Pink
    createHumanoidParticles(-400, -300, 200, 0x44ffdd);  // Turquoise


    // Initialize composer
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    composerRef.current = composer;

    // Animation
    const clock = new THREE.Clock();
    let frame = 0;

    function animate() {
      const delta = Math.min(10 * clock.getDelta(), 2);
      parent.rotation.y += -0.02 * delta;

      for (const cm of cloneMeshes) {
        cm.mesh.rotation.y += -0.1 * delta * cm.speed;
      }

      for (const data of meshes) {
        const positions = data.mesh.geometry.getAttribute("position");
        const initialPositions =
          data.mesh.geometry.getAttribute("initialPosition");

        if (!positions || !initialPositions) continue;

        if (data.start > 0) {
          data.start -= 1;
        } else if (data.direction === 0) {
          data.direction = -1;
        }

        for (let i = 0; i < positions.count; i++) {
          const px = positions.getX(i);
          const py = positions.getY(i);
          const pz = positions.getZ(i);

          if (data.direction < 0) {
            if (py > 0) {
              positions.setXYZ(
                i,
                px + 1.5 * (0.5 - Math.random()) * data.speed * delta,
                py + 3.0 * (0.25 - Math.random()) * data.speed * delta,
                pz + 1.5 * (0.5 - Math.random()) * data.speed * delta,
              );
            } else {
              data.verticesDown += 1;
            }
          }

          if (data.direction > 0) {
            const ix = initialPositions.getX(i);
            const iy = initialPositions.getY(i);
            const iz = initialPositions.getZ(i);

            const d = Math.abs(px - ix) + Math.abs(py - iy) + Math.abs(pz - iz);

            if (d > 1) {
              positions.setXYZ(
                i,
                px -
                  ((px - ix) / d) * data.speed * delta * (0.85 - Math.random()),
                py - ((py - iy) / d) * data.speed * delta * (1 + Math.random()),
                pz -
                  ((pz - iz) / d) * data.speed * delta * (0.85 - Math.random()),
              );
            } else {
              data.verticesUp += 1;
            }
          }
        }

        if (data.verticesDown >= positions.count) {
          if (data.delay <= 0) {
            data.direction = 1;
            data.speed = 10;
            data.verticesDown = 0;
            data.delay = 320;
          } else {
            data.delay -= 1;
          }
        }

        if (data.verticesUp >= positions.count) {
          if (data.delay <= 0) {
            data.direction = -1;
            data.speed = 35;
            data.verticesUp = 0;
            data.delay = 120;
          } else {
            data.delay -= 1;
          }
        }

        positions.needsUpdate = true;
      }

      if (composerRef.current) {
        composerRef.current.render();
      }

      frame = requestAnimationFrame(animate);

      // Changed to 10 seconds
      if (clock.getElapsedTime() >= 10.0) {
        cancelAnimationFrame(frame);
        onLoadComplete();
        return;
      }
    }

    animate();

    const handleResize = () => {
      if (!rendererRef.current || !composerRef.current) return;

      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      composerRef.current.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(frame);

      // Cleanup resources
      meshes.forEach(({ mesh }) => {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
      cloneMeshes.forEach(({ mesh }) => {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
      grid.geometry.dispose();
      (grid.material as THREE.Material).dispose();

      scene.clear();
      renderer.dispose();
      composer.dispose();

      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [onLoadComplete]);

  return (
    <div className="fixed inset-0 bg-black">
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="relative flex flex-col items-center -translate-y-[40px]">
          <img
            src="/logo.png"
            alt="Nation Logo"
            className="w-[35vh] h-[35vh] opacity-90"
          />
          <div className="text-4xl font-bold text-white font-sandro -mt-12">
            Nation
          </div>
          <div className="text-sm text-gray-400 font-sandro mt-2">
            Loading world data...
          </div>
        </div>
      </div>
    </div>
  );
}