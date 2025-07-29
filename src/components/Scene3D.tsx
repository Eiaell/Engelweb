'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense, useEffect, useRef, useState, useMemo } from 'react';
import { PCFSoftShadowMap } from 'three';
import { ScrollState } from '@/types';
import { PerformanceManager } from '@/lib/performance';
import { MemoryManager } from '@/lib/memoryManager';
import { OptimizationManager } from '@/lib/optimizations';
import { CleanupManager } from '@/lib/cleanupManager';
import { ProgressiveLoader, LoadingProgress } from '@/lib/progressiveLoader';
import { LoadingState } from '@/hooks/useProgressiveLoading';
import { mobileDetection, MobileProfile, MobileOptimizations } from '@/lib/mobileDetection';

interface Scene3DProps {
  children: React.ReactNode;
  scrollState: ScrollState;
  progressiveLoader?: ProgressiveLoader;
  loadingState: LoadingState;
  className?: string;
}

export const Scene3D: React.FC<Scene3DProps> = ({ 
  children, 
  scrollState, 
  progressiveLoader,
  loadingState,
  className = '' 
}) => {
  const rafRef = useRef<number | null>(null);
  const memoryManager = MemoryManager.getInstance();
  const isLoading = loadingState.isLoading || loadingState.progress.progress < 1;
  
  // Mobile detection and optimization state
  const [mobileProfile, setMobileProfile] = useState<MobileProfile | null>(null);
  const [mobileOptimizations, setMobileOptimizations] = useState<MobileOptimizations | null>(null);

  // Initialize mobile detection
  useEffect(() => {
    const profile = mobileDetection.initialize();
    const optimizations = mobileDetection.getOptimizations();
    
    setMobileProfile(profile);
    setMobileOptimizations(optimizations);

    // Listen for profile changes (orientation, resize)
    const handleProfileChange = (newProfile: MobileProfile) => {
      setMobileProfile(newProfile);
      setMobileOptimizations(mobileDetection.getOptimizations());
    };

    mobileDetection.addProfileListener(handleProfileChange);

    return () => {
      mobileDetection.removeProfileListener(handleProfileChange);
    };
  }, []);

  // Calculate responsive canvas settings
  const canvasSettings = useMemo(() => {
    if (!mobileProfile || !mobileOptimizations) {
      return {
        dpr: [1, 2],
        camera: { position: [0, 0, 5], fov: 75, near: 0.1, far: 1000 },
        performance: { min: 0.5, max: 1, debounce: 200 }
      };
    }

    const { isMobile, isTablet, viewport } = mobileProfile;
    const { pixelRatio, frameRate } = mobileOptimizations;

    // Responsive camera settings
    let cameraDistance = 5;
    let fov = 75;

    if (isMobile) {
      // Closer camera for mobile to maintain visual impact
      cameraDistance = viewport.aspectRatio < 1 ? 6 : 5;
      fov = viewport.aspectRatio < 1 ? 85 : 75; // Wider FOV for portrait
    } else if (isTablet) {
      cameraDistance = 5.5;
      fov = 70;
    }

    // Performance settings based on device capability
    const performanceSettings = {
      min: frameRate === 30 ? 0.3 : 0.5,
      max: frameRate === 30 ? 0.7 : 1,
      debounce: isMobile ? 300 : 200
    };

    const cameraPosition: [number, number, number] = [0, 0, cameraDistance];
    
    const dpr: [number, number] = [1, Math.min(pixelRatio, 2)];
    
    return {
      dpr,
      camera: { 
        position: cameraPosition, 
        fov, 
        near: 0.1, 
        far: isMobile ? 500 : 1000 // Shorter far plane for mobile
      } as any,
      performance: performanceSettings
    };
  }, [mobileProfile, mobileOptimizations]);

  // Enhanced lighting configuration with mobile optimization
  const lightingConfig = useMemo(() => {
    if (!mobileProfile || !mobileOptimizations) {
      return {
        enableShadows: true,
        shadowMapSize: 512,
        lightIntensity: { ambient: 0.4, key: 0.7, fill: 0.5 },
        lightCount: 3
      };
    }

    const { shadowQuality, enableDynamicLighting, frameRate } = mobileOptimizations;
    const { isMobile, performance } = mobileProfile;

    let shadowMapSize = 512;
    let enableShadows = true;
    let lightCount = 3;

    // Shadow quality adjustment
    switch (shadowQuality) {
      case 'none':
        enableShadows = false;
        shadowMapSize = 0;
        break;
      case 'low':
        shadowMapSize = 256;
        break;
      case 'medium':
        shadowMapSize = 512;
        break;
      case 'high':
        shadowMapSize = 1024;
        break;
    }

    // Light count reduction for mobile/low-end devices
    if (performance.tier === 'low' || frameRate === 30) {
      lightCount = 2; // Remove fill light on very low-end devices
      enableShadows = false; // Force disable shadows
    } else if (isMobile) {
      lightCount = 3; // Keep all lights but reduce intensity
    }

    // Adjust light intensity for mobile - brighter ambient to compensate for reduced effects
    const lightIntensity = isMobile ? 
      { ambient: 0.5, key: 0.6, fill: 0.4 } : 
      { ambient: 0.4, key: 0.7, fill: 0.5 };

    return {
      enableShadows,
      shadowMapSize,
      lightIntensity,
      enableDynamicLighting,
      lightCount
    };
  }, [mobileProfile, mobileOptimizations]);
  
  useEffect(() => {
    const performanceManager = PerformanceManager.getInstance();
    
    const updatePerformance = () => {
      performanceManager.updateFPS();
      rafRef.current = requestAnimationFrame(updatePerformance);
    };
    
    rafRef.current = requestAnimationFrame(updatePerformance);
    
    // Cleanup RAF on unmount
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // Global cleanup on unmount
  useEffect(() => {
    return () => {
      // Use comprehensive cleanup manager for global cleanup
      const cleanupManager = CleanupManager.getInstance();
      cleanupManager.globalCleanup();
      
      // Also deactivate main scene
      memoryManager.deactivateScene('main-scene');
      
      console.log('🧹 Scene3D: Global cleanup completed');
    };
  }, [memoryManager]);

  return (
    <div className={`fixed inset-0 -z-10 ${className}`}>
      <Canvas
        camera={canvasSettings.camera}
        dpr={canvasSettings.dpr}
        performance={canvasSettings.performance}
        gl={{
          antialias: false, // Disabled for performance
          alpha: true,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true
        }}
        onCreated={({ gl, scene, camera }) => {
          const performanceManager = PerformanceManager.getInstance();
          performanceManager.setRenderer(gl);
          
          // Register main scene for memory tracking
          memoryManager.registerSceneAssets('main-scene', [scene]);
          memoryManager.activateScene('main-scene');
          
          // Enhanced mobile-aware renderer optimization
          const pixelRatio = mobileOptimizations?.pixelRatio || window.devicePixelRatio;
          
          if (isLoading) {
            gl.setPixelRatio(Math.min(pixelRatio, 1));
          } else {
            gl.setPixelRatio(Math.min(pixelRatio, 2));
          }
          
          // Advanced mobile-specific renderer settings
          if (mobileProfile?.isMobile) {
            // Optimize for mobile GPUs
            gl.setSize(window.innerWidth, window.innerHeight, false);
            gl.outputColorSpace = 'srgb';
            
            // Mobile GPU optimizations
            gl.capabilities.logarithmicDepthBuffer = false; // Disable for mobile compatibility
            gl.capabilities.precision = 'mediump'; // Use medium precision for mobile
            
            // Shadow and lighting optimizations
            if (lightingConfig.enableShadows && mobileOptimizations?.shadowQuality !== 'none') {
              gl.shadowMap.enabled = true;
              gl.shadowMap.type = THREE.BasicShadowMap; // Use basic shadows on mobile for performance
              gl.shadowMap.autoUpdate = false; // Manual shadow updates for better performance
            } else {
              gl.shadowMap.enabled = false;
            }
            
            // Frustum culling optimization for mobile
            gl.frustumCulled = true;
            scene.autoUpdate = false; // Manual scene updates for better control
            
            // Mobile-specific context settings
            const canvas = gl.getContext().canvas as HTMLCanvasElement;
            canvas.style.touchAction = 'none'; // Prevent default touch behaviors
            
            // Reduce precision for mobile performance
            if (mobileProfile.performance.tier === 'low') {
              gl.capabilities.floatFragmentTextures = false;
              gl.capabilities.floatVertexTextures = false;
            }
          } else {
            // Desktop optimizations
            if (lightingConfig.enableShadows) {
              gl.shadowMap.enabled = true;
              gl.shadowMap.type = PCFSoftShadowMap;
              gl.shadowMap.autoUpdate = true;
            }
          }
          
          // Fog optimization for mobile
          if (mobileProfile?.isMobile && mobileProfile.performance.tier === 'low') {
            // Disable fog on very low-end mobile devices
            scene.fog = null;
          }
          
          console.log('🎬 Scene3D renderer initialized with advanced mobile optimizations:', {
            isMobile: mobileProfile?.isMobile,
            performanceTier: mobileProfile?.performance.tier,
            pixelRatio: gl.getPixelRatio(),
            shadowsEnabled: gl.shadowMap.enabled,
            shadowType: gl.shadowMap.type,
            lightCount: lightingConfig.lightCount,
            precision: gl.capabilities.precision
          });
        }}
      >
        <Suspense fallback={null}>
          {/* Mobile-optimized lighting setup - respects device capabilities */}
          <ambientLight 
            intensity={lightingConfig.lightIntensity.ambient} 
            color="#F8F9FA" 
          />
          
          {/* Key light with EH crimson tint - conditional shadows */}
          <directionalLight 
            position={[10, 10, 5]} 
            intensity={lightingConfig.lightIntensity.key}
            color="#E94560"
            castShadow={lightingConfig.enableShadows}
            shadow-mapSize-width={lightingConfig.shadowMapSize}
            shadow-mapSize-height={lightingConfig.shadowMapSize}
            shadow-camera-far={mobileProfile?.isMobile ? 20 : 30}
            shadow-camera-left={-10}
            shadow-camera-right={10}
            shadow-camera-top={10}
            shadow-camera-bottom={-10}
            shadow-bias={-0.0001}
          />
          
          {/* Fill light - only if device can handle it */}
          {lightingConfig.lightCount >= 3 && (
            <directionalLight 
              position={[-5, 3, 8]} 
              intensity={lightingConfig.lightIntensity.fill}
              color="#F7B801"
            />
          )}
          
          {/* Conditional fog for depth - disabled on very low-end devices */}
          {!(mobileProfile?.isMobile && mobileProfile.performance.tier === 'low') && (
            <fog 
              attach="fog" 
              args={[
                '#0A0A0F', 
                mobileProfile?.isMobile ? 20 : 15, 
                mobileProfile?.isMobile ? 40 : 50
              ]} 
            />
          )}
          
          {children}
        </Suspense>
      </Canvas>
    </div>
  );
};