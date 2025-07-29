'use client';

import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SectionProps } from '@/types';
import { PerformanceManager } from '@/lib/performance';
import { MemoryManager } from '@/lib/memoryManager';
import { OptimizationManager } from '@/lib/optimizations';
import { CleanupManager } from '@/lib/cleanupManager';
import { mobileDetection, MobileProfile, MobileOptimizations } from '@/lib/mobileDetection';
import { mobileOptimizer, MobileSceneSettings } from '@/lib/mobileOptimizations';

export const IdentitySection: React.FC<SectionProps> = ({ 
  isActive, 
  scrollProgress, 
  sectionProgress 
}) => {
  const torusRef = useRef<THREE.Mesh>(null);
  const wireframeRef = useRef<THREE.LineSegments>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const lodRef = useRef<THREE.LOD>(null);
  const memoryManager = MemoryManager.getInstance();
  const cleanupManager = CleanupManager.getInstance();
  const sectionId = 'identity-section';

  // Mobile detection and optimization state
  const [mobileProfile, setMobileProfile] = useState<MobileProfile | null>(null);
  const [mobileOptimizations, setMobileOptimizations] = useState<MobileOptimizations | null>(null);
  const [sceneSettings, setSceneSettings] = useState<MobileSceneSettings | null>(null);

  // Initialize mobile detection
  useEffect(() => {
    const profile = mobileDetection.getProfile() || mobileDetection.initialize();
    const optimizations = mobileDetection.getOptimizations();
    
    setMobileProfile(profile);
    setMobileOptimizations(optimizations);
    
    if (profile && optimizations) {
      const settings = mobileOptimizer.getSceneSettings(profile, optimizations);
      setSceneSettings(settings);
    }

    // Listen for profile changes (orientation, resize)
    const handleProfileChange = (newProfile: MobileProfile) => {
      setMobileProfile(newProfile);
      const newOptimizations = mobileDetection.getOptimizations();
      setMobileOptimizations(newOptimizations);
      
      if (newOptimizations) {
        const newSettings = mobileOptimizer.getSceneSettings(newProfile, newOptimizations);
        setSceneSettings(newSettings);
      }
    };

    mobileDetection.addProfileListener(handleProfileChange);

    return () => {
      mobileDetection.removeProfileListener(handleProfileChange);
    };
  }, []);

  // Create mobile-optimized geometries
  const { torusGeometry, wireframeGeometry, particleGeometry, torusLOD } = useMemo(() => {
    if (!sceneSettings) {
      // Fallback geometry for loading state
      const torus = new THREE.TorusGeometry(2.5, 0.8, 8, 32);
      return {
        torusGeometry: torus,
        wireframeGeometry: new THREE.WireframeGeometry(torus),
        particleGeometry: null,
        torusLOD: null
      };
    }

    // Create base torus geometry
    const isMobile = mobileProfile?.isMobile || false;
    const isLowEnd = sceneSettings.frameRate === 30;
    
    // Adjust complexity based on device capability
    const radialSegments = isLowEnd ? 8 : isMobile ? 12 : 16;
    const tubularSegments = isLowEnd ? 24 : isMobile ? 40 : 64;
    
    const baseTorus = new THREE.TorusGeometry(2.5, 0.8, radialSegments, tubularSegments);
    
    // Use mobile optimizer for geometry
    const optimizedResult = mobileOptimizer.createOptimizedGeometry(
      baseTorus, 
      sceneSettings, 
      isMobile ? 2 : 3 // Fewer LOD levels on mobile
    );

    // Create wireframe
    const wireframe = new THREE.WireframeGeometry(optimizedResult.geometry);

    // Create mobile-optimized particles
    const baseParticleCount = isMobile ? 400 : 800;
    const particleGeometry = mobileOptimizer.createOptimizedParticles(
      baseParticleCount,
      sceneSettings,
      'torus'
    );

    return {
      torusGeometry: optimizedResult.geometry,
      wireframeGeometry: wireframe,
      particleGeometry,
      torusLOD: optimizedResult.lod
    };
  }, [sceneSettings, mobileProfile]);

  // Mobile-optimized materials
  const materials = useMemo(() => {
    if (!sceneSettings) {
      // Fallback materials for loading state
      return {
        holographic: new THREE.MeshBasicMaterial({ color: '#E94560' }),
        wireframe: new THREE.LineBasicMaterial({ color: '#F7B801' }),
        particle: new THREE.PointsMaterial({ color: '#F8F9FA', size: 0.02 })
      };
    }

    const isMobile = mobileProfile?.isMobile || false;
    const isLowEnd = sceneSettings.frameRate === 30;

    // Create optimized holographic material
    const holographicMaterial = mobileOptimizer.createOptimizedMaterial(
      isLowEnd ? 'basic' : isMobile ? 'lambert' : 'standard',
      {
        color: '#E94560',
        transparent: true,
        opacity: 0.6,
        metalness: isLowEnd ? undefined : 0.9,
        roughness: isLowEnd ? undefined : 0.1
      },
      sceneSettings
    );

    // Enhanced properties for non-low-end devices
    if (!isLowEnd && holographicMaterial instanceof THREE.MeshPhysicalMaterial) {
      holographicMaterial.transmission = isMobile ? 0.4 : 0.8;
      holographicMaterial.thickness = 0.5;
      holographicMaterial.clearcoat = isMobile ? 0.5 : 1.0;
      holographicMaterial.clearcoatRoughness = 0.1;
      holographicMaterial.ior = 1.5;
    }

    // Wireframe material
    const wireframeMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color('#F7B801'),
      transparent: true,
      opacity: isMobile ? 0.3 : 0.4,
      linewidth: 1,
    });

    // Particle material
    const particleMaterial = sceneSettings.enableParticles ? new THREE.PointsMaterial({
      color: new THREE.Color('#F8F9FA'),
      size: isMobile ? 0.015 : 0.02,
      transparent: true,
      opacity: isMobile ? 0.6 : 0.8,
      blending: isLowEnd ? THREE.NormalBlending : THREE.AdditiveBlending,
      vertexColors: false,
      sizeAttenuation: true,
    }) : null;

    return {
      holographic: holographicMaterial,
      wireframe: wireframeMaterial,
      particle: particleMaterial
    };
  }, [sceneSettings, mobileProfile]);

  // Mobile-optimized animation loop
  useFrame((state, delta) => {
    if (!isActive || !sceneSettings) return;

    const time = state.clock.elapsedTime;
    const isMobile = mobileProfile?.isMobile || false;
    const isLowEnd = sceneSettings.frameRate === 30;
    
    // Reduce animation complexity on mobile/low-end devices
    const animationMultiplier = isLowEnd ? 0.3 : isMobile ? 0.6 : 1.0;
    
    // Main torus rotation and morphing (use LOD if available)
    const torusObject = lodRef.current || torusRef.current;
    if (torusObject) {
      torusObject.rotation.x = Math.sin(time * 0.3 * animationMultiplier) * 0.2;
      torusObject.rotation.y = time * 0.5 * animationMultiplier;
      torusObject.rotation.z = Math.cos(time * 0.2 * animationMultiplier) * 0.1;
      
      // Subtle scale pulsing based on scroll progress
      const scaleFactor = 1 + Math.sin(sectionProgress * Math.PI) * (isMobile ? 0.1 : 0.2);
      torusObject.scale.setScalar(scaleFactor);
    }

    // Wireframe overlay rotation (simplified on mobile)
    if (wireframeRef.current && !isLowEnd) {
      wireframeRef.current.rotation.x = -time * 0.2 * animationMultiplier;
      wireframeRef.current.rotation.y = time * 0.7 * animationMultiplier;
      wireframeRef.current.rotation.z = Math.sin(time * 0.3 * animationMultiplier) * 0.15;
    }

    // Animate particles (only if enabled and available)
    if (particlesRef.current && particleGeometry && sceneSettings.enableParticles) {
      const positions = particlesRef.current.geometry.attributes.position;
      const velocities = particlesRef.current.geometry.attributes.velocity;
      
      // Reduce particle updates on mobile for performance
      const updateFrequency = isMobile ? 0.5 : 1.0;
      if (Math.random() < updateFrequency) {
        const maxUpdates = isMobile ? Math.min(100, positions.count) : positions.count;
        
        for (let i = 0; i < maxUpdates; i++) {
          const index = i * 3;
          
          // Update positions with velocity
          positions.array[index] += velocities.array[index] * animationMultiplier;
          positions.array[index + 1] += velocities.array[index + 1] * animationMultiplier;
          positions.array[index + 2] += velocities.array[index + 2] * animationMultiplier;
          
          // Orbital motion around torus
          const radius = Math.sqrt(
            positions.array[index] ** 2 + positions.array[index + 2] ** 2
          );
          
          if (radius > 4 || radius < 1) {
            // Reset particle to torus surface
            const u = Math.random() * Math.PI * 2;
            const v = Math.random() * Math.PI * 2;
            const R = 2.5;
            const r = 0.8;
            
            positions.array[index] = (R + r * Math.cos(v)) * Math.cos(u);
            positions.array[index + 1] = r * Math.sin(v);
            positions.array[index + 2] = (R + r * Math.cos(v)) * Math.sin(u);
          }
        }
        
        positions.needsUpdate = true;
      }
      
      // Rotate entire particle system
      particlesRef.current.rotation.y = time * 0.1 * animationMultiplier;
    }

    // Adjust opacity based on section progress
    const opacity = isActive ? Math.max(0.3, sectionProgress) : 0.1;
    const mobileOpacityReduction = isMobile ? 0.8 : 1.0;
    
    materials.holographic.opacity = opacity * 0.6 * mobileOpacityReduction;
    materials.wireframe.opacity = opacity * 0.4 * mobileOpacityReduction;
    
    if (materials.particle) {
      materials.particle.opacity = opacity * 0.8 * mobileOpacityReduction;
    }
  });

  // Memory management and cleanup
  useEffect(() => {
    // Register scene assets with memory manager
    if (isActive) {
      memoryManager.activateScene(sectionId);
      
      // Register all mesh objects for tracking
      const assets: THREE.Object3D[] = [];
      if (torusRef.current) assets.push(torusRef.current);
      if (wireframeRef.current) assets.push(wireframeRef.current);
      if (particlesRef.current) assets.push(particlesRef.current);
      
      if (assets.length > 0) {
        memoryManager.registerSceneAssets(sectionId, assets);
      }
    } else {
      memoryManager.deactivateScene(sectionId);
    }
  }, [isActive, sectionId, memoryManager]);

  // Cleanup on unmount with mobile optimization
  useEffect(() => {
    return () => {
      // Use comprehensive cleanup manager
      const geometries = [torusGeometry, wireframeGeometry];
      if (particleGeometry) geometries.push(particleGeometry);
      
      cleanupManager.cleanupSection(sectionId, geometries, materials);
      
      // Additional cleanup for LOD if present
      if (torusLOD) {
        mobileOptimizer.disposeOptimizedResources(torusLOD);
      }
    };
  }, [torusGeometry, wireframeGeometry, particleGeometry, torusLOD, materials, sectionId, cleanupManager]);

  // Don't render if settings aren't loaded yet
  if (!sceneSettings) {
    return null;
  }

  return (
    <group position={[0, 0, 0]} visible={isActive}>
      {/* Main holographic torus - use LOD if available */}
      {torusLOD ? (
        <primitive 
          ref={lodRef}
          object={torusLOD}
          castShadow={sceneSettings.enableShadows}
          receiveShadow={sceneSettings.enableShadows}
        />
      ) : (
        <mesh
          ref={torusRef}
          geometry={torusGeometry}
          material={materials.holographic}
          castShadow={sceneSettings.enableShadows}
          receiveShadow={sceneSettings.enableShadows}
        />
      )}
      
      {/* Wireframe overlay - skip on very low-end devices */}
      {!sceneSettings || sceneSettings.frameRate !== 30 ? (
        <lineSegments
          ref={wireframeRef}
          geometry={wireframeGeometry}
          material={materials.wireframe}
        />
      ) : null}
      
      {/* Flowing particles - only if enabled */}
      {particleGeometry && materials.particle && sceneSettings.enableParticles ? (
        <points
          ref={particlesRef}
          geometry={particleGeometry}
          material={materials.particle}
        />
      ) : null}
      
      {/* Subtle ambient enhancement - reduced for mobile */}
      <pointLight
        position={[0, 0, 0]}
        intensity={mobileProfile?.isMobile ? 0.1 : 0.2}
        color="#E94560"
        distance={8}
        decay={2}
      />
    </group>
  );
};