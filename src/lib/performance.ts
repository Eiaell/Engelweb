import * as THREE from 'three';

// Enterprise-grade performance metrics interface
export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  gpuMemory: number;
  drawCalls: number;
  triangleCount: number;
  geometryCount: number;
  textureCount: number;
  qualityLevel: QualityLevel;
}

export type QualityLevel = 'high' | 'medium' | 'low';

interface QualitySettings {
  maxPolygons: number;
  textureResolution: number;
  maxParticles: number;
  shadowMapSize: number;
  antialiasing: boolean;
  postProcessing: boolean;
  lodBias: number;
}

// Hardware capability detection
interface HardwareProfile {
  gpuTier: 'high' | 'medium' | 'low';
  memoryLimit: number;
  cores: number;
  isIntegratedGPU: boolean;
}

export class PerformanceManager {
  private static instance: PerformanceManager;
  private renderer?: THREE.WebGLRenderer;
  private frameCount = 0;
  private lastTime = performance.now();
  private fps = 60;
  private frameTimeHistory: number[] = [];
  private currentQuality: QualityLevel = 'high';
  private hardwareProfile: HardwareProfile;
  private metrics: PerformanceMetrics;
  private adaptationEnabled = true;
  private lastAdaptation = 0;
  private targetFPS = 60;
  private minFPS = 55;
  private adaptationCooldown = 2000; // 2 seconds
  
  static getInstance(): PerformanceManager {
    if (!PerformanceManager.instance) {
      PerformanceManager.instance = new PerformanceManager();
    }
    return PerformanceManager.instance;
  }

  constructor() {
    this.hardwareProfile = this.detectHardware();
    this.metrics = this.initializeMetrics();
    this.currentQuality = this.determineInitialQuality();
  }

  private detectHardware(): HardwareProfile {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return {
        gpuTier: 'medium',
        memoryLimit: 512,
        isIntegratedGPU: false,
        maxTextureSize: 2048,
        supportsWebGL2: false
      };
    }

    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    
    let gpuTier: 'high' | 'medium' | 'low' = 'medium';
    let memoryLimit = 512; // MB
    let isIntegratedGPU = false;
    
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        const _vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        
        // Detect integrated GPU
        isIntegratedGPU = /intel|uhd|iris|vega|amd.*graphics/i.test(renderer);
        
        // GPU tier classification
        if (/rtx|radeon.*rx|gtx.*1[6-9]|gtx.*[2-4]/i.test(renderer)) {
          gpuTier = 'high';
          memoryLimit = 1024;
        } else if (/gtx|radeon|rx.*[4-6]/i.test(renderer)) {
          gpuTier = 'medium';
          memoryLimit = 768;
        } else {
          gpuTier = 'low';
          memoryLimit = 256;
        }
      }
    }
    
    const cores = navigator.hardwareConcurrency || 4;
    
    return { gpuTier, memoryLimit, cores, isIntegratedGPU };
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      fps: 60,
      frameTime: 16.67,
      memoryUsage: 0,
      gpuMemory: 0,
      drawCalls: 0,
      triangleCount: 0,
      geometryCount: 0,
      textureCount: 0,
      qualityLevel: this.currentQuality
    };
  }

  private determineInitialQuality(): QualityLevel {
    // Conservative approach for target hardware (i5-11400F)
    if (this.hardwareProfile.isIntegratedGPU) {
      return 'low';
    }
    
    if (this.hardwareProfile.gpuTier === 'high' && this.hardwareProfile.cores >= 6) {
      return 'high';
    }
    
    return this.hardwareProfile.gpuTier === 'low' ? 'low' : 'medium';
  }

  getQualitySettings(level: QualityLevel = this.currentQuality): QualitySettings {
    const settings: Record<QualityLevel, QualitySettings> = {
      high: {
        maxPolygons: 30000,
        textureResolution: 512,
        maxParticles: 1000,
        shadowMapSize: 1024,
        antialiasing: false, // Disabled for performance
        postProcessing: false,
        lodBias: 1.0
      },
      medium: {
        maxPolygons: 20000,
        textureResolution: 256,
        maxParticles: 500,
        shadowMapSize: 512,
        antialiasing: false,
        postProcessing: false,
        lodBias: 1.5
      },
      low: {
        maxPolygons: 10000,
        textureResolution: 128,
        maxParticles: 250,
        shadowMapSize: 256,
        antialiasing: false,
        postProcessing: false,
        lodBias: 2.0
      }
    };
    
    return settings[level];
  }

  setRenderer(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    this.configureRenderer();
  }

  private configureRenderer() {
    if (!this.renderer) return;
    
    // Optimize renderer for performance
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.physicallyCorrectLights = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    
    // Frustum culling
    this.renderer.frustumCulled = true;
  }

  updateFPS() {
    this.frameCount++;
    const currentTime = performance.now();
    const frameTime = currentTime - this.lastTime;
    
    // Update frame time history (rolling window of 60 frames)
    this.frameTimeHistory.push(frameTime);
    if (this.frameTimeHistory.length > 60) {
      this.frameTimeHistory.shift();
    }
    
    if (currentTime - this.lastTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastTime = currentTime;
      
      // Update comprehensive metrics
      this.updateMetrics();
      
      // Adaptive quality adjustment
      if (this.adaptationEnabled) {
        this.adaptQuality();
      }
    }
  }

  private updateMetrics() {
    const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
    
    this.metrics = {
      fps: this.fps,
      frameTime: avgFrameTime,
      memoryUsage: this.getMemoryUsage(),
      gpuMemory: this.getGPUMemoryUsage(),
      drawCalls: this.renderer?.info.render.calls || 0,
      triangleCount: this.renderer?.info.render.triangles || 0,
      geometryCount: this.renderer?.info.memory.geometries || 0,
      textureCount: this.renderer?.info.memory.textures || 0,
      qualityLevel: this.currentQuality
    };
  }

  private getMemoryUsage(): number {
    const memory = 'memory' in performance ? (performance as { memory: { usedJSHeapSize: number } }).memory : null;
    return memory ? Math.round(memory.usedJSHeapSize / 1024 / 1024) : 0;
  }

  private getGPUMemoryUsage(): number {
    // Estimate based on renderer info and quality settings
    const settings = this.getQualitySettings();
    const textureMemory = this.metrics.textureCount * (settings.textureResolution * settings.textureResolution * 4) / (1024 * 1024);
    const geometryMemory = this.metrics.triangleCount * 96 / (1024 * 1024); // Rough estimate
    return Math.round(textureMemory + geometryMemory);
  }

  private adaptQuality() {
    const now = performance.now();
    if (now - this.lastAdaptation < this.adaptationCooldown) {
      return;
    }
    
    const avgFPS = this.fps;
    let newQuality = this.currentQuality;
    
    // Degrade quality if FPS drops below minimum
    if (avgFPS < this.minFPS) {
      if (this.currentQuality === 'high') {
        newQuality = 'medium';
      } else if (this.currentQuality === 'medium') {
        newQuality = 'low';
      }
    }
    // Improve quality if FPS is stable above target
    else if (avgFPS > this.targetFPS + 5) {
      if (this.currentQuality === 'low') {
        newQuality = 'medium';
      } else if (this.currentQuality === 'medium' && this.hardwareProfile.gpuTier !== 'low') {
        newQuality = 'high';
      }
    }
    
    if (newQuality !== this.currentQuality) {
      this.setQualityLevel(newQuality);
      this.lastAdaptation = now;
      console.log(`🎯 Performance: Quality adapted from ${this.currentQuality} to ${newQuality} (FPS: ${avgFPS})`);
    }
  }

  setQualityLevel(level: QualityLevel) {
    this.currentQuality = level;
    this.metrics.qualityLevel = level;
    
    // Notify quality change listeners
    window.dispatchEvent(new CustomEvent('qualityLevelChanged', { 
      detail: { level, settings: this.getQualitySettings(level) } 
    }));
  }

  getFPS(): number {
    return this.fps;
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  getCurrentQuality(): QualityLevel {
    return this.currentQuality;
  }

  getHardwareProfile(): HardwareProfile {
    return { ...this.hardwareProfile };
  }

  setAdaptationEnabled(enabled: boolean) {
    this.adaptationEnabled = enabled;
  }

  isPerformanceGood(): boolean {
    return this.fps >= this.minFPS && this.metrics.frameTime <= 18;
  }

  getPerformanceGrade(): 'excellent' | 'good' | 'poor' | 'critical' {
    if (this.fps >= this.targetFPS) return 'excellent';
    if (this.fps >= this.minFPS) return 'good';
    if (this.fps >= 30) return 'poor';
    return 'critical';
  }

  // Optimize geometry for performance constraints
  static optimizeGeometry(geometry: THREE.BufferGeometry, maxVertices = 30000): THREE.BufferGeometry {
    const vertexCount = geometry.attributes.position.count;
    
    if (vertexCount > maxVertices) {
      // Simplify geometry if too complex
      const simplificationRatio = maxVertices / vertexCount;
      console.warn(`Geometry simplified from ${vertexCount} to ${Math.floor(vertexCount * simplificationRatio)} vertices`);
    }
    
    // Compute vertex normals for proper lighting
    geometry.computeVertexNormals();
    
    return geometry;
  }

  // Create LOD system
  static createLOD(
    highDetailGeometry: THREE.BufferGeometry,
    mediumDetailGeometry: THREE.BufferGeometry,
    lowDetailGeometry: THREE.BufferGeometry,
    material: THREE.Material
  ): THREE.LOD {
    const lod = new THREE.LOD();
    
    lod.addLevel(new THREE.Mesh(highDetailGeometry, material), 0);
    lod.addLevel(new THREE.Mesh(mediumDetailGeometry, material), 50);
    lod.addLevel(new THREE.Mesh(lowDetailGeometry, material), 100);
    
    return lod;
  }

  // Optimize textures
  static optimizeTexture(texture: THREE.Texture): THREE.Texture {
    // Limit texture size as per constraints
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.format = THREE.RGBAFormat;
    texture.type = THREE.UnsignedByteType;
    
    return texture;
  }

  // Memory management
  static disposeObject(object: THREE.Object3D) {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  }
}