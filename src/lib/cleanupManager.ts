import * as THREE from 'three';
import { MemoryManager } from './memoryManager';
import { OptimizationManager } from './optimizations';
import { PerformanceManager } from './performance';

export interface CleanupStats {
  geometriesDisposed: number;
  materialsDisposed: number;
  texturesDisposed: number;
  objectsTraversed: number;
  memoryFreed: number; // MB estimate
}

export class CleanupManager {
  private static instance: CleanupManager;
  private cleanupStats: CleanupStats = {
    geometriesDisposed: 0,
    materialsDisposed: 0,
    texturesDisposed: 0,
    objectsTraversed: 0,
    memoryFreed: 0
  };

  static getInstance(): CleanupManager {
    if (!CleanupManager.instance) {
      CleanupManager.instance = new CleanupManager();
    }
    return CleanupManager.instance;
  }

  /**
   * Comprehensive cleanup for Three.js objects with memory tracking
   */
  disposeObject3D(object: THREE.Object3D, sectionId?: string): CleanupStats {
    const startStats = { ...this.cleanupStats };
    
    object.traverse((child) => {
      this.cleanupStats.objectsTraversed++;
      
      // Cleanup meshes
      if (child instanceof THREE.Mesh) {
        this.disposeMesh(child);
      }
      
      // Cleanup lines
      if (child instanceof THREE.Line || child instanceof THREE.LineSegments) {
        this.disposeLine(child);
      }
      
      // Cleanup points
      if (child instanceof THREE.Points) {
        this.disposePoints(child);
      }
      
      // Cleanup lights
      if (child instanceof THREE.Light) {
        this.disposeLight(child);
      }
      
      // Cleanup cameras
      if (child instanceof THREE.Camera) {
        this.disposeCamera(child);
      }
    });

    // Remove from parent if it has one
    if (object.parent) {
      object.parent.remove(object);
    }

    const cleanupDelta: CleanupStats = {
      geometriesDisposed: this.cleanupStats.geometriesDisposed - startStats.geometriesDisposed,
      materialsDisposed: this.cleanupStats.materialsDisposed - startStats.materialsDisposed,
      texturesDisposed: this.cleanupStats.texturesDisposed - startStats.texturesDisposed,
      objectsTraversed: this.cleanupStats.objectsTraversed - startStats.objectsTraversed,
      memoryFreed: this.cleanupStats.memoryFreed - startStats.memoryFreed
    };

    if (sectionId) {
      console.log(`🧹 CleanupManager [${sectionId}]:`, cleanupDelta);
    }

    return cleanupDelta;
  }

  /**
   * Clean up geometry with memory tracking
   */
  disposeGeometry(geometry: THREE.BufferGeometry): void {
    if (!geometry) return;

    // Estimate memory usage before disposal
    const memoryEstimate = this.estimateGeometryMemory(geometry);
    
    geometry.dispose();
    this.cleanupStats.geometriesDisposed++;
    this.cleanupStats.memoryFreed += memoryEstimate;
  }

  /**
   * Clean up material with memory tracking
   */
  disposeMaterial(material: THREE.Material): void {
    if (!material) return;

    // Dispose all textures in the material
    Object.keys(material).forEach(key => {
      const value = (material as any)[key];
      if (value && value.isTexture) {
        this.disposeTexture(value);
      }
    });

    // Estimate memory usage
    const memoryEstimate = this.estimateMaterialMemory(material);
    
    material.dispose();
    this.cleanupStats.materialsDisposed++;
    this.cleanupStats.memoryFreed += memoryEstimate;
  }

  /**
   * Clean up texture with memory tracking
   */
  disposeTexture(texture: THREE.Texture): void {
    if (!texture) return;

    const memoryEstimate = this.estimateTextureMemory(texture);
    
    texture.dispose();
    this.cleanupStats.texturesDisposed++;
    this.cleanupStats.memoryFreed += memoryEstimate;
  }

  /**
   * Clean up mesh and its resources
   */
  private disposeMesh(mesh: THREE.Mesh): void {
    // Dispose geometry
    if (mesh.geometry) {
      this.disposeGeometry(mesh.geometry);
    }

    // Dispose materials
    if (mesh.material) {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(material => this.disposeMaterial(material));
      } else {
        this.disposeMaterial(mesh.material);
      }
    }

    // Clear morph targets
    if (mesh.morphTargetInfluences) {
      mesh.morphTargetInfluences.length = 0;
    }
  }

  /**
   * Clean up line and its resources
   */
  private disposeLine(line: THREE.Line | THREE.LineSegments): void {
    if (line.geometry) {
      this.disposeGeometry(line.geometry);
    }

    if (line.material) {
      if (Array.isArray(line.material)) {
        line.material.forEach(material => this.disposeMaterial(material));
      } else {
        this.disposeMaterial(line.material);
      }
    }
  }

  /**
   * Clean up points and its resources
   */
  private disposePoints(points: THREE.Points): void {
    if (points.geometry) {
      this.disposeGeometry(points.geometry);
    }

    if (points.material) {
      if (Array.isArray(points.material)) {
        points.material.forEach(material => this.disposeMaterial(material));
      } else {
        this.disposeMaterial(points.material);
      }
    }
  }

  /**
   * Clean up light resources
   */
  private disposeLight(light: THREE.Light): void {
    // Dispose shadow camera and map
    if (light.shadow) {
      if (light.shadow.camera) {
        this.disposeCamera(light.shadow.camera);
      }
      if (light.shadow.map) {
        light.shadow.map.dispose();
      }
      if (light.shadow.mapPass) {
        light.shadow.mapPass.dispose();
      }
    }
  }

  /**
   * Clean up camera resources
   */
  private disposeCamera(camera: THREE.Camera): void {
    // Cameras don't have much to dispose, but clear their matrices
    if ('view' in camera && camera.view) {
      camera.view = null;
    }
  }

  /**
   * Estimate geometry memory usage in MB
   */
  private estimateGeometryMemory(geometry: THREE.BufferGeometry): number {
    let bytes = 0;
    
    Object.keys(geometry.attributes).forEach(key => {
      const attribute = geometry.attributes[key];
      bytes += attribute.array.byteLength;
    });

    if (geometry.index) {
      bytes += geometry.index.array.byteLength;
    }

    return bytes / (1024 * 1024); // Convert to MB
  }

  /**
   * Estimate material memory usage in MB
   */
  private estimateMaterialMemory(material: THREE.Material): number {
    // Base material memory is minimal, most memory is in textures
    return 0.001; // 1KB estimate for material properties
  }

  /**
   * Estimate texture memory usage in MB
   */
  private estimateTextureMemory(texture: THREE.Texture): number {
    if (!texture.image) return 0;

    const width = texture.image.width || 512;
    const height = texture.image.height || 512;
    const channels = 4; // RGBA
    const bytes = width * height * channels;

    return bytes / (1024 * 1024); // Convert to MB
  }

  /**
   * Section-specific cleanup with integration to MemoryManager
   */
  cleanupSection(
    sectionId: string,
    geometries: THREE.BufferGeometry[],
    materials: { [key: string]: THREE.Material },
    textures?: THREE.Texture[]
  ): CleanupStats {
    const startStats = { ...this.cleanupStats };
    
    // Dispose geometries
    geometries.forEach(geometry => {
      if (geometry) this.disposeGeometry(geometry);
    });

    // Dispose materials
    Object.values(materials).forEach(material => {
      if (material) this.disposeMaterial(material);
    });

    // Dispose additional textures
    if (textures) {
      textures.forEach(texture => {
        if (texture) this.disposeTexture(texture);
      });
    }

    // Deactivate scene in memory manager
    const memoryManager = MemoryManager.getInstance();
    memoryManager.deactivateScene(sectionId);

    const cleanupDelta: CleanupStats = {
      geometriesDisposed: this.cleanupStats.geometriesDisposed - startStats.geometriesDisposed,
      materialsDisposed: this.cleanupStats.materialsDisposed - startStats.materialsDisposed,
      texturesDisposed: this.cleanupStats.texturesDisposed - startStats.texturesDisposed,
      objectsTraversed: this.cleanupStats.objectsTraversed - startStats.objectsTraversed,
      memoryFreed: this.cleanupStats.memoryFreed - startStats.memoryFreed
    };

    console.log(`🧹 CleanupManager [${sectionId}]: Freed ${cleanupDelta.memoryFreed.toFixed(2)}MB`, cleanupDelta);
    
    return cleanupDelta;
  }

  /**
   * Global cleanup - dispose all manager caches
   */
  globalCleanup(): CleanupStats {
    const startStats = { ...this.cleanupStats };
    
    try {
      // Trigger memory manager garbage collection
      const memoryManager = MemoryManager.getInstance();
      memoryManager.triggerGarbageCollection();

      // Clear optimization manager caches
      const optimizationManager = OptimizationManager.getInstance();
      optimizationManager.clearCaches();

      // Performance manager doesn't need disposal but we can reset adaptation
      const performanceManager = PerformanceManager.getInstance();
      performanceManager.setAdaptationEnabled(false);
      performanceManager.setAdaptationEnabled(true);

    } catch (error) {
      console.warn('CleanupManager: Error during global cleanup:', error);
    }

    const cleanupDelta: CleanupStats = {
      geometriesDisposed: this.cleanupStats.geometriesDisposed - startStats.geometriesDisposed,
      materialsDisposed: this.cleanupStats.materialsDisposed - startStats.materialsDisposed,
      texturesDisposed: this.cleanupStats.texturesDisposed - startStats.texturesDisposed,
      objectsTraversed: this.cleanupStats.objectsTraversed - startStats.objectsTraversed,
      memoryFreed: this.cleanupStats.memoryFreed - startStats.memoryFreed
    };

    console.log('🧹 CleanupManager: Global cleanup completed', this.cleanupStats);
    
    return cleanupDelta;
  }

  /**
   * Get current cleanup statistics
   */
  getStats(): CleanupStats {
    return { ...this.cleanupStats };
  }

  /**
   * Reset cleanup statistics
   */
  resetStats(): void {
    this.cleanupStats = {
      geometriesDisposed: 0,
      materialsDisposed: 0,
      texturesDisposed: 0,
      objectsTraversed: 0,
      memoryFreed: 0
    };
  }

  /**
   * GSAP animation cleanup helper
   */
  cleanupGSAPAnimations(targets: unknown[]): void {
    targets.forEach(target => {
      if (target && typeof target.kill === 'function') {
        target.kill();
      }
    });
  }

  /**
   * RAF cleanup helper
   */
  cleanupRAF(rafIds: (number | null)[]): void {
    rafIds.forEach(id => {
      if (id !== null) {
        cancelAnimationFrame(id);
      }
    });
  }

  /**
   * Event listener cleanup helper
   */
  cleanupEventListeners(
    cleanupFunctions: Array<() => void>
  ): void {
    cleanupFunctions.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.warn('CleanupManager: Error removing event listener:', error);
      }
    });
  }
}

// Export singleton instance for easy access
export const cleanupManager = CleanupManager.getInstance();