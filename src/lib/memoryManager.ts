import * as THREE from 'three';

export interface MemoryPool<T> {
  acquire(): T;
  release(item: T): void;
  clear(): void;
  size(): number;
}

export class ObjectPool<T> implements MemoryPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn?: (item: T) => void;
  private maxSize: number;

  constructor(createFn: () => T, resetFn?: (item: T) => void, maxSize = 100) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
  }

  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.createFn();
  }

  release(item: T): void {
    if (this.pool.length < this.maxSize) {
      if (this.resetFn) {
        this.resetFn(item);
      }
      this.pool.push(item);
    }
  }

  clear(): void {
    this.pool.length = 0;
  }

  size(): number {
    return this.pool.length;
  }
}

export class MemoryManager {
  private static instance: MemoryManager;
  private geometryPool: ObjectPool<THREE.BufferGeometry>;
  private materialPool: ObjectPool<THREE.Material>;
  private meshPool: ObjectPool<THREE.Mesh>;
  private textureCache: Map<string, THREE.Texture> = new Map();
  private geometryCache: Map<string, THREE.BufferGeometry> = new Map();
  private materialCache: Map<string, THREE.Material> = new Map();
  private activeScenes: Set<string> = new Set();
  private sceneAssets: Map<string, Set<THREE.Object3D>> = new Map();
  private memoryBudget = 512; // MB
  private currentMemoryUsage = 0;

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  constructor() {
    this.geometryPool = new ObjectPool(
      () => new THREE.BufferGeometry(),
      (geo) => {
        geo.deleteAttribute('position');
        geo.deleteAttribute('normal');
        geo.deleteAttribute('uv');
      }
    );

    this.materialPool = new ObjectPool(
      () => new THREE.MeshStandardMaterial(),
      (mat) => {
        if (mat instanceof THREE.MeshStandardMaterial) {
          mat.map = null;
          mat.normalMap = null;
          mat.roughnessMap = null;
          mat.metalnessMap = null;
        }
      }
    );

    this.meshPool = new ObjectPool(
      () => new THREE.Mesh(),
      (mesh) => {
        mesh.geometry = new THREE.BufferGeometry();
        mesh.material = new THREE.MeshBasicMaterial();
        mesh.position.set(0, 0, 0);
        mesh.rotation.set(0, 0, 0);
        mesh.scale.set(1, 1, 1);
        mesh.visible = true;
      }
    );

    // Monitor memory usage
    this.startMemoryMonitoring();
  }

  private startMemoryMonitoring() {
    setInterval(() => {
      this.updateMemoryUsage();
      if (this.currentMemoryUsage > this.memoryBudget * 0.8) {
        this.triggerGarbageCollection();
      }
    }, 5000);
  }

  private updateMemoryUsage() {
    let usage = 0;
    
    // Estimate texture memory
    this.textureCache.forEach((texture) => {
      if (texture.image) {
        const width = texture.image.width || 512;
        const height = texture.image.height || 512;
        usage += (width * height * 4) / (1024 * 1024); // 4 bytes per pixel for RGBA
      }
    });

    // Estimate geometry memory
    this.geometryCache.forEach((geometry) => {
      const positions = geometry.getAttribute('position');
      if (positions) {
        usage += (positions.count * positions.itemSize * 4) / (1024 * 1024); // 4 bytes per float
      }
    });

    this.currentMemoryUsage = usage;
  }

  // Optimized geometry creation with LOD
  createOptimizedGeometry(
    type: 'sphere' | 'box' | 'torus' | 'icosahedron' | 'octahedron',
    params: number[],
    qualityLevel: 'high' | 'medium' | 'low' = 'high'
  ): THREE.BufferGeometry {
    const key = `${type}_${params.join('_')}_${qualityLevel}`;
    
    if (this.geometryCache.has(key)) {
      return this.geometryCache.get(key)!.clone();
    }

    let geometry: THREE.BufferGeometry;
    
    // Adjust detail based on quality level
    const qualityMultiplier = {
      high: 1.0,
      medium: 0.7,
      low: 0.5
    }[qualityLevel];

    switch (type) {
      case 'sphere':
        const [radius, widthSeg, heightSeg] = params;
        geometry = new THREE.SphereGeometry(
          radius,
          Math.max(8, Math.floor(widthSeg * qualityMultiplier)),
          Math.max(6, Math.floor(heightSeg * qualityMultiplier))
        );
        break;
      case 'box':
        geometry = new THREE.BoxGeometry(...params as [number, number, number]);
        break;
      case 'torus':
        const [torusRadius, tube, radialSeg, tubularSeg] = params;
        geometry = new THREE.TorusGeometry(
          torusRadius,
          tube,
          Math.max(8, Math.floor(radialSeg * qualityMultiplier)),
          Math.max(12, Math.floor(tubularSeg * qualityMultiplier))
        );
        break;
      case 'icosahedron':
        geometry = new THREE.IcosahedronGeometry(params[0], Math.floor((params[1] || 0) * qualityMultiplier));
        break;
      case 'octahedron':
        geometry = new THREE.OctahedronGeometry(params[0], Math.floor((params[1] || 0) * qualityMultiplier));
        break;
      default:
        geometry = new THREE.SphereGeometry(1, 16, 12);
    }

    // Optimize geometry
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    
    // Cache the geometry
    this.geometryCache.set(key, geometry);
    
    return geometry.clone();
  }

  // Optimized texture loading with compression
  async loadOptimizedTexture(
    url: string,
    maxSize: number = 512
  ): Promise<THREE.Texture> {
    const key = `${url}_${maxSize}`;
    
    if (this.textureCache.has(key)) {
      return this.textureCache.get(key)!;
    }

    const loader = new THREE.TextureLoader();
    const texture = await new Promise<THREE.Texture>((resolve, reject) => {
      loader.load(url, resolve, undefined, reject);
    });

    // Optimize texture settings
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    // Resize if necessary
    if (texture.image && (texture.image.width > maxSize || texture.image.height > maxSize)) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      const scale = Math.min(maxSize / texture.image.width, maxSize / texture.image.height);
      canvas.width = texture.image.width * scale;
      canvas.height = texture.image.height * scale;
      
      ctx.drawImage(texture.image, 0, 0, canvas.width, canvas.height);
      texture.image = canvas;
    }

    this.textureCache.set(key, texture);
    return texture;
  }

  // Scene asset management
  registerSceneAssets(sceneId: string, assets: THREE.Object3D[]) {
    if (!this.sceneAssets.has(sceneId)) {
      this.sceneAssets.set(sceneId, new Set());
    }
    
    const sceneSet = this.sceneAssets.get(sceneId)!;
    assets.forEach(asset => sceneSet.add(asset));
  }

  activateScene(sceneId: string) {
    this.activeScenes.add(sceneId);
  }

  deactivateScene(sceneId: string) {
    this.activeScenes.delete(sceneId);
    
    // Unload inactive scene assets after delay
    setTimeout(() => {
      if (!this.activeScenes.has(sceneId)) {
        this.unloadSceneAssets(sceneId);
      }
    }, 2000);
  }

  private unloadSceneAssets(sceneId: string) {
    const assets = this.sceneAssets.get(sceneId);
    if (!assets) return;

    assets.forEach(asset => {
      this.disposeObject(asset);
    });
    
    this.sceneAssets.delete(sceneId);
    console.log(`🗑️ Unloaded assets for scene: ${sceneId}`);
  }

  // Enhanced disposal with resource tracking
  disposeObject(object: THREE.Object3D) {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => {
              this.disposeMaterial(material);
            });
          } else {
            this.disposeMaterial(child.material);
          }
        }
      }
    });
  }

  private disposeMaterial(material: THREE.Material) {
    // Dispose textures
    Object.values(material).forEach(value => {
      if (value && typeof value.dispose === 'function') {
        value.dispose();
      }
    });
    
    material.dispose();
  }

  // Force garbage collection
  triggerGarbageCollection() {
    // Clear unused cached resources
    // const activeTextures = new Set<string>();
    // const activeGeometries = new Set<string>();
    
    // Mark resources used by active scenes
    this.activeScenes.forEach(sceneId => {
      const assets = this.sceneAssets.get(sceneId);
      if (assets) {
        assets.forEach(asset => {
          asset.traverse(child => {
            if (child instanceof THREE.Mesh) {
              if (child.geometry) {
                // Mark geometry as active (simplified tracking)
              }
              if (child.material) {
                // Mark material textures as active (simplified tracking)
              }
            }
          });
        });
      }
    });

    // Clear unused cache entries
    const beforeSize = this.textureCache.size + this.geometryCache.size;
    
    // Simple cache cleanup - remove oldest 50% if over budget
    if (this.currentMemoryUsage > this.memoryBudget * 0.8) {
      const texturesToDelete = Array.from(this.textureCache.keys()).slice(0, Math.floor(this.textureCache.size * 0.5));
      const geometriesToDelete = Array.from(this.geometryCache.keys()).slice(0, Math.floor(this.geometryCache.size * 0.5));
      
      texturesToDelete.forEach(key => {
        const texture = this.textureCache.get(key);
        if (texture) {
          texture.dispose();
          this.textureCache.delete(key);
        }
      });
      
      geometriesToDelete.forEach(key => {
        const geometry = this.geometryCache.get(key);
        if (geometry) {
          geometry.dispose();
          this.geometryCache.delete(key);
        }
      });
    }

    const afterSize = this.textureCache.size + this.geometryCache.size;
    console.log(`🧹 Garbage collection: Freed ${beforeSize - afterSize} cached resources`);
  }

  // Pool accessors
  getGeometryPool(): ObjectPool<THREE.BufferGeometry> {
    return this.geometryPool;
  }

  getMaterialPool(): ObjectPool<THREE.Material> {
    return this.materialPool;
  }

  getMeshPool(): ObjectPool<THREE.Mesh> {
    return this.meshPool;
  }

  // Memory statistics
  getMemoryStats() {
    return {
      currentUsage: this.currentMemoryUsage,
      budget: this.memoryBudget,
      utilization: (this.currentMemoryUsage / this.memoryBudget) * 100,
      cachedTextures: this.textureCache.size,
      cachedGeometries: this.geometryCache.size,
      activeScenes: this.activeScenes.size,
      pooledGeometries: this.geometryPool.size(),
      pooledMaterials: this.materialPool.size(),
      pooledMeshes: this.meshPool.size()
    };
  }
}