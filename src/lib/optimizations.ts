import * as THREE from 'three';
import { PerformanceConstraints } from '@/types';

// Performance constraints based on hardware specs
export const PERFORMANCE_CONSTRAINTS: PerformanceConstraints = {
  maxPolygons: 30000,
  maxTextureSize: 512,
  maxParticles: 1000,
  maxLights: 3,
  targetFPS: 60
};

export class OptimizationManager {
  private static instance: OptimizationManager;
  private objectPool: Map<string, THREE.Object3D[]> = new Map();
  private geometryCache: Map<string, THREE.BufferGeometry> = new Map();
  private materialCache: Map<string, THREE.Material> = new Map();
  private textureAtlas: THREE.Texture | null = null;

  static getInstance(): OptimizationManager {
    if (!OptimizationManager.instance) {
      OptimizationManager.instance = new OptimizationManager();
    }
    return OptimizationManager.instance;
  }

  // LOD System Implementation
  static createOptimizedLOD(
    baseGeometry: THREE.BufferGeometry,
    material: THREE.Material,
    lodLevels: number[] = [0, 50, 100]
  ): THREE.LOD {
    const lod = new THREE.LOD();
    
    // High detail (original)
    const highDetail = baseGeometry.clone();
    lod.addLevel(new THREE.Mesh(highDetail, material), lodLevels[0]);
    
    // Medium detail (50% vertices)
    const mediumDetail = OptimizationManager.simplifyGeometry(baseGeometry, 0.5);
    lod.addLevel(new THREE.Mesh(mediumDetail, material), lodLevels[1]);
    
    // Low detail (25% vertices)
    const lowDetail = OptimizationManager.simplifyGeometry(baseGeometry, 0.25);
    lod.addLevel(new THREE.Mesh(lowDetail, material), lodLevels[2]);
    
    return lod;
  }

  // Geometry simplification for LOD
  static simplifyGeometry(
    geometry: THREE.BufferGeometry, 
    ratio: number
  ): THREE.BufferGeometry {
    const simplified = geometry.clone();
    const positions = simplified.attributes.position;
    const vertexCount = positions.count;
    const targetCount = Math.floor(vertexCount * ratio);
    
    if (targetCount >= vertexCount) return simplified;
    
    // Simple vertex decimation (can be improved with more sophisticated algorithms)
    const stride = Math.floor(vertexCount / targetCount);
    const newPositions = new Float32Array(targetCount * 3);
    const newNormals = simplified.attributes.normal ? new Float32Array(targetCount * 3) : null;
    const newUvs = simplified.attributes.uv ? new Float32Array(targetCount * 2) : null;
    
    let newIndex = 0;
    for (let i = 0; i < vertexCount; i += stride) {
      if (newIndex >= targetCount) break;
      
      // Copy position
      newPositions[newIndex * 3] = positions.getX(i);
      newPositions[newIndex * 3 + 1] = positions.getY(i);
      newPositions[newIndex * 3 + 2] = positions.getZ(i);
      
      // Copy normal if exists
      if (newNormals && simplified.attributes.normal) {
        newNormals[newIndex * 3] = simplified.attributes.normal.getX(i);
        newNormals[newIndex * 3 + 1] = simplified.attributes.normal.getY(i);
        newNormals[newIndex * 3 + 2] = simplified.attributes.normal.getZ(i);
      }
      
      // Copy UV if exists
      if (newUvs && simplified.attributes.uv) {
        newUvs[newIndex * 2] = simplified.attributes.uv.getX(i);
        newUvs[newIndex * 2 + 1] = simplified.attributes.uv.getY(i);
      }
      
      newIndex++;
    }
    
    const newGeometry = new THREE.BufferGeometry();
    newGeometry.setAttribute('position', new THREE.BufferAttribute(newPositions, 3));
    
    if (newNormals) {
      newGeometry.setAttribute('normal', new THREE.BufferAttribute(newNormals, 3));
    } else {
      newGeometry.computeVertexNormals();
    }
    
    if (newUvs) {
      newGeometry.setAttribute('uv', new THREE.BufferAttribute(newUvs, 2));
    }
    
    return newGeometry;
  }

  // Instanced geometry for repeated elements
  static createInstancedMesh(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    count: number
  ): THREE.InstancedMesh {
    const instancedMesh = new THREE.InstancedMesh(geometry, material, count);
    
    // Set up instance matrices
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      // Default identity matrix - positions should be set by user
      matrix.identity();
      instancedMesh.setMatrixAt(i, matrix);
    }
    
    instancedMesh.instanceMatrix.needsUpdate = true;
    return instancedMesh;
  }

  // Object pooling for dynamic objects
  getPooledObject(type: string): THREE.Object3D | null {
    const pool = this.objectPool.get(type);
    if (pool && pool.length > 0) {
      return pool.pop() || null;
    }
    return null;
  }

  returnToPool(type: string, object: THREE.Object3D): void {
    if (!this.objectPool.has(type)) {
      this.objectPool.set(type, []);
    }
    
    // Reset object state
    object.position.set(0, 0, 0);
    object.rotation.set(0, 0, 0);
    object.scale.set(1, 1, 1);
    object.visible = false;
    
    this.objectPool.get(type)!.push(object);
  }

  // Geometry caching
  getCachedGeometry(key: string): THREE.BufferGeometry | null {
    return this.geometryCache.get(key) || null;
  }

  setCachedGeometry(key: string, geometry: THREE.BufferGeometry): void {
    this.geometryCache.set(key, geometry);
  }

  // Material caching
  getCachedMaterial(key: string): THREE.Material | null {
    return this.materialCache.get(key) || null;
  }

  setCachedMaterial(key: string, material: THREE.Material): void {
    this.materialCache.set(key, material);
  }

  // Texture atlasing
  createTextureAtlas(textures: THREE.Texture[], atlasSize: number = 512): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = atlasSize;
    canvas.height = atlasSize;
    const ctx = canvas.getContext('2d')!;
    
    const texturesPerRow = Math.ceil(Math.sqrt(textures.length));
    const textureSize = atlasSize / texturesPerRow;
    
    textures.forEach((texture, index) => {
      const row = Math.floor(index / texturesPerRow);
      const col = index % texturesPerRow;
      
      const x = col * textureSize;
      const y = row * textureSize;
      
      // Draw texture to atlas (simplified - would need proper image handling)
      ctx.fillStyle = `hsl(${index * 30}, 70%, 50%)`;
      ctx.fillRect(x, y, textureSize, textureSize);
    });
    
    const atlasTexture = new THREE.CanvasTexture(canvas);
    atlasTexture.generateMipmaps = true;
    atlasTexture.minFilter = THREE.LinearMipmapLinearFilter;
    atlasTexture.magFilter = THREE.LinearFilter;
    
    this.textureAtlas = atlasTexture;
    return atlasTexture;
  }

  // Frustum culling optimization
  static enableFrustumCulling(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.frustumCulled = true;
      }
    });
  }

  // Memory cleanup
  static dispose(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => {
              OptimizationManager.disposeMaterial(material);
            });
          } else {
            OptimizationManager.disposeMaterial(child.material);
          }
        }
      }
    });
  }

  private static disposeMaterial(material: THREE.Material): void {
    // Dispose textures
    Object.keys(material).forEach(key => {
      const value = (material as Record<string, unknown>)[key];
      if (value && value.isTexture) {
        value.dispose();
      }
    });
    
    material.dispose();
  }

  // Performance monitoring
  static getGeometryStats(scene: THREE.Scene): {
    totalVertices: number;
    totalTriangles: number;
    meshCount: number;
  } {
    let totalVertices = 0;
    let totalTriangles = 0;
    let meshCount = 0;
    
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        meshCount++;
        if (object.geometry) {
          const positions = object.geometry.attributes.position;
          if (positions) {
            totalVertices += positions.count;
            
            if (object.geometry.index) {
              totalTriangles += object.geometry.index.count / 3;
            } else {
              totalTriangles += positions.count / 3;
            }
          }
        }
      }
    });
    
    return { totalVertices, totalTriangles, meshCount };
  }

  // Clear all caches
  clearCaches(): void {
    // Dispose cached geometries
    this.geometryCache.forEach(geometry => geometry.dispose());
    this.geometryCache.clear();
    
    // Dispose cached materials
    this.materialCache.forEach(material => OptimizationManager.disposeMaterial(material));
    this.materialCache.clear();
    
    // Clear object pools
    this.objectPool.clear();
    
    // Dispose texture atlas
    if (this.textureAtlas) {
      this.textureAtlas.dispose();
      this.textureAtlas = null;
    }
  }
}