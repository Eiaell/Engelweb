'use client';

import { useRef, useMemo, useCallback, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ScrollState } from '@/types';
import { PerformanceManager } from '@/lib/performance';
import { MemoryManager } from '@/lib/memoryManager';
import { LODManager } from '@/lib/lodSystem';

export interface ParallaxDepthLayer {
  id: string;
  depth: number; // Z position - negative values for background, positive for foreground
  parallaxMultiplier: number; // How much this layer moves relative to scroll (0-1)
  fogInfluence: number; // How much fog affects this layer (0-1)
  lodDistanceMultiplier: number; // Multiplier for LOD distances on this layer
  cullingDistance?: number; // Optional custom culling distance
}

export interface ParallaxDepthConfig {
  layers: ParallaxDepthLayer[];
  atmosphericPerspective: {
    enabled: boolean;
    color: string;
    near: number;
    far: number;
    density: number;
  };
  qualitySettings: {
    high: { layerCount: number; interpolationSteps: number };
    medium: { layerCount: number; interpolationSteps: number };
    low: { layerCount: number; interpolationSteps: number };
  };
}

interface ParallaxDepthManagerProps {
  children: React.ReactNode;
  scrollState: ScrollState;
  currentSection: number;
  config: ParallaxDepthConfig;
  className?: string;
}

interface ParallaxObjectRef {
  object: THREE.Object3D;
  basePosition: THREE.Vector3;
  layerId: string;
  isRegistered: boolean;
}

// Default parallax configuration for the 6 sections
export const DEFAULT_PARALLAX_CONFIG: ParallaxDepthConfig = {
  layers: [
    // Far background layer - slowest movement
    {
      id: 'far-background',
      depth: -50,
      parallaxMultiplier: 0.1,
      fogInfluence: 0.8,
      lodDistanceMultiplier: 2.0,
      cullingDistance: 200
    },
    // Mid background layer
    {
      id: 'mid-background',
      depth: -25,
      parallaxMultiplier: 0.3,
      fogInfluence: 0.6,
      lodDistanceMultiplier: 1.5,
      cullingDistance: 150
    },
    // Background layer
    {
      id: 'background',
      depth: -10,
      parallaxMultiplier: 0.5,
      fogInfluence: 0.4,
      lodDistanceMultiplier: 1.2,
      cullingDistance: 120
    },
    // Main scene layer - normal movement (1:1 with scroll)
    {
      id: 'main-scene',
      depth: 0,
      parallaxMultiplier: 1.0,
      fogInfluence: 0.2,
      lodDistanceMultiplier: 1.0,
      cullingDistance: 100
    },
    // Midground layer - faster than main scene
    {
      id: 'midground',
      depth: 5,
      parallaxMultiplier: 1.5,
      fogInfluence: 0.1,
      lodDistanceMultiplier: 0.8,
      cullingDistance: 80
    },
    // Foreground layer - fastest movement
    {
      id: 'foreground',
      depth: 15,
      parallaxMultiplier: 2.0,
      fogInfluence: 0.05,
      lodDistanceMultiplier: 0.6,
      cullingDistance: 60
    }
  ],
  atmosphericPerspective: {
    enabled: true,
    color: '#0A0A0F',
    near: 10,
    far: 100,
    density: 0.02
  },
  qualitySettings: {
    high: { layerCount: 6, interpolationSteps: 60 },
    medium: { layerCount: 4, interpolationSteps: 30 },
    low: { layerCount: 3, interpolationSteps: 15 }
  }
};

export const ParallaxDepthManager: React.FC<ParallaxDepthManagerProps> = ({
  children,
  scrollState,
  currentSection,
  config,
  className = ''
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const parallaxObjects = useRef<Map<string, ParallaxObjectRef[]>>(new Map());
  const depthFogRef = useRef<THREE.Fog | null>(null);
  const lastScrollProgress = useRef(0);
  const interpolationFrames = useRef(0);
  
  // Performance and memory managers
  const performanceManager = PerformanceManager.getInstance();
  const memoryManager = MemoryManager.getInstance();
  const lodManager = LODManager.getInstance();
  
  // Get current quality settings
  const currentQuality = performanceManager.getCurrentQuality();
  const qualityConfig = config.qualitySettings[currentQuality];
  
  // Filter layers based on quality
  const activeLayers = useMemo(() => {
    const layers = config.layers.slice(0, qualityConfig.layerCount);
    
    // For low quality, remove some background layers
    if (currentQuality === 'low') {
      return layers.filter(layer => 
        layer.id === 'main-scene' || 
        layer.id === 'background' || 
        layer.id === 'foreground'
      );
    }
    
    return layers;
  }, [config.layers, qualityConfig.layerCount, currentQuality]);

  // Dynamic fog system for atmospheric perspective
  const updateAtmosphericFog = useCallback((camera: THREE.Camera) => {
    if (!config.atmosphericPerspective.enabled || !depthFogRef.current) return;
    
    const { near, far, density, color } = config.atmosphericPerspective;
    
    // Adjust fog based on scroll progress and section
    const scrollInfluence = Math.sin(scrollState.progress * Math.PI * 2) * 0.3 + 1;
    const sectionInfluence = (currentSection + 1) / 6; // Gradually increase fog density
    
    const adjustedNear = near * scrollInfluence;
    const adjustedFar = far * (1 + sectionInfluence * 0.5);
    const adjustedDensity = density * (0.8 + sectionInfluence * 0.4);
    
    // Update fog properties
    if (depthFogRef.current instanceof THREE.Fog) {
      depthFogRef.current.near = adjustedNear;
      depthFogRef.current.far = adjustedFar;
    } else if (depthFogRef.current instanceof THREE.FogExp2) {
      depthFogRef.current.density = adjustedDensity;
    }
  }, [config.atmosphericPerspective, scrollState.progress, currentSection]);

  // Calculate parallax movement for objects based on their depth layer
  const calculateParallaxMovement = useCallback((
    basePosition: THREE.Vector3,
    layer: ParallaxDepthLayer,
    scrollDelta: number,
    sectionProgress: number
  ): THREE.Vector3 => {
    const newPosition = basePosition.clone();
    
    // Primary parallax movement based on scroll
    const parallaxOffset = scrollDelta * layer.parallaxMultiplier;
    
    // Add subtle depth-based sway for more realistic movement
    const depthSway = Math.sin(sectionProgress * Math.PI) * (layer.depth * 0.01);
    
    // Apply vertical parallax movement
    newPosition.y += parallaxOffset;
    
    // Add horizontal depth sway for background layers
    if (layer.depth < 0) {
      newPosition.x += depthSway;
    }
    
    // Slight Z movement for enhanced depth perception
    const depthMovement = scrollDelta * 0.1 * (layer.depth / 50);
    newPosition.z = layer.depth + depthMovement;
    
    return newPosition;
  }, []);

  // Smooth interpolation between positions
  const interpolatePosition = useCallback((
    current: THREE.Vector3,
    target: THREE.Vector3,
    factor: number
  ): THREE.Vector3 => {
    return current.clone().lerp(target, factor);
  }, []);

  // Register an object to a specific depth layer
  const registerParallaxObject = useCallback((
    object: THREE.Object3D,
    layerId: string,
    basePosition?: THREE.Vector3
  ) => {
    const layer = activeLayers.find(l => l.id === layerId);
    if (!layer) {
      console.warn(`ParallaxDepthManager: Layer ${layerId} not found`);
      return;
    }

    const objectRef: ParallaxObjectRef = {
      object,
      basePosition: basePosition || object.position.clone(),
      layerId,
      isRegistered: true
    };

    if (!parallaxObjects.current.has(layerId)) {
      parallaxObjects.current.set(layerId, []);
    }

    parallaxObjects.current.get(layerId)!.push(objectRef);
    
    // Set initial depth position
    object.position.z = layer.depth;
    
    // Apply LOD distance multiplier if object supports it
    if ('lodDistanceMultiplier' in object.userData) {
      object.userData.lodDistanceMultiplier = layer.lodDistanceMultiplier;
    }
    
    console.log(`🎭 ParallaxDepthManager: Registered object to layer ${layerId} at depth ${layer.depth}`);
  }, [activeLayers]);

  // Unregister an object from parallax system
  const unregisterParallaxObject = useCallback((
    object: THREE.Object3D,
    layerId: string
  ) => {
    const layerObjects = parallaxObjects.current.get(layerId);
    if (!layerObjects) return;

    const index = layerObjects.findIndex(ref => ref.object === object);
    if (index !== -1) {
      layerObjects[index].isRegistered = false;
      layerObjects.splice(index, 1);
      console.log(`🎭 ParallaxDepthManager: Unregistered object from layer ${layerId}`);
    }
  }, []);

  // Performance-aware frame update
  useFrame((state) => {
    if (!groupRef.current) return;
    
    const scrollDelta = scrollState.progress - lastScrollProgress.current;
    const shouldUpdate = Math.abs(scrollDelta) > 0.001 || interpolationFrames.current > 0;
    
    if (!shouldUpdate) return;

    // Update atmospheric fog
    updateAtmosphericFog(state.camera);
    
    // Calculate interpolation factor based on quality and performance
    const baseInterpolationFactor = currentQuality === 'high' ? 0.15 : 
                                  currentQuality === 'medium' ? 0.2 : 0.25;
    
    // Apply performance adjustment
    const fps = performanceManager.getFPS();
    const performanceFactor = fps > 50 ? 1 : fps > 30 ? 0.8 : 0.6;
    const interpolationFactor = baseInterpolationFactor * performanceFactor;

    // Update all parallax objects
    activeLayers.forEach(layer => {
      const layerObjects = parallaxObjects.current.get(layer.id);
      if (!layerObjects) return;

      layerObjects.forEach(objectRef => {
        if (!objectRef.isRegistered || !objectRef.object.visible) return;

        // Calculate target position
        const targetPosition = calculateParallaxMovement(
          objectRef.basePosition,
          layer,
          scrollDelta * 10, // Scale factor for more noticeable movement
          scrollState.sectionProgress
        );

        // Smooth interpolation to target position
        const newPosition = interpolatePosition(
          objectRef.object.position,
          targetPosition,
          interpolationFactor
        );

        objectRef.object.position.copy(newPosition);

        // Apply fog influence to materials if they support it
        objectRef.object.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            const material = child.material as THREE.Material & { fog?: boolean };
            if ('fog' in material) {
              material.fog = layer.fogInfluence > 0.3;
            }
          }
        });
      });
    });

    // Update interpolation frames counter
    interpolationFrames.current = Math.max(0, interpolationFrames.current - 1);
    if (Math.abs(scrollDelta) > 0.001) {
      interpolationFrames.current = qualityConfig.interpolationSteps;
    }

    lastScrollProgress.current = scrollState.progress;
  });

  // Initialize atmospheric fog
  useEffect(() => {
    if (config.atmosphericPerspective.enabled && groupRef.current) {
      const { color, near, far } = config.atmosphericPerspective;
      
      // Create fog based on quality settings
      if (currentQuality === 'high') {
        depthFogRef.current = new THREE.Fog(color, near, far);
      } else {
        // Use exponential fog for lower quality (less calculations)
        depthFogRef.current = new THREE.FogExp2(color, 0.01);
      }
      
      // Apply fog to scene
      const scene = groupRef.current.parent;
      if (scene) {
        (scene as THREE.Scene).fog = depthFogRef.current;
      }
    }

    return () => {
      // Cleanup fog on unmount
      if (depthFogRef.current && groupRef.current?.parent) {
        (groupRef.current.parent as THREE.Scene).fog = null;
      }
    };
  }, [config.atmosphericPerspective, currentQuality]);

  // Memory cleanup on unmount
  useEffect(() => {
    return () => {
      parallaxObjects.current.clear();
      console.log('🧹 ParallaxDepthManager: Cleaned up parallax objects');
    };
  }, []);

  // Debug information for development
  const getDebugInfo = useCallback(() => {
    const layerStats = Array.from(parallaxObjects.current.entries()).map(([layerId, objects]) => ({
      layerId,
      objectCount: objects.length,
      activeObjects: objects.filter(obj => obj.isRegistered).length
    }));

    return {
      activeLayers: activeLayers.map(l => l.id),
      layerStats,
      currentQuality,
      qualityConfig,
      fogEnabled: config.atmosphericPerspective.enabled,
      interpolationFrames: interpolationFrames.current
    };
  }, [activeLayers, currentQuality, qualityConfig, config.atmosphericPerspective.enabled]);

  // Expose methods for external use
  const parallaxAPI = useMemo(() => ({
    registerObject: registerParallaxObject,
    unregisterObject: unregisterParallaxObject,
    getDebugInfo,
    activeLayers,
    config: qualityConfig
  }), [registerParallaxObject, unregisterParallaxObject, getDebugInfo, activeLayers, qualityConfig]);

  return (
    <group ref={groupRef} className={className} userData={{ parallaxAPI }}>
      {children}
    </group>
  );
};

export default ParallaxDepthManager;