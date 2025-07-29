'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SectionProps } from '@/types';
import { PerformanceManager } from '@/lib/performance';
import { MemoryManager } from '@/lib/memoryManager';
import { OptimizationManager } from '@/lib/optimizations';

export const MissionSection: React.FC<SectionProps> = ({ 
  isActive, 
  scrollProgress, 
  sectionProgress 
}) => {
  const mainGearRef = useRef<THREE.Group>(null);
  const gearRefs = useRef<(THREE.Mesh | null)[]>([]);
  const connectionsRef = useRef<THREE.Group>(null);
  const particleSystemRef = useRef<THREE.Points>(null);
  const memoryManager = MemoryManager.getInstance();
  const sectionId = 'mission-section';

  // Create gear geometries and system
  const { gearGeometries, connectionGeometry, particleGeometry } = useMemo(() => {
    const gears: THREE.CylinderGeometry[] = [];
    
    // Create different sized gears for mechanical system
    const gearConfigs = [
      { radius: 1.5, height: 0.1, teeth: 24 }, // Main gear
      { radius: 0.8, height: 0.08, teeth: 16 }, // Secondary gear 1
      { radius: 1.2, height: 0.09, teeth: 20 }, // Secondary gear 2
      { radius: 0.6, height: 0.06, teeth: 12 }, // Small gear 1
      { radius: 0.9, height: 0.07, teeth: 18 }, // Small gear 2
    ];

    gearConfigs.forEach(config => {
      const gear = new THREE.CylinderGeometry(
        config.radius, 
        config.radius, 
        config.height, 
        config.teeth,
        1
      );
      
      // Add gear teeth by modifying vertices
      const positions = gear.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const z = positions.getZ(i);
        const angle = Math.atan2(z, x);
        const radius = Math.sqrt(x * x + z * z);
        
        // Create gear teeth pattern
        const teethPattern = Math.sin(angle * config.teeth / 2) * 0.05;
        if (radius > config.radius * 0.8) {
          const newRadius = radius + teethPattern;
          positions.setX(i, Math.cos(angle) * newRadius);
          positions.setZ(i, Math.sin(angle) * newRadius);
        }
      }
      
      gear.computeVertexNormals();
      gears.push(PerformanceManager.optimizeGeometry(gear, 2000) as THREE.CylinderGeometry);
    });

    // Create connection lines between gears
    const connections = new THREE.BufferGeometry();
    const connectionPoints = [
      new THREE.Vector3(0, 0, 0),     // Main gear center
      new THREE.Vector3(2.5, 1, 0),  // Secondary gear 1
      new THREE.Vector3(-2, 1.5, 0), // Secondary gear 2
      new THREE.Vector3(1.5, -2, 0), // Small gear 1
      new THREE.Vector3(-1.8, -1.2, 0) // Small gear 2
    ];
    connections.setFromPoints(connectionPoints);

    // Particle system for invisible system visualization
    const particles = new THREE.BufferGeometry();
    const particleCount = 500; // Under limit
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const scales = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      const index = i * 3;
      
      // Distribute particles in gear system area
      positions[index] = (Math.random() - 0.5) * 8;
      positions[index + 1] = (Math.random() - 0.5) * 6;
      positions[index + 2] = (Math.random() - 0.5) * 2;
      
      // Subtle movement velocities
      velocities[index] = (Math.random() - 0.5) * 0.01;
      velocities[index + 1] = (Math.random() - 0.5) * 0.01;
      velocities[index + 2] = (Math.random() - 0.5) * 0.005;
      
      scales[i] = Math.random() * 0.5 + 0.5;
    }
    
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    particles.setAttribute('scale', new THREE.BufferAttribute(scales, 1));

    return {
      gearGeometries: gears,
      connectionGeometry: connections,
      particleGeometry: particles
    };
  }, []);

  // Create materials for invisible/ghost aesthetic
  const materials = useMemo(() => {
    // Invisible gear material
    const gearMaterial = new THREE.MeshLambertMaterial({
      color: new THREE.Color('#1E1E2E'),
      transparent: true,
      opacity: 0.1,
      wireframe: false,
    });

    // Wireframe overlay for gears
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#F8F9FA'),
      transparent: true,
      opacity: 0.3,
      wireframe: true,
    });

    // Connection lines material
    const connectionMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color('#E94560'),
      transparent: true,
      opacity: 0.4,
      linewidth: 1,
    });

    // Particle material for system visualization
    const particleMaterial = new THREE.PointsMaterial({
      color: new THREE.Color('#F7B801'),
      size: 0.01,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    return {
      gear: gearMaterial,
      wireframe: wireframeMaterial,
      connection: connectionMaterial,
      particle: particleMaterial
    };
  }, []);

  // Gear positions and rotation speeds
  const gearConfigs = useMemo(() => [
    { position: [0, 0, 0], speed: 1, direction: 1 },
    { position: [2.5, 1, 0], speed: 1.5, direction: -1 },
    { position: [-2, 1.5, 0], speed: 0.8, direction: 1 },
    { position: [1.5, -2, 0], speed: 2, direction: -1 },
    { position: [-1.8, -1.2, 0], speed: 1.3, direction: 1 }
  ], []);

  // Animation loop
  useFrame((state, delta) => {
    if (!isActive) return;

    const time = state.clock.elapsedTime;
    const progress = sectionProgress;

    // Animate gear system
    if (mainGearRef.current) {
      gearRefs.current.forEach((gearRef, index) => {
        if (gearRef && gearConfigs[index]) {
          const config = gearConfigs[index];
          
          // Rotate gears based on scroll progress and time
          const rotationSpeed = config.speed * progress * config.direction;
          gearRef.rotation.y += rotationSpeed * delta;
          
          // Subtle position oscillation
          gearRef.position.x = config.position[0] + Math.sin(time * 0.5 + index) * 0.05;
          gearRef.position.y = config.position[1] + Math.cos(time * 0.3 + index) * 0.05;
          
          // Scale based on progress
          const scale = 0.7 + progress * 0.3;
          gearRef.scale.setScalar(scale);
        }
      });
    }

    // Animate connection lines
    if (connectionsRef.current) {
      connectionsRef.current.rotation.z = Math.sin(time * 0.2) * 0.1;
      materials.connection.opacity = 0.2 + progress * 0.4;
    }

    // Animate particle system
    if (particleSystemRef.current) {
      const positions = particleSystemRef.current.geometry.attributes.position;
      const velocities = particleSystemRef.current.geometry.attributes.velocity;
      
      for (let i = 0; i < positions.count; i++) {
        const index = i * 3;
        
        // Update particle positions
        positions.array[index] += velocities.array[index];
        positions.array[index + 1] += velocities.array[index + 1];
        positions.array[index + 2] += velocities.array[index + 2];
        
        // Reset particles that drift too far
        if (Math.abs(positions.array[index]) > 5 || 
            Math.abs(positions.array[index + 1]) > 4) {
          positions.array[index] = (Math.random() - 0.5) * 2;
          positions.array[index + 1] = (Math.random() - 0.5) * 2;
          positions.array[index + 2] = (Math.random() - 0.5) * 0.5;
        }
      }
      
      positions.needsUpdate = true;
      
      // Rotate entire particle system
      particleSystemRef.current.rotation.y = time * 0.05;
    }

    // Adjust material opacity based on progress
    materials.gear.opacity = 0.05 + progress * 0.15;
    materials.wireframe.opacity = 0.1 + progress * 0.4;
    materials.particle.opacity = 0.3 + progress * 0.5;
  });

  // Memory management and cleanup
  useEffect(() => {
    // Register scene assets with memory manager
    if (isActive) {
      memoryManager.activateScene(sectionId);
      
      // Register all mesh objects for tracking
      const assets: THREE.Object3D[] = [];
      if (mainGearRef.current) assets.push(mainGearRef.current);
      if (connectionsRef.current) assets.push(connectionsRef.current);
      if (particleSystemRef.current) assets.push(particleSystemRef.current);
      
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
      gearGeometries.forEach(geometry => geometry?.dispose());
      connectionGeometry?.dispose();
      particleGeometry?.dispose();

      // Dispose materials
      materials.gear?.dispose();
      materials.wireframe?.dispose();
      materials.connection?.dispose();
      materials.particle?.dispose();

      // Deactivate scene and cleanup assets
      memoryManager.deactivateScene(sectionId);

      console.log(`🧹 MissionSection: Cleaned up ${gearGeometries.length} gear geometries and materials`);
    };
  }, [gearGeometries, connectionGeometry, particleGeometry, materials, sectionId, memoryManager]);

  return (
    <group position={[0, 0, 0]} visible={isActive}>
      {/* Main gear system */}
      <group ref={mainGearRef}>
        {gearGeometries.map((geometry, index) => (
          <group key={index} position={gearConfigs[index].position as [number, number, number]}>
            {/* Invisible gear body */}
            <mesh
              ref={(ref) => { gearRefs.current[index] = ref; }}
              geometry={geometry}
              material={materials.gear}
              castShadow
              receiveShadow
            />
            
            {/* Wireframe overlay */}
            <mesh
              geometry={geometry}
              material={materials.wireframe}
            />
          </group>
        ))}
      </group>
      
      {/* Connection system */}
      <group ref={connectionsRef}>
        <line
          geometry={connectionGeometry}
          material={materials.connection}
        />
      </group>
      
      {/* Particle system for invisible mechanics */}
      <points
        ref={particleSystemRef}
        geometry={particleGeometry}
        material={materials.particle}
      />
      
      {/* Subtle ambient lighting */}
      <pointLight
        position={[0, 0, 2]}
        intensity={0.1}
        color="#F8F9FA"
        distance={10}
        decay={2}
      />
    </group>
  );
};