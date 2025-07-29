'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { SectionProps } from '@/types';
import { PerformanceManager } from '@/lib/performance';
import { MemoryManager } from '@/lib/memoryManager';
import { OptimizationManager } from '@/lib/optimizations';

export const OriginSection: React.FC<SectionProps> = ({ 
  isActive, 
  scrollProgress, 
  sectionProgress 
}) => {
  const punoMapRef = useRef<THREE.Mesh>(null);
  const appenweierMapRef = useRef<THREE.Mesh>(null);
  const connectionRef = useRef<THREE.Line>(null);
  const heightMapRef = useRef<THREE.Mesh>(null);
  const memoryManager = MemoryManager.getInstance();
  const sectionId = 'origin-section';

  // Create geographic geometries
  const { punoGeometry, appenweierGeometry, connectionGeometry, heightMapGeometry } = useMemo(() => {
    // Create plane geometries for maps
    const punoGeo = new THREE.PlaneGeometry(4, 3, 32, 24); // ~800 vertices
    const appenweierGeo = new THREE.PlaneGeometry(4, 3, 32, 24);
    
    // Optimize geometries
    const optimizedPuno = PerformanceManager.optimizeGeometry(punoGeo, 1000);
    const optimizedAppenweier = PerformanceManager.optimizeGeometry(appenweierGeo, 1000);

    // Create connection line between locations
    const connectionPoints = [
      new THREE.Vector3(-2, 0, 0.1), // Puno position
      new THREE.Vector3(2, 0, 0.1)   // Appenweier position
    ];
    const connectionGeo = new THREE.BufferGeometry().setFromPoints(connectionPoints);

    // Create height map displacement
    const heightGeo = new THREE.PlaneGeometry(8, 6, 64, 48);
    const positions = heightGeo.attributes.position;
    
    // Generate procedural height data for geographic feel
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      
      // Create mountain-like displacement
      const height = Math.sin(x * 0.5) * Math.cos(y * 0.3) * 0.3 +
                     Math.sin(x * 1.2) * Math.cos(y * 0.8) * 0.1;
      
      positions.setZ(i, height);
    }
    
    heightGeo.computeVertexNormals();
    const optimizedHeight = PerformanceManager.optimizeGeometry(heightGeo, 3000);

    return {
      punoGeometry: optimizedPuno,
      appenweierGeometry: optimizedAppenweier,
      connectionGeometry: connectionGeo,
      heightMapGeometry: optimizedHeight
    };
  }, []);

  // Create procedural textures for performance
  const materials = useMemo(() => {
    // Create canvas-based textures to avoid external loading
    const createMapTexture = (color1: string, color2: string, name: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d')!;
      
      // Create geographic-looking pattern
      const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
      gradient.addColorStop(0, color1);
      gradient.addColorStop(0.5, color2);
      gradient.addColorStop(1, color1);
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);
      
      // Add some geographic details
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 10; i++) {
        ctx.beginPath();
        ctx.arc(
          Math.random() * 512,
          Math.random() * 512,
          Math.random() * 50 + 10,
          0,
          Math.PI * 2
        );
        ctx.stroke();
      }
      
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(1, 1);
      
      return PerformanceManager.optimizeTexture(texture);
    };

    const punoTexture = createMapTexture('#8B4513', '#D2691E', 'puno');
    const appenweierTexture = createMapTexture('#228B22', '#32CD32', 'appenweier');

    // Puno map material (Peru - earth tones)
    const punoMaterial = new THREE.MeshLambertMaterial({
      map: punoTexture,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });

    // Appenweier map material (Germany - green tones)  
    const appenweierMaterial = new THREE.MeshLambertMaterial({
      map: appenweierTexture,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });

    // Connection line material
    const connectionMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color('#F7B801'),
      transparent: true,
      opacity: 0.7,
      linewidth: 3,
    });

    // Height map material
    const heightMaterial = new THREE.MeshLambertMaterial({
      color: new THREE.Color('#1E1E2E'),
      transparent: true,
      opacity: 0.3,
      wireframe: true,
    });

    return {
      puno: punoMaterial,
      appenweier: appenweierMaterial,
      connection: connectionMaterial,
      height: heightMaterial
    };
  }, []);

  // Animation loop
  useFrame((state, delta) => {
    if (!isActive) return;

    const time = state.clock.elapsedTime;
    const progress = sectionProgress;

    // Animate Puno map (left)
    if (punoMapRef.current) {
      punoMapRef.current.position.x = -2 + Math.sin(progress * Math.PI) * 0.5;
      punoMapRef.current.position.y = Math.sin(time * 0.3) * 0.1;
      punoMapRef.current.rotation.x = Math.sin(time * 0.2) * 0.1;
      punoMapRef.current.rotation.y = progress * 0.3;
      
      // Displacement effect based on scroll
      const displacement = Math.sin(progress * Math.PI * 2) * 0.2;
      punoMapRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // Animate Appenweier map (right)
    if (appenweierMapRef.current) {
      appenweierMapRef.current.position.x = 2 - Math.sin(progress * Math.PI) * 0.5;
      appenweierMapRef.current.position.y = Math.cos(time * 0.4) * 0.1;
      appenweierMapRef.current.rotation.x = Math.cos(time * 0.2) * 0.1;
      appenweierMapRef.current.rotation.y = -progress * 0.3;
    }

    // Animate connection line
    if (connectionRef.current) {
      const scale = 0.5 + progress * 1.5;
      connectionRef.current.scale.setScalar(scale);
      
      // Pulsing effect
      materials.connection.opacity = 0.4 + Math.sin(time * 2) * 0.3;
    }

    // Animate height map background
    if (heightMapRef.current) {
      heightMapRef.current.rotation.z = time * 0.05;
      heightMapRef.current.position.z = -2;
      
      // Subtle wave effect
      const positions = heightMapRef.current.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const wave = Math.sin(x * 0.5 + time) * Math.cos(y * 0.3 + time) * 0.1;
        positions.setZ(i, wave);
      }
      positions.needsUpdate = true;
    }

    // Adjust materials based on progress
    materials.puno.opacity = 0.5 + progress * 0.3;
    materials.appenweier.opacity = 0.5 + progress * 0.3;
    materials.height.opacity = 0.2 + progress * 0.1;
  });

  // Memory management and cleanup
  useEffect(() => {
    // Register scene assets with memory manager
    if (isActive) {
      memoryManager.activateScene(sectionId);
      
      // Register all mesh objects for tracking
      const assets: THREE.Object3D[] = [];
      if (punoMapRef.current) assets.push(punoMapRef.current);
      if (appenweierMapRef.current) assets.push(appenweierMapRef.current);
      if (connectionRef.current) assets.push(connectionRef.current);
      if (heightMapRef.current) assets.push(heightMapRef.current);
      
      if (assets.length > 0) {
        memoryManager.registerSceneAssets(sectionId, assets);
      }
    } else {
      memoryManager.deactivateScene(sectionId);
    }
  }, [isActive, sectionId, memoryManager]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Dispose geometries
      punoGeometry?.dispose();
      appenweierGeometry?.dispose();
      connectionGeometry?.dispose();
      heightMapGeometry?.dispose();

      // Dispose materials and their procedural textures
      if (materials.puno) {
        if (materials.puno.map) materials.puno.map.dispose();
        materials.puno.dispose();
      }
      if (materials.appenweier) {
        if (materials.appenweier.map) materials.appenweier.map.dispose();
        materials.appenweier.dispose();
      }
      materials.connection?.dispose();
      materials.height?.dispose();

      // Deactivate scene and cleanup assets
      memoryManager.deactivateScene(sectionId);

      console.log(`🧹 OriginSection: Cleaned up geometries, materials, and procedural textures`);
    };
  }, [punoGeometry, appenweierGeometry, connectionGeometry, heightMapGeometry, materials, sectionId, memoryManager]);

  return (
    <group position={[0, 0, 0]} visible={isActive}>
      {/* Background height map */}
      <mesh
        ref={heightMapRef}
        geometry={heightMapGeometry}
        material={materials.height}
        position={[0, 0, -2]}
        rotation={[0, 0, 0]}
      />
      
      {/* Puno map (Peru) */}
      <mesh
        ref={punoMapRef}
        geometry={punoGeometry}
        material={materials.puno}
        position={[-2, 0, 0]}
        rotation={[0, 0.1, 0]}
        castShadow
        receiveShadow
      />
      
      {/* Appenweier map (Germany) */}
      <mesh
        ref={appenweierMapRef}
        geometry={appenweierGeometry}
        material={materials.appenweier}
        position={[2, 0, 0]}
        rotation={[0, -0.1, 0]}
        castShadow
        receiveShadow
      />
      
      {/* Connection line */}
      <line
        ref={connectionRef}
        geometry={connectionGeometry}
        material={materials.connection}
      />
      
      {/* Ambient lighting for geographic mood */}
      <pointLight
        position={[-2, 2, 1]}
        intensity={0.3}
        color="#D2691E"
        distance={6}
        decay={2}
      />
      
      <pointLight
        position={[2, 2, 1]}
        intensity={0.3}
        color="#32CD32"
        distance={6}
        decay={2}
      />
    </group>
  );
};