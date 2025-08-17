import * as THREE from 'three';
import { MemoryManager } from './memoryManager';
import { PerformanceManager, QualityLevel } from './performance';

export interface LoadableAsset {
  id: string;
  type: 'geometry' | 'texture' | 'material' | 'scene';
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedSize: number; // in MB
  dependencies: string[];
  loader: () => Promise<unknown>;
  onLoaded?: (asset: unknown) => void;
  onError?: (error: Error) => void;
}

export interface LoadingProgress {
  total: number;
  loaded: number;
  progress: number;
  currentAsset?: string;
  estimatedTimeRemaining: number;
}

export interface ScenePreloadConfig {
  sceneId: string;
  assets: LoadableAsset[];
  preloadDistance: number; // Distance to start preloading
  unloadDistance: number; // Distance to unload assets
}

export class ProgressiveLoader {
  private static instance: ProgressiveLoader;
  private memoryManager: MemoryManager;
  private performanceManager: PerformanceManager;
  private loadQueue: LoadableAsset[] = [];
  private loadedAssets: Map<string, unknown> = new Map();
  private loadingPromises: Map<string, Promise<unknown>> = new Map();
  private sceneConfigs: Map<string, ScenePreloadConfig> = new Map();
  private currentPosition = new THREE.Vector3();
  private loadingProgress: LoadingProgress = {
    total: 0,
    loaded: 0,
    progress: 0,
    estimatedTimeRemaining: 0
  };
  private loadStartTimes: Map<string, number> = new Map();
  private loadingSpeeds: number[] = []; // MB/s history
  private maxConcurrentLoads = 3;
  private activeLoads = 0;
  private bandwidthEstimate = 5; // MB/s initial estimate

  static getInstance(): ProgressiveLoader {
    if (!ProgressiveLoader.instance) {
      ProgressiveLoader.instance = new ProgressiveLoader();
    }
    return ProgressiveLoader.instance;
  }

  constructor() {
    this.memoryManager = MemoryManager.getInstance();
    this.performanceManager = PerformanceManager.getInstance();
    this.startLoadingLoop();
    this.estimateBandwidth();
  }

  // Bandwidth estimation for better loading predictions
  private async estimateBandwidth() {
    try {
      const startTime = performance.now();
      // Load a small test image to estimate bandwidth
      const testImage = new Image();
      testImage.src = 'data:image/jpeg;base64,' + 'A'.repeat(1024); // 1KB test
      
      await new Promise((resolve, reject) => {
        testImage.onload = resolve;
        testImage.onerror = reject;
      });
      
      const endTime = performance.now();
      const duration = (endTime - startTime) / 1000; // seconds
      this.bandwidthEstimate = Math.max(1, 0.001 / duration); // MB/s (very rough estimate)
    } catch {
      console.warn('Bandwidth estimation failed, using default');
    }
  }

  // Register scene configuration for progressive loading
  registerScene(config: ScenePreloadConfig) {
    this.sceneConfigs.set(config.sceneId, config);
    
    // Sort assets by priority and dependencies
    config.assets.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  // Update current position for distance-based loading
  updatePosition(position: THREE.Vector3) {
    this.currentPosition.copy(position);
    this.checkSceneProximity();
  }

  private checkSceneProximity() {
    this.sceneConfigs.forEach((config, sceneId) => {
      const scenePosition = this.getScenePosition(sceneId);
      const distance = this.currentPosition.distanceTo(scenePosition);
      
      if (distance <= config.preloadDistance) {
        this.preloadScene(sceneId);
      } else if (distance >= config.unloadDistance) {
        this.unloadScene(sceneId);
      }
    });
  }

  private getScenePosition(sceneId: string): THREE.Vector3 {
    // Map scene IDs to their 3D positions
    const scenePositions: Record<string, THREE.Vector3> = {
      'identity': new THREE.Vector3(0, 0, 0),
      'origin': new THREE.Vector3(0, -10, 0),
      'mission': new THREE.Vector3(0, -20, 0),
      'present': new THREE.Vector3(0, -30, 0),
      'vision': new THREE.Vector3(0, -40, 0),
      'cta': new THREE.Vector3(0, -50, 0)
    };
    
    return scenePositions[sceneId] || new THREE.Vector3();
  }

  // Preload scene assets
  async preloadScene(sceneId: string) {
    const config = this.sceneConfigs.get(sceneId);
    if (!config) return;

    console.log(`🚀 Preloading scene: ${sceneId}`);
    
    // Add critical assets to queue first
    const criticalAssets = config.assets.filter(asset => 
      asset.priority === 'critical' && !this.loadedAssets.has(asset.id)
    );
    
    this.addAssetsToQueue(criticalAssets);
    
    // Add other assets based on current performance
    const performanceGrade = this.performanceManager.getPerformanceGrade();
    if (performanceGrade === 'excellent' || performanceGrade === 'good') {
      const highPriorityAssets = config.assets.filter(asset => 
        asset.priority === 'high' && !this.loadedAssets.has(asset.id)
      );
      this.addAssetsToQueue(highPriorityAssets);
    }
  }

  private addAssetsToQueue(assets: LoadableAsset[]) {
    // Resolve dependencies first
    const sortedAssets = this.resolveDependencies(assets);
    
    sortedAssets.forEach(asset => {
      if (!this.loadQueue.find(queued => queued.id === asset.id)) {
        this.loadQueue.push(asset);
      }
    });
    
    this.updateLoadingProgress();
  }

  private resolveDependencies(assets: LoadableAsset[]): LoadableAsset[] {
    const resolved: LoadableAsset[] = [];
    const visited = new Set<string>();
    
    const resolve = (asset: LoadableAsset) => {
      if (visited.has(asset.id)) return;
      visited.add(asset.id);
      
      // Resolve dependencies first
      asset.dependencies.forEach(depId => {
        const dependency = assets.find(a => a.id === depId);
        if (dependency) {
          resolve(dependency);
        }
      });
      
      resolved.push(asset);
    };
    
    assets.forEach(resolve);
    return resolved;
  }

  // Unload scene assets
  private unloadScene(sceneId: string) {
    const config = this.sceneConfigs.get(sceneId);
    if (!config) return;

    console.log(`🗑️ Unloading scene: ${sceneId}`);
    
    config.assets.forEach(asset => {
      const loadedAsset = this.loadedAssets.get(asset.id);
      if (loadedAsset && asset.priority !== 'critical') {
        // Don't unload critical assets
        this.disposeAsset(loadedAsset, asset.type);
        this.loadedAssets.delete(asset.id);
      }
    });
    
    // Trigger garbage collection
    this.memoryManager.triggerGarbageCollection();
  }

  private disposeAsset(asset: unknown, type: string) {
    switch (type) {
      case 'geometry':
        if (asset instanceof THREE.BufferGeometry) {
          asset.dispose();
        }
        break;
      case 'texture':
        if (asset instanceof THREE.Texture) {
          asset.dispose();
        }
        break;
      case 'material':
        if (asset instanceof THREE.Material) {
          asset.dispose();
        }
        break;
      case 'scene':
        if (asset instanceof THREE.Object3D) {
          this.memoryManager.disposeObject(asset);
        }
        break;
    }
  }

  // Main loading loop
  private startLoadingLoop() {
    const processQueue = async () => {
      while (this.loadQueue.length > 0 && this.activeLoads < this.maxConcurrentLoads) {
        const asset = this.loadQueue.shift()!;
        
        // Check if asset is already loaded or loading
        if (this.loadedAssets.has(asset.id) || this.loadingPromises.has(asset.id)) {
          continue;
        }
        
        this.loadAsset(asset);
      }
      
      // Adjust concurrent loads based on performance
      this.adjustConcurrentLoads();
      
      requestAnimationFrame(processQueue);
    };
    
    processQueue();
  }

  private async loadAsset(asset: LoadableAsset) {
    this.activeLoads++;
    this.loadStartTimes.set(asset.id, performance.now());
    this.loadingProgress.currentAsset = asset.id;
    
    try {
      const loadPromise = asset.loader();
      this.loadingPromises.set(asset.id, loadPromise);
      
      const loadedAsset = await loadPromise;
      
      // Apply quality optimizations
      const optimizedAsset = this.optimizeAsset(loadedAsset, asset.type);
      
      this.loadedAssets.set(asset.id, optimizedAsset);
      this.loadingPromises.delete(asset.id);
      
      // Update bandwidth estimate
      this.updateBandwidthEstimate(asset);
      
      // Update progress
      this.loadingProgress.loaded++;
      this.updateLoadingProgress();
      
      if (asset.onLoaded) {
        asset.onLoaded(optimizedAsset);
      }
      
      console.log(`✅ Loaded asset: ${asset.id}`);
      
    } catch (error) {
      console.error(`❌ Failed to load asset: ${asset.id}`, error);
      this.loadingPromises.delete(asset.id);
      
      if (asset.onError) {
        asset.onError(error as Error);
      }
    } finally {
      this.activeLoads--;
    }
  }

  private updateBandwidthEstimate(asset: LoadableAsset) {
    const startTime = this.loadStartTimes.get(asset.id);
    if (!startTime) return;
    
    const duration = (performance.now() - startTime) / 1000; // seconds
    const speed = asset.estimatedSize / duration; // MB/s
    
    this.loadingSpeeds.push(speed);
    if (this.loadingSpeeds.length > 10) {
      this.loadingSpeeds.shift();
    }
    
    // Calculate moving average
    this.bandwidthEstimate = this.loadingSpeeds.reduce((a, b) => a + b, 0) / this.loadingSpeeds.length;
  }

  private optimizeAsset(asset: unknown, type: string): unknown {
    const qualityLevel = this.performanceManager.getCurrentQuality();
    
    switch (type) {
      case 'geometry':
        if (asset instanceof THREE.BufferGeometry) {
          return this.optimizeGeometry(asset, qualityLevel);
        }
        break;
      case 'texture':
        if (asset instanceof THREE.Texture) {
          return this.optimizeTexture(asset, qualityLevel);
        }
        break;
      case 'material':
        return this.optimizeMaterial(asset, qualityLevel);
    }
    
    return asset;
  }

  private optimizeGeometry(geometry: THREE.BufferGeometry, quality: QualityLevel): THREE.BufferGeometry {
    // Simplify geometry based on quality
    const qualitySettings = this.performanceManager.getQualitySettings(quality);
    
    if (geometry.attributes.position.count > qualitySettings.maxPolygons) {
      // Simple decimation - in production you'd use a proper decimation algorithm
      const ratio = qualitySettings.maxPolygons / geometry.attributes.position.count;
      console.warn(`Geometry simplified by ratio: ${ratio.toFixed(2)}`);
    }
    
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    
    return geometry;
  }

  private optimizeTexture(texture: THREE.Texture, quality: QualityLevel): THREE.Texture {
    // Quality settings optimization
    this.performanceManager.getQualitySettings(quality);
    
    // Apply quality-based filtering
    const filterModes = {
      high: { min: THREE.LinearMipmapLinearFilter, mag: THREE.LinearFilter },
      medium: { min: THREE.LinearMipmapNearestFilter, mag: THREE.LinearFilter },
      low: { min: THREE.NearestFilter, mag: THREE.NearestFilter }
    };
    
    const filter = filterModes[quality];
    texture.minFilter = filter.min;
    texture.magFilter = filter.mag;
    texture.generateMipmaps = quality !== 'low';
    
    return texture;
  }

  private optimizeMaterial(material: THREE.Material, quality: QualityLevel): THREE.Material {
    // Simplify material based on quality
    if (material instanceof THREE.MeshStandardMaterial) {
      if (quality === 'low') {
        // Convert to basic material for better performance
        const basicMaterial = new THREE.MeshBasicMaterial({
          color: material.color,
          map: material.map,
          transparent: material.transparent,
          opacity: material.opacity
        });
        return basicMaterial;
      }
    }
    
    return material;
  }

  private adjustConcurrentLoads() {
    const performanceGrade = this.performanceManager.getPerformanceGrade();
    
    switch (performanceGrade) {
      case 'excellent':
        this.maxConcurrentLoads = 4;
        break;
      case 'good':
        this.maxConcurrentLoads = 3;
        break;
      case 'poor':
        this.maxConcurrentLoads = 2;
        break;
      case 'critical':
        this.maxConcurrentLoads = 1;
        break;
    }
  }

  private updateLoadingProgress() {
    this.loadingProgress.total = this.loadQueue.length + this.loadingProgress.loaded;
    this.loadingProgress.progress = this.loadingProgress.total > 0 
      ? this.loadingProgress.loaded / this.loadingProgress.total 
      : 1;
    
    // Estimate time remaining
    const remainingAssets = this.loadQueue.length;
    const avgAssetSize = this.loadQueue.reduce((sum, asset) => sum + asset.estimatedSize, 0) / remainingAssets || 0;
    this.loadingProgress.estimatedTimeRemaining = (remainingAssets * avgAssetSize) / this.bandwidthEstimate;
  }

  // Public API
  async loadAssetById(assetId: string): Promise<unknown> {
    if (this.loadedAssets.has(assetId)) {
      return this.loadedAssets.get(assetId);
    }
    
    if (this.loadingPromises.has(assetId)) {
      return this.loadingPromises.get(assetId);
    }
    
    throw new Error(`Asset not found: ${assetId}`);
  }

  isAssetLoaded(assetId: string): boolean {
    return this.loadedAssets.has(assetId);
  }

  getLoadingProgress(): LoadingProgress {
    return { ...this.loadingProgress };
  }

  // Preload critical assets immediately
  async preloadCriticalAssets(): Promise<void> {
    const criticalAssets: LoadableAsset[] = [];
    
    this.sceneConfigs.forEach(config => {
      config.assets.forEach(asset => {
        if (asset.priority === 'critical') {
          criticalAssets.push(asset);
        }
      });
    });
    
    this.addAssetsToQueue(criticalAssets);
    
    // Wait for all critical assets to load
    await Promise.all(
      criticalAssets.map(asset => this.loadingPromises.get(asset.id))
    );
  }

  // Factory methods for creating common assets
  createGeometryAsset(
    id: string,
    type: 'sphere' | 'box' | 'torus',
    params: number[],
    priority: 'critical' | 'high' | 'medium' | 'low' = 'medium'
  ): LoadableAsset {
    return {
      id,
      type: 'geometry',
      priority,
      estimatedSize: 0.1, // MB estimate
      dependencies: [],
      loader: async () => {
        return this.memoryManager.createOptimizedGeometry(type, params);
      }
    };
  }

  createTextureAsset(
    id: string,
    url: string,
    priority: 'critical' | 'high' | 'medium' | 'low' = 'medium'
  ): LoadableAsset {
    return {
      id,
      type: 'texture',
      priority,
      estimatedSize: 0.5, // MB estimate
      dependencies: [],
      loader: async () => {
        return this.memoryManager.loadOptimizedTexture(url);
      }
    };
  }

  getStats() {
    return {
      queueLength: this.loadQueue.length,
      loadedAssets: this.loadedAssets.size,
      activeLoads: this.activeLoads,
      maxConcurrentLoads: this.maxConcurrentLoads,
      bandwidthEstimate: this.bandwidthEstimate,
      progress: this.loadingProgress,
      registeredScenes: this.sceneConfigs.size
    };
  }

  dispose() {
    // Cancel all loading promises
    this.loadingPromises.clear();
    
    // Dispose all loaded assets
    this.loadedAssets.forEach((asset, id) => {
      const config = Array.from(this.sceneConfigs.values())
        .flatMap(c => c.assets)
        .find(a => a.id === id);
      
      if (config) {
        this.disposeAsset(asset, config.type);
      }
    });
    
    this.loadedAssets.clear();
    this.loadQueue.length = 0;
    this.sceneConfigs.clear();
  }
}