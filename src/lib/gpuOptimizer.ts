import * as THREE from 'three';
import { PerformanceManager, QualityLevel } from './performance';

export interface RenderBatch {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  instances: THREE.Matrix4[];
  count: number;
}

export interface CullingInfo {
  frustumCulled: boolean;
  occlusionCulled: boolean;
  distanceCulled: boolean;
  lastVisible: number;
}

export class GPUOptimizer {
  private static instance: GPUOptimizer;
  private renderer?: THREE.WebGLRenderer;
  private performanceManager: PerformanceManager;
  private renderBatches: Map<string, RenderBatch> = new Map();
  private cullingInfo: Map<THREE.Object3D, CullingInfo> = new Map();
  private instancedMeshes: Map<string, THREE.InstancedMesh> = new Map();
  private shaderCache: Map<string, THREE.Shader> = new Map();
  private uniformBuffers: Map<string, THREE.WebGLBuffer> = new Map();
  private drawCallCount = 0;
  private triangleCount = 0;
  private currentFrame = 0;

  static getInstance(): GPUOptimizer {
    if (!GPUOptimizer.instance) {
      GPUOptimizer.instance = new GPUOptimizer();
    }
    return GPUOptimizer.instance;
  }

  constructor() {
    this.performanceManager = PerformanceManager.getInstance();
  }

  setRenderer(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    this.configureRenderer();
  }

  private configureRenderer() {
    if (!this.renderer) return;

    const gl = this.renderer.getContext();
    const qualityLevel = this.performanceManager.getCurrentQuality();

    // Configure renderer for optimal performance
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.sortObjects = true; // Enable sorting for transparency
    this.renderer.frustumCulled = true;
    
    // Quality-based shadow configuration
    const shadowConfigs = {
      high: { enabled: true, type: THREE.PCFSoftShadowMap, mapSize: 1024 },
      medium: { enabled: true, type: THREE.PCFShadowMap, mapSize: 512 },
      low: { enabled: false, type: THREE.BasicShadowMap, mapSize: 256 }
    };

    const shadowConfig = shadowConfigs[qualityLevel];
    this.renderer.shadowMap.enabled = shadowConfig.enabled;
    this.renderer.shadowMap.type = shadowConfig.type;

    // Optimize GL state
    this.renderer.autoClear = false; // Manual clearing for better control
    this.renderer.autoClearColor = true;
    this.renderer.autoClearDepth = true;
    this.renderer.autoClearStencil = false;

    // WebGL optimizations
    if (gl) {
      // Enable hardware optimizations
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);
      
      // Optimize blending
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      
      // Enable extensions for performance
      this.enablePerformanceExtensions(gl);
    }
  }

  private enablePerformanceExtensions(gl: WebGLRenderingContext | WebGL2RenderingContext) {
    // Enable performance-oriented extensions
    const extensions = [
      'OES_vertex_array_object',
      'WEBGL_compressed_texture_s3tc',
      'WEBGL_compressed_texture_etc1',
      'OES_texture_float',
      'OES_texture_half_float',
      'WEBGL_depth_texture'
    ];

    extensions.forEach(ext => {
      const extension = gl.getExtension(ext);
      if (extension) {
        console.log(`🚀 GPU Extension enabled: ${ext}`);
      }
    });
  }

  // Batch rendering system for similar objects
  addToBatch(
    batchId: string,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    matrix: THREE.Matrix4
  ) {
    if (!this.renderBatches.has(batchId)) {
      this.renderBatches.set(batchId, {
        geometry,
        material,
        instances: [],
        count: 0
      });
    }

    const batch = this.renderBatches.get(batchId)!;
    batch.instances.push(matrix.clone());
    batch.count++;
  }

  // Create instanced mesh from batch
  createInstancedMeshFromBatch(batchId: string): THREE.InstancedMesh | null {
    const batch = this.renderBatches.get(batchId);
    if (!batch || batch.count === 0) return null;

    // Limit instances based on quality level
    const qualityLevel = this.performanceManager.getCurrentQuality();
    const maxInstances = {
      high: 1000,
      medium: 500,
      low: 250
    }[qualityLevel];

    const instanceCount = Math.min(batch.count, maxInstances);
    const instancedMesh = new THREE.InstancedMesh(
      batch.geometry,
      batch.material,
      instanceCount
    );

    // Set instance matrices
    for (let i = 0; i < instanceCount; i++) {
      instancedMesh.setMatrixAt(i, batch.instances[i]);
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    instancedMesh.frustumCulled = true;
    instancedMesh.castShadow = true;
    instancedMesh.receiveShadow = true;

    this.instancedMeshes.set(batchId, instancedMesh);
    return instancedMesh;
  }

  // Advanced frustum culling with margin
  performAdvancedCulling(
    objects: THREE.Object3D[],
    camera: THREE.Camera,
    margin: number = 50
  ): THREE.Object3D[] {
    const frustum = new THREE.Frustum();
    const matrix = new THREE.Matrix4();
    matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(matrix);

    const visibleObjects: THREE.Object3D[] = [];
    const cameraPosition = camera.position;

    objects.forEach(object => {
      const cullingInfo = this.getCullingInfo(object);
      let isVisible = true;

      // Frustum culling with margin
      if (object.geometry && object.geometry.boundingSphere) {
        const sphere = object.geometry.boundingSphere.clone();
        sphere.applyMatrix4(object.matrixWorld);
        sphere.radius += margin;
        
        if (!frustum.intersectsSphere(sphere)) {
          cullingInfo.frustumCulled = true;
          isVisible = false;
        }
      }

      // Distance culling
      const distance = cameraPosition.distanceTo(object.position);
      const qualityLevel = this.performanceManager.getCurrentQuality();
      const maxDistance = {
        high: 200,
        medium: 150,
        low: 100
      }[qualityLevel];

      if (distance > maxDistance) {
        cullingInfo.distanceCulled = true;
        isVisible = false;
      }

      // Occlusion culling (simplified)
      if (this.isOccluded(object, camera)) {
        cullingInfo.occlusionCulled = true;
        isVisible = false;
      }

      if (isVisible) {
        visibleObjects.push(object);
        cullingInfo.lastVisible = this.currentFrame;
        cullingInfo.frustumCulled = false;
        cullingInfo.distanceCulled = false;
        cullingInfo.occlusionCulled = false;
      }

      object.visible = isVisible;
    });

    return visibleObjects;
  }

  private getCullingInfo(object: THREE.Object3D): CullingInfo {
    if (!this.cullingInfo.has(object)) {
      this.cullingInfo.set(object, {
        frustumCulled: false,
        occlusionCulled: false,
        distanceCulled: false,
        lastVisible: 0
      });
    }
    return this.cullingInfo.get(object)!;
  }

  private isOccluded(object: THREE.Object3D, camera: THREE.Camera): boolean {
    // Simplified occlusion test - check if object is behind another large object
    // In a production system, this would use occlusion queries or pre-computed visibility
    
    // For now, just return false as occlusion culling is complex
    // This could be enhanced with GPU occlusion queries in the future
    return false;
  }

  // Shader optimization and caching
  optimizeShader(material: THREE.Material): THREE.Material {
    if (material instanceof THREE.ShaderMaterial) {
      const shaderKey = this.getShaderKey(material);
      
      if (this.shaderCache.has(shaderKey)) {
        return material; // Already optimized
      }

      // Optimize vertex shader
      let vertexShader = material.vertexShader;
      vertexShader = this.optimizeVertexShader(vertexShader);

      // Optimize fragment shader
      let fragmentShader = material.fragmentShader;
      fragmentShader = this.optimizeFragmentShader(fragmentShader);

      material.vertexShader = vertexShader;
      material.fragmentShader = fragmentShader;
      material.needsUpdate = true;

      this.shaderCache.set(shaderKey, { vertexShader, fragmentShader } as THREE.Shader);
    }

    return material;
  }

  private getShaderKey(material: THREE.ShaderMaterial): string {
    return `${material.vertexShader.length}_${material.fragmentShader.length}_${material.uuid}`;
  }

  private optimizeVertexShader(shader: string): string {
    // Remove unnecessary precision qualifiers for performance
    let optimized = shader;
    
    // Replace high precision with medium where appropriate
    optimized = optimized.replace(/precision highp float;/g, 'precision mediump float;');
    
    // Optimize common operations
    optimized = optimized.replace(/normalize\(normalize\(/g, 'normalize(');
    
    return optimized;
  }

  private optimizeFragmentShader(shader: string): string {
    let optimized = shader;
    
    // Use mediump precision for better performance on mobile
    if (!optimized.includes('precision')) {
      optimized = 'precision mediump float;\n' + optimized;
    }
    
    // Optimize texture lookups
    optimized = optimized.replace(/texture2D/g, 'texture');
    
    return optimized;
  }

  // State management optimization
  minimizeStateChanges(renderList: THREE.RenderItem[]) {
    // Sort render items to minimize GPU state changes
    renderList.sort((a, b) => {
      // Sort by material first (most expensive state change)
      if (a.material.id !== b.material.id) {
        return a.material.id - b.material.id;
      }
      
      // Then by geometry
      if (a.geometry.id !== b.geometry.id) {
        return a.geometry.id - b.geometry.id;
      }
      
      // Finally by depth (for transparency)
      return a.z - b.z;
    });

    return renderList;
  }

  // Render statistics tracking
  startFrame() {
    this.currentFrame++;
    this.drawCallCount = 0;
    this.triangleCount = 0;
    
    if (this.renderer) {
      this.renderer.info.reset();
    }
  }

  endFrame() {
    if (this.renderer) {
      this.drawCallCount = this.renderer.info.render.calls;
      this.triangleCount = this.renderer.info.render.triangles;
    }
  }

  // Buffer management for uniforms
  createUniformBuffer(name: string, data: Float32Array): void {
    if (!this.renderer) return;

    const gl = this.renderer.getContext();
    if (gl instanceof WebGL2RenderingContext) {
      const buffer = gl.createBuffer();
      if (buffer) {
        gl.bindBuffer(gl.UNIFORM_BUFFER, buffer);
        gl.bufferData(gl.UNIFORM_BUFFER, data, gl.STATIC_DRAW);
        this.uniformBuffers.set(name, buffer);
      }
    }
  }

  updateUniformBuffer(name: string, data: Float32Array): void {
    const buffer = this.uniformBuffers.get(name);
    if (!buffer || !this.renderer) return;

    const gl = this.renderer.getContext();
    if (gl instanceof WebGL2RenderingContext) {
      gl.bindBuffer(gl.UNIFORM_BUFFER, buffer);
      gl.bufferSubData(gl.UNIFORM_BUFFER, 0, data);
    }
  }

  // Texture optimization
  optimizeTexture(texture: THREE.Texture, qualityLevel: QualityLevel): THREE.Texture {
    const maxSizes = {
      high: 512,
      medium: 256,
      low: 128
    };

    // Set optimal filtering based on quality
    const filterSettings = {
      high: { min: THREE.LinearMipmapLinearFilter, mag: THREE.LinearFilter },
      medium: { min: THREE.LinearMipmapNearestFilter, mag: THREE.LinearFilter },
      low: { min: THREE.NearestMipmapNearestFilter, mag: THREE.NearestFilter }
    };

    const settings = filterSettings[qualityLevel];
    texture.minFilter = settings.min;
    texture.magFilter = settings.mag;
    texture.generateMipmaps = qualityLevel !== 'low';
    
    // Force anisotropy based on quality
    const anisotropy = {
      high: Math.min(4, this.renderer?.capabilities.getMaxAnisotropy() || 1),
      medium: 2,
      low: 1
    };
    texture.anisotropy = anisotropy[qualityLevel];

    return texture;
  }

  // Performance statistics
  getStats() {
    return {
      drawCalls: this.drawCallCount,
      triangles: this.triangleCount,
      batches: this.renderBatches.size,
      instancedMeshes: this.instancedMeshes.size,
      cachedShaders: this.shaderCache.size,
      uniformBuffers: this.uniformBuffers.size,
      culledObjects: Array.from(this.cullingInfo.values()).filter(info => 
        info.frustumCulled || info.occlusionCulled || info.distanceCulled
      ).length,
      frame: this.currentFrame
    };
  }

  // Cleanup
  dispose() {
    this.renderBatches.clear();
    this.instancedMeshes.clear();
    this.shaderCache.clear();
    this.cullingInfo.clear();
    
    // Cleanup WebGL buffers
    if (this.renderer) {
      const gl = this.renderer.getContext();
      this.uniformBuffers.forEach(buffer => {
        gl.deleteBuffer(buffer);
      });
    }
    this.uniformBuffers.clear();
  }

  // Quality adaptation handler
  onQualityChanged(newQuality: QualityLevel) {
    // Recreate instanced meshes with new limits
    this.instancedMeshes.forEach((mesh, key) => {
      const batch = this.renderBatches.get(key);
      if (batch) {
        const newMesh = this.createInstancedMeshFromBatch(key);
        if (newMesh) {
          // Replace old mesh with new one in the scene
          // This would typically be handled by the scene manager
          mesh.dispose();
          this.instancedMeshes.set(key, newMesh);
        }
      }
    });

    // Reoptimize textures for new quality level
    // This would be handled by the memory manager in practice
    console.log(`🎯 GPU Optimizer: Quality changed to ${newQuality}`);
  }
}