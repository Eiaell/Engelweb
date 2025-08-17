'use client';

import * as THREE from 'three';
import { MobileProfile, MobileOptimizations } from './mobileDetection';

/**
 * Mobile-specific 3D optimizations following CLAUDE.md constraints
 * Ensures 60fps performance on mobile devices
 */

export interface MobileSceneSettings {
  polygonLimit: number;
  particleLimit: number;
  textureResolution: number;
  enableShadows: boolean;
  enableParticles: boolean;
  enablePostProcessing: boolean;
  lightCount: number;
  lodBias: number;
  frameRate: number;
}

export class MobileOptimizer {
  private static instance: MobileOptimizer;
  
  static getInstance(): MobileOptimizer {
    if (!MobileOptimizer.instance) {
      MobileOptimizer.instance = new MobileOptimizer();
    }
    return MobileOptimizer.instance;
  }

  /**
   * Get optimized scene settings based on mobile profile
   */
  getSceneSettings(profile: MobileProfile, optimizations: MobileOptimizations): MobileSceneSettings {
    const { isMobile, performance } = profile;
    const { maxPolygons, particleCount, textureResolution, shadowQuality, enableParticles } = optimizations;

    // Base settings following CLAUDE.md constraints
    let settings: MobileSceneSettings = {
      polygonLimit: Math.min(maxPolygons, 30000), // MAX 30k per constraints
      particleLimit: Math.min(particleCount, 1000), // MAX 1000 per constraints  
      textureResolution: Math.min(textureResolution, 512), // MAX 512x512 per constraints
      enableShadows: shadowQuality !== 'none',
      enableParticles: enableParticles,
      enablePostProcessing: false, // Disabled per constraints
      lightCount: 3, // MAX 3 per constraints
      lodBias: optimizations.lodBias,
      frameRate: optimizations.frameRate
    };

    // Mobile-specific adjustments
    if (isMobile) {
      settings = {
        ...settings,
        polygonLimit: Math.min(settings.polygonLimit, 15000), // More aggressive on mobile
        particleLimit: Math.min(settings.particleLimit, 500),
        textureResolution: Math.min(settings.textureResolution, 256),
        enableShadows: performance.tier !== 'low', // Disable shadows on low-end mobile
        lightCount: performance.tier === 'low' ? 2 : 3
      };
    }

    // Low-end device adjustments
    if (performance.tier === 'low') {
      settings = {
        ...settings,
        polygonLimit: Math.min(settings.polygonLimit, 8000),
        particleLimit: Math.min(settings.particleLimit, 200),
        textureResolution: 128,
        enableShadows: false,
        enableParticles: false,
        lightCount: 2,
        frameRate: 30
      };
    }

    return settings;
  }

  /**
   * Create mobile-optimized geometry with LOD
   */
  createOptimizedGeometry(
    baseGeometry: THREE.BufferGeometry,
    settings: MobileSceneSettings,
    lodLevels: number = 3
  ): { geometry: THREE.BufferGeometry; lod?: THREE.LOD } {
    const vertices = baseGeometry.attributes.position.count;
    
    if (vertices <= settings.polygonLimit) {
      return { geometry: baseGeometry };
    }

    // Create simplified versions for LOD
    const highDetail = this.simplifyGeometry(baseGeometry, Math.min(vertices, settings.polygonLimit));
    const mediumDetail = this.simplifyGeometry(baseGeometry, settings.polygonLimit * 0.6);
    const lowDetail = this.simplifyGeometry(baseGeometry, settings.polygonLimit * 0.3);

    // Create LOD if multiple levels needed
    if (lodLevels > 1) {
      const lod = new THREE.LOD();
      
      // Dummy material - will be replaced by actual material
      const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
      
      lod.addLevel(new THREE.Mesh(highDetail, material), 0);
      lod.addLevel(new THREE.Mesh(mediumDetail, material), 50);
      lod.addLevel(new THREE.Mesh(lowDetail, material), 100);

      return { geometry: highDetail, lod };
    }

    return { geometry: highDetail };
  }

  /**
   * Simplify geometry by reducing vertex count
   */
  private simplifyGeometry(geometry: THREE.BufferGeometry, targetVertices: number): THREE.BufferGeometry {
    const currentVertices = geometry.attributes.position.count;
    
    if (currentVertices <= targetVertices) {
      return geometry.clone();
    }

    // Simple decimation - take every nth vertex
    const ratio = targetVertices / currentVertices;
    const step = Math.ceil(1 / ratio);
    
    const positions = geometry.attributes.position.array;
    const normals = geometry.attributes.normal?.array;
    const uvs = geometry.attributes.uv?.array;
    
    const newPositions: number[] = [];
    const newNormals: number[] = [];
    const newUvs: number[] = [];
    
    for (let i = 0; i < currentVertices; i += step) {
      const idx = i * 3;
      const uvIdx = i * 2;
      
      newPositions.push(positions[idx], positions[idx + 1], positions[idx + 2]);
      
      if (normals) {
        newNormals.push(normals[idx], normals[idx + 1], normals[idx + 2]);
      }
      
      if (uvs) {
        newUvs.push(uvs[uvIdx], uvs[uvIdx + 1]);
      }
    }
    
    const simplified = new THREE.BufferGeometry();
    simplified.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
    
    if (newNormals.length > 0) {
      simplified.setAttribute('normal', new THREE.Float32BufferAttribute(newNormals, 3));
    } else {
      simplified.computeVertexNormals();
    }
    
    if (newUvs.length > 0) {
      simplified.setAttribute('uv', new THREE.Float32BufferAttribute(newUvs, 2));
    }
    
    return simplified;
  }

  /**
   * Create mobile-optimized particle system
   */
  createOptimizedParticles(
    baseCount: number,
    settings: MobileSceneSettings,
    distribution: 'sphere' | 'torus' | 'plane' = 'sphere'
  ): THREE.BufferGeometry | null {
    if (!settings.enableParticles) {
      return null;
    }

    const particleCount = Math.min(baseCount, settings.particleLimit);
    const geometry = new THREE.BufferGeometry();
    
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Position based on distribution pattern
      switch (distribution) {
        case 'torus':
          const u = Math.random() * Math.PI * 2;
          const v = Math.random() * Math.PI * 2;
          const R = 2.5; // Major radius
          const r = 0.8; // Minor radius
          
          positions[i3] = (R + r * Math.cos(v)) * Math.cos(u);
          positions[i3 + 1] = r * Math.sin(v);
          positions[i3 + 2] = (R + r * Math.cos(v)) * Math.sin(u);
          break;
          
        case 'plane':
          positions[i3] = (Math.random() - 0.5) * 10;
          positions[i3 + 1] = (Math.random() - 0.5) * 10;
          positions[i3 + 2] = Math.random() * 2;
          break;
          
        case 'sphere':
        default:
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          const radius = 2 + Math.random() * 2;
          
          positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
          positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
          positions[i3 + 2] = radius * Math.cos(phi);
          break;
      }
      
      // Random velocities
      velocities[i3] = (Math.random() - 0.5) * 0.02;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.02;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;
      
      // Particle sizes
      sizes[i] = Math.random() * 0.03 + 0.01;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    return geometry;
  }

  /**
   * Create mobile-optimized material
   */
  createOptimizedMaterial(
    type: 'standard' | 'lambert' | 'basic',
    options: {
      color?: string | number;
      transparent?: boolean;
      opacity?: number;
      metalness?: number;
      roughness?: number;
      map?: THREE.Texture;
    },
    settings: MobileSceneSettings
  ): THREE.Material {
    const { color = 0xffffff, transparent = false, opacity = 1, map } = options;
    
    // Use simpler materials on low-end devices
    if (settings.frameRate === 30 || !settings.enableShadows) {
      if (type === 'standard') {
        type = 'lambert'; // Downgrade to Lambert for performance
      }
    }
    
    let material: THREE.Material;
    
    switch (type) {
      case 'standard':
        material = new THREE.MeshStandardMaterial({
          color,
          transparent,
          opacity,
          metalness: options.metalness || 0,
          roughness: options.roughness || 1,
          map: map ? this.optimizeTexture(map, settings) : undefined
        });
        break;
        
      case 'lambert':
        material = new THREE.MeshLambertMaterial({
          color,
          transparent,
          opacity,
          map: map ? this.optimizeTexture(map, settings) : undefined
        });
        break;
        
      case 'basic':
      default:
        material = new THREE.MeshBasicMaterial({
          color,
          transparent,
          opacity,
          map: map ? this.optimizeTexture(map, settings) : undefined
        });
        break;
    }
    
    return material;
  }

  /**
   * Optimize texture for mobile rendering
   */
  private optimizeTexture(texture: THREE.Texture, _settings: MobileSceneSettings): THREE.Texture {
    // Clone texture to avoid modifying original
    const optimized = texture.clone();
    
    // Set mobile-appropriate filtering
    optimized.minFilter = THREE.LinearMipmapLinearFilter;
    optimized.magFilter = THREE.LinearFilter;
    optimized.generateMipmaps = true;
    
    // Limit texture size based on settings
    optimized.format = THREE.RGBAFormat;
    optimized.type = THREE.UnsignedByteType;
    
    return optimized;
  }

  /**
   * Create mobile-optimized lighting setup
   */
  createOptimizedLighting(settings: MobileSceneSettings): THREE.Light[] {
    const lights: THREE.Light[] = [];
    
    // Always include ambient light
    const ambientLight = new THREE.AmbientLight(0xF8F9FA, 0.4);
    lights.push(ambientLight);
    
    if (settings.lightCount >= 2) {
      // Key light with conditional shadows
      const keyLight = new THREE.DirectionalLight(0xE94560, 0.7);
      keyLight.position.set(10, 10, 5);
      
      if (settings.enableShadows) {
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = Math.min(settings.textureResolution, 512);
        keyLight.shadow.mapSize.height = Math.min(settings.textureResolution, 512);
        keyLight.shadow.camera.far = 30;
        keyLight.shadow.camera.left = -10;
        keyLight.shadow.camera.right = 10;
        keyLight.shadow.camera.top = 10;
        keyLight.shadow.camera.bottom = -10;
        keyLight.shadow.bias = -0.0001;
      }
      
      lights.push(keyLight);
    }
    
    if (settings.lightCount >= 3) {
      // Fill light
      const fillLight = new THREE.DirectionalLight(0xF7B801, 0.5);
      fillLight.position.set(-5, 3, 8);
      lights.push(fillLight);
    }
    
    return lights;
  }

  /**
   * Calculate optimal render settings for current performance
   */
  getOptimalRenderSettings(
    currentFPS: number,
    targetFPS: number,
    settings: MobileSceneSettings
  ): Partial<MobileSceneSettings> {
    const fpsRatio = currentFPS / targetFPS;
    
    if (fpsRatio < 0.8) {
      // Performance is poor, reduce quality
      return {
        polygonLimit: Math.floor(settings.polygonLimit * 0.8),
        particleLimit: Math.floor(settings.particleLimit * 0.7),
        enableShadows: false,
        lightCount: Math.max(2, settings.lightCount - 1)
      };
    } else if (fpsRatio > 1.2) {
      // Performance is good, can increase quality slightly
      return {
        polygonLimit: Math.min(30000, Math.floor(settings.polygonLimit * 1.1)),
        particleLimit: Math.min(1000, Math.floor(settings.particleLimit * 1.1)),
        enableShadows: true
      };
    }
    
    return {}; // No changes needed
  }

  /**
   * Dispose of mobile-optimized resources
   */
  disposeOptimizedResources(object: THREE.Object3D) {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => {
              if (material.map) material.map.dispose();
              material.dispose();
            });
          } else {
            if (child.material.map) child.material.map.dispose();
            child.material.dispose();
          }
        }
      }
      
      if (child instanceof THREE.Points) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      }
      
      if (child instanceof THREE.LOD) {
        // Clean up LOD levels
        child.levels.forEach(level => {
          this.disposeOptimizedResources(level.object);
        });
      }
    });
  }
}

// Export singleton instance
export const mobileOptimizer = MobileOptimizer.getInstance();