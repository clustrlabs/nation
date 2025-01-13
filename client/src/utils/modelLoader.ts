import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// Model cache to prevent reloading
const modelCache = new Map<string, THREE.BufferGeometry>();

export interface ModelLoadOptions {
  scale?: number;
  position?: THREE.Vector3;
  rotation?: THREE.Euler;
}

export const loadModel = async (
  url: string,
  options: ModelLoadOptions = {}
): Promise<THREE.BufferGeometry> => {
  // Check cache first
  if (modelCache.has(url)) {
    return modelCache.get(url)!.clone();
  }

  // Determine loader based on file extension
  const extension = url.split('.').pop()?.toLowerCase();
  let loader: OBJLoader | FBXLoader | GLTFLoader;

  switch (extension) {
    case 'obj':
      loader = new OBJLoader();
      break;
    case 'fbx':
      loader = new FBXLoader();
      break;
    case 'gltf':
    case 'glb':
      loader = new GLTFLoader();
      break;
    default:
      throw new Error(`Unsupported file format: ${extension}`);
  }

  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (object) => {
        let geometry: THREE.BufferGeometry | undefined;

        // Extract geometry based on loader type
        if (object instanceof THREE.Group || object instanceof THREE.Scene) {
          object.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              if (!geometry) {
                geometry = (child as THREE.Mesh).geometry;
              }
            }
          });
        } else if ((object as THREE.Mesh).isMesh) {
          geometry = (object as THREE.Mesh).geometry;
        }

        if (!geometry) {
          reject(new Error('No geometry found in model'));
          return;
        }

        // Apply transformations
        if (options.scale) {
          geometry.scale(options.scale, options.scale, options.scale);
        }

        // Cache the geometry
        modelCache.set(url, geometry.clone());
        resolve(geometry);
      },
      // Progress callback
      (xhr) => {
        console.log(`${url} ${(xhr.loaded / xhr.total * 100)}% loaded`);
      },
      // Error callback
      (error) => {
        console.error('Error loading model:', error);
        reject(error);
      }
    );
  });
};

export const createParticlesFromGeometry = (
  geometry: THREE.BufferGeometry,
  color: number,
  size: number = 3
): THREE.Points => {
  const material = new THREE.PointsMaterial({
    size,
    color,
    transparent: true,
    opacity: 1.0,
    sizeAttenuation: true,
  });

  return new THREE.Points(geometry, material);
};

// Clean up cache if needed
export const clearModelCache = () => {
  modelCache.clear();
};
