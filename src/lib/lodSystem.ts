import * as THREE from 'three';
import { MemoryManager } from './memoryManager';
import { PerformanceManager, QualityLevel } from './performance';

export interface LODLevel {
  distance: number;
  geometry: THREE.BufferGeometry;
  material?: THREE.Material;
}

export interface LODConfiguration {
  levels: LODLevel[];
  hysteresis: number; // Prevents flickering between levels
  cullingDistance: number; // Distance at which object is completely hidden
}

export class LODObject extends THREE.LOD {
  private lodConfig: LODConfiguration;
  private currentLevel = 0;
  private lastUpdateTime = 0;
  private updateFrequency = 100; // Update every 100ms
  private memoryManager: MemoryManager;
  private performanceManager: PerformanceManager;

  constructor(lodConfig: LODConfiguration) {
    super();
    this.lodConfig = lodConfig;
    this.memoryManager = MemoryManager.getInstance();
    this.performanceManager = PerformanceManager.getInstance();
    
    this.initializeLODLevels();
  }

  private initializeLODLevels() {
    this.lodConfig.levels.forEach((level) => {
      const mesh = new THREE.Mesh(level.geometry, level.material);
      this.addLevel(mesh, level.distance);
    });
  }

  update(camera: THREE.Camera) {
    const now = performance.now();
    if (now - this.lastUpdateTime < this.updateFrequency) {
      return;
    }

    super.update(camera);
    this.lastUpdateTime = now;

    // Additional culling based on performance
    const distance = this.position.distanceTo(camera.position);
    const qualityLevel = this.performanceManager.getCurrentQuality();
    const adjustedCullingDistance = this.getAdjustedCullingDistance(qualityLevel);

    if (distance > adjustedCullingDistance) {
      this.visible = false;
    } else {
      this.visible = true;
    }
  }

  private getAdjustedCullingDistance(qualityLevel: QualityLevel): number {
    const multipliers = {
      high: 1.0,
      medium: 0.8,
      low: 0.6
    };

    return this.lodConfig.cullingDistance * multipliers[qualityLevel];
  }
}

export class LODManager {
  private static instance: LODManager;
  private lodObjects: Set<LODObject> = new Set();
  private camera?: THREE.Camera;
  private updateQueue: LODObject[] = [];
  private currentUpdateIndex = 0;
  private maxUpdatesPerFrame = 5; // Spread LOD updates across frames
  private memoryManager: MemoryManager;
  private performanceManager: PerformanceManager;

  static getInstance(): LODManager {
    if (!LODManager.instance) {
      LODManager.instance = new LODManager();
    }
    return LODManager.instance;
  }

  constructor() {
    this.memoryManager = MemoryManager.getInstance();
    this.performanceManager = PerformanceManager.getInstance();
    this.startUpdateLoop();
  }

  setCamera(camera: THREE.Camera) {
    this.camera = camera;
  }

  registerLODObject(lodObject: LODObject) {
    this.lodObjects.add(lodObject);
    this.updateQueue.push(lodObject);
  }

  unregisterLODObject(lodObject: LODObject) {
    this.lodObjects.delete(lodObject);
    const index = this.updateQueue.indexOf(lodObject);
    if (index !== -1) {
      this.updateQueue.splice(index, 1);
    }
  }

  private startUpdateLoop() {
    const update = () => {
      if (this.camera && this.updateQueue.length > 0) {
        this.updateLODObjects();
      }
      requestAnimationFrame(update);
    };
    update();
  }

  private updateLODObjects() {
    const updatesThisFrame = Math.min(this.maxUpdatesPerFrame, this.updateQueue.length);
    
    for (let i = 0; i < updatesThisFrame; i++) {
      const lodObject = this.updateQueue[this.currentUpdateIndex];
      if (lodObject && this.camera) {
        lodObject.update(this.camera);
      }
      
      this.currentUpdateIndex = (this.currentUpdateIndex + 1) % this.updateQueue.length;
    }
  }

  // Factory methods for creating optimized LOD objects
  createSphereLOD(
    radius: number,
    position: THREE.Vector3,
    material: THREE.Material
  ): LODObject {
    // const qualitySettings = this.performanceManager.getQualitySettings();
    
    const levels: LODLevel[] = [
      {
        distance: 0,
        geometry: this.memoryManager.createOptimizedGeometry('sphere', [radius, 32, 24], 'high'),
        material: material
      },
      {
        distance: 25,
        geometry: this.memoryManager.createOptimizedGeometry('sphere', [radius, 16, 12], 'medium'),
        material: material
      },
      {
        distance: 50,
        geometry: this.memoryManager.createOptimizedGeometry('sphere', [radius, 8, 6], 'low'),
        material: material
      }
    ];

    const lodObject = new LODObject({
      levels,
      hysteresis: 5,
      cullingDistance: 100
    });

    lodObject.position.copy(position);
    this.registerLODObject(lodObject);
    
    return lodObject;
  }

  createTorusLOD(
    radius: number,
    tube: number,
    position: THREE.Vector3,
    material: THREE.Material
  ): LODObject {
    const levels: LODLevel[] = [
      {
        distance: 0,
        geometry: this.memoryManager.createOptimizedGeometry('torus', [radius, tube, 16, 100], 'high'),
        material: material
      },
      {
        distance: 30,
        geometry: this.memoryManager.createOptimizedGeometry('torus', [radius, tube, 8, 50], 'medium'),
        material: material
      },
      {
        distance: 60,
        geometry: this.memoryManager.createOptimizedGeometry('torus', [radius, tube, 6, 24], 'low'),
        material: material
      }
    ];

    const lodObject = new LODObject({
      levels,
      hysteresis: 5,
      cullingDistance: 120
    });

    lodObject.position.copy(position);
    this.registerLODObject(lodObject);
    
    return lodObject;
  }

  createIcosahedronLOD(
    radius: number,
    position: THREE.Vector3,
    material: THREE.Material
  ): LODObject {
    const levels: LODLevel[] = [
      {
        distance: 0,
        geometry: this.memoryManager.createOptimizedGeometry('icosahedron', [radius, 2], 'high'),
        material: material
      },
      {
        distance: 25,
        geometry: this.memoryManager.createOptimizedGeometry('icosahedron', [radius, 1], 'medium'),
        material: material
      },
      {
        distance: 50,
        geometry: this.memoryManager.createOptimizedGeometry('icosahedron', [radius, 0], 'low'),
        material: material
      }
    ];

    const lodObject = new LODObject({
      levels,
      hysteresis: 3,
      cullingDistance: 80
    });

    lodObject.position.copy(position);
    this.registerLODObject(lodObject);
    
    return lodObject;
  }

  createOctahedronLOD(
    radius: number,
    position: THREE.Vector3,
    material: THREE.Material
  ): LODObject {
    const levels: LODLevel[] = [
      {
        distance: 0,
        geometry: this.memoryManager.createOptimizedGeometry('octahedron', [radius, 2], 'high'),
        material: material
      },
      {
        distance: 25,
        geometry: this.memoryManager.createOptimizedGeometry('octahedron', [radius, 1], 'medium'),
        material: material
      },
      {
        distance: 50,
        geometry: this.memoryManager.createOptimizedGeometry('octahedron', [radius, 0], 'low'),
        material: material
      }
    ];

    const lodObject = new LODObject({
      levels,
      hysteresis: 3,
      cullingDistance: 80
    });

    lodObject.position.copy(position);
    this.registerLODObject(lodObject);
    
    return lodObject;
  }

  // Instanced geometry for repeated objects (massive performance boost)
  createInstancedLOD(
    baseGeometry: THREE.BufferGeometry,
    material: THREE.Material,
    positions: THREE.Vector3[],
    maxInstances: number = 1000
  ): THREE.InstancedMesh {
    const qualityLevel = this.performanceManager.getCurrentQuality();
    
    // Adjust instance count based on quality
    const instanceCounts = {
      high: maxInstances,
      medium: Math.floor(maxInstances * 0.7),
      low: Math.floor(maxInstances * 0.5)
    };

    const instanceCount = Math.min(positions.length, instanceCounts[qualityLevel]);
    const instancedMesh = new THREE.InstancedMesh(baseGeometry, material, instanceCount);

    const matrix = new THREE.Matrix4();
    
    for (let i = 0; i < instanceCount; i++) {
      const position = positions[i % positions.length];
      matrix.setPosition(position);
      instancedMesh.setMatrixAt(i, matrix);
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    instancedMesh.frustumCulled = true;

    return instancedMesh;
  }

  // Adaptive particle system
  createAdaptiveParticleSystem(
    particleCount: number,
    material: THREE.PointsMaterial
  ): THREE.Points {
    const qualitySettings = this.performanceManager.getQualitySettings();
    const adaptedCount = Math.min(particleCount, qualitySettings.maxParticles);

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(adaptedCount * 3);
    const colors = new Float32Array(adaptedCount * 3);

    for (let i = 0; i < adaptedCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;

      colors[i * 3] = Math.random();
      colors[i * 3 + 1] = Math.random();
      colors[i * 3 + 2] = Math.random();
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Optimize material for performance
    material.sizeAttenuation = true;
    material.vertexColors = true;
    material.transparent = true;
    material.alphaTest = 0.1;

    const particles = new THREE.Points(geometry, material);
    
    // Enable frustum culling
    particles.frustumCulled = true;

    return particles;
  }

  // Statistics and monitoring
  getStats() {
    return {
      registeredObjects: this.lodObjects.size,
      queueLength: this.updateQueue.length,
      maxUpdatesPerFrame: this.maxUpdatesPerFrame,
      currentUpdateIndex: this.currentUpdateIndex
    };
  }

  // Performance tuning
  adjustUpdateFrequency(performanceGrade: string) {
    switch (performanceGrade) {
      case 'excellent':
        this.maxUpdatesPerFrame = 8;
        break;
      case 'good':
        this.maxUpdatesPerFrame = 5;
        break;
      case 'poor':
        this.maxUpdatesPerFrame = 3;
        break;
      case 'critical':
        this.maxUpdatesPerFrame = 1;
        break;
    }
  }

  dispose() {
    this.lodObjects.clear();
    this.updateQueue.length = 0;
  }
}