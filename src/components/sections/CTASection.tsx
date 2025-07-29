'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SectionProps } from '@/types';
import { PerformanceManager } from '@/lib/performance';
import { MemoryManager } from '@/lib/memoryManager';
import { OptimizationManager } from '@/lib/optimizations';

export const CTASection: React.FC<SectionProps> = ({ 
  isActive, 
  scrollProgress, 
  sectionProgress 
}) => {
  const contactElementRef = useRef<THREE.Group>(null);
  const orbitingElementsRef = useRef<THREE.Group>(null);
  const ambientParticlesRef = useRef<THREE.Points>(null);
  const memoryManager = MemoryManager.getInstance();
  const sectionId = 'cta-section';

  // Create minimal but elegant geometries
  const { contactGeometry, orbitGeometries, particleGeometry } = useMemo(() => {
    // Central contact element - elegant torus representing connection
    const contact = new THREE.TorusGeometry(1, 0.15, 16, 32);
    const optimizedContact = PerformanceManager.optimizeGeometry(contact, 1500);

    // Orbiting elements - small spheres representing communication
    const orbitSphere = new THREE.SphereGeometry(0.08, 12, 8);
    const optimizedOrbit = PerformanceManager.optimizeGeometry(orbitSphere, 200);

    // Ambient particles for atmosphere
    const particles = new THREE.BufferGeometry();
    const particleCount = 300; // Minimal particle count
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const scales = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      const index = i * 3;
      
      // Distribute particles in a subtle sphere around the scene
      const radius = 3 + Math.random() * 2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      positions[index] = radius * Math.sin(phi) * Math.cos(theta);
      positions[index + 1] = radius * Math.cos(phi);
      positions[index + 2] = radius * Math.sin(phi) * Math.sin(theta);
      
      // Very subtle movement
      velocities[index] = (Math.random() - 0.5) * 0.005;
      velocities[index + 1] = (Math.random() - 0.5) * 0.003;
      velocities[index + 2] = (Math.random() - 0.5) * 0.005;
      
      scales[i] = Math.random() * 0.3 + 0.7;
    }
    
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    particles.setAttribute('scale', new THREE.BufferAttribute(scales, 1));

    return {
      contactGeometry: optimizedContact,
      orbitGeometries: optimizedOrbit,
      particleGeometry: particles
    };
  }, []);

  // Create premium materials
  const materials = useMemo(() => {
    // Premium contact element material
    const contactMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#F8F9FA'),
      metalness: 0.3,
      roughness: 0.1,
      transparent: true,
      opacity: 0.9,
      transmission: 0.1,
      thickness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      ior: 1.4,
      emissive: new THREE.Color('#E94560'),
      emissiveIntensity: 0.1,
    });

    // Orbiting elements material
    const orbitMaterial = new THREE.MeshLambertMaterial({
      color: new THREE.Color('#F7B801'),
      transparent: true,
      opacity: 0.8,
      emissive: new THREE.Color('#DAA520'),
      emissiveIntensity: 0.2,
    });

    // Ambient particle material
    const particleMaterial = new THREE.PointsMaterial({
      color: new THREE.Color('#F8F9FA'),
      size: 0.008,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    return {
      contact: contactMaterial,
      orbit: orbitMaterial,
      particle: particleMaterial
    };
  }, []);

  // Orbiting element configurations
  const orbitConfigs = useMemo(() => [
    { radius: 2, speed: 0.5, phase: 0, height: 0 },
    { radius: 2.3, speed: -0.3, phase: Math.PI / 2, height: 0.2 },
    { radius: 1.8, speed: 0.7, phase: Math.PI, height: -0.1 },
    { radius: 2.5, speed: -0.4, phase: Math.PI * 1.5, height: 0.15 }
  ], []);

  // Animation loop
  useFrame((state, delta) => {
    if (!isActive) return;

    const time = state.clock.elapsedTime;
    const progress = sectionProgress;

    // Animate central contact element
    if (contactElementRef.current) {
      // Gentle breathing rotation
      contactElementRef.current.rotation.x = Math.sin(time * 0.3) * 0.1;
      contactElementRef.current.rotation.y = time * 0.2;
      contactElementRef.current.rotation.z = Math.cos(time * 0.2) * 0.05;
      
      // Subtle scale pulsing - breathing effect
      const breathingScale = 1 + Math.sin(time * 0.8) * 0.05;
      contactElementRef.current.scale.setScalar(breathingScale);
      
      // Gentle vertical floating
      contactElementRef.current.position.y = Math.sin(time * 0.4) * 0.1;
    }

    // Animate orbiting elements
    if (orbitingElementsRef.current) {
      orbitingElementsRef.current.children.forEach((element, index) => {
        if (element instanceof THREE.Mesh) {
          const config = orbitConfigs[index];
          
          // Orbital motion
          const angle = time * config.speed + config.phase;
          element.position.x = Math.cos(angle) * config.radius;
          element.position.z = Math.sin(angle) * config.radius;
          element.position.y = config.height + Math.sin(time * 0.6 + index) * 0.05;
          
          // Self rotation
          element.rotation.x = time * 0.5;
          element.rotation.y = time * 0.3;
          
          // Scale based on distance from camera
          const distance = element.position.distanceTo(new THREE.Vector3(0, 0, 5));
          const scale = 1 - (distance / 10) * 0.3;
          element.scale.setScalar(scale);
        }
      });
    }

    // Animate ambient particles
    if (ambientParticlesRef.current) {
      const positions = ambientParticlesRef.current.geometry.attributes.position;
      const velocities = ambientParticlesRef.current.geometry.attributes.velocity;
      
      for (let i = 0; i < positions.count; i++) {
        const index = i * 3;
        
        // Update positions with very subtle movement
        positions.array[index] += velocities.array[index];
        positions.array[index + 1] += velocities.array[index + 1];
        positions.array[index + 2] += velocities.array[index + 2];
        
        // Reset particles that drift too far
        const x = positions.array[index];
        const y = positions.array[index + 1];
        const z = positions.array[index + 2];
        const distance = Math.sqrt(x * x + y * y + z * z);
        
        if (distance > 6) {
          const radius = 3 + Math.random() * 2;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.random() * Math.PI;
          
          positions.array[index] = radius * Math.sin(phi) * Math.cos(theta);
          positions.array[index + 1] = radius * Math.cos(phi);
          positions.array[index + 2] = radius * Math.sin(phi) * Math.sin(theta);
        }
      }
      
      positions.needsUpdate = true;
      
      // Gentle rotation of entire particle system
      ambientParticlesRef.current.rotation.y = time * 0.02;
    }

    // Adjust materials based on section progress
    materials.contact.opacity = 0.6 + progress * 0.3;
    materials.contact.emissiveIntensity = 0.05 + progress * 0.15;
    materials.orbit.opacity = 0.5 + progress * 0.3;
    materials.particle.opacity = 0.2 + progress * 0.3;
  });

  // Memory management and cleanup
  useEffect(() => {
    // Register scene assets with memory manager
    if (isActive) {
      memoryManager.activateScene(sectionId);
      
      // Register all mesh objects for tracking
      const assets: THREE.Object3D[] = [];
      if (contactElementRef.current) assets.push(contactElementRef.current);
      if (orbitingElementsRef.current) assets.push(orbitingElementsRef.current);
      if (ambientParticlesRef.current) assets.push(ambientParticlesRef.current);
      
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
      contactGeometry?.dispose();
      orbitGeometries?.dispose();
      particleGeometry?.dispose();

      // Dispose materials
      materials.contact?.dispose();
      materials.orbit?.dispose();
      materials.particle?.dispose();

      // Deactivate scene and cleanup assets
      memoryManager.deactivateScene(sectionId);

      console.log(`🧹 CTASection: Cleaned up contact geometries and materials`);
    };
  }, [contactGeometry, orbitGeometries, particleGeometry, materials, sectionId, memoryManager]);

  return (
    <group position={[0, 0, 0]} visible={isActive}>
      {/* Central contact element */}
      <group ref={contactElementRef} position={[0, 0, 0]}>
        <mesh
          geometry={contactGeometry}
          material={materials.contact}
          castShadow
          receiveShadow
        />
      </group>
      
      {/* Orbiting communication elements */}
      <group ref={orbitingElementsRef}>
        {orbitConfigs.map((config, index) => (
          <mesh
            key={`orbit-${index}`}
            geometry={orbitGeometries}
            material={materials.orbit}
            castShadow
          />
        ))}
      </group>
      
      {/* Ambient atmosphere particles */}
      <points
        ref={ambientParticlesRef}
        geometry={particleGeometry}
        material={materials.particle}
      />
      
      {/* Soft ambient lighting for premium feel */}
      <ambientLight intensity={0.4} color="#F8F9FA" />
      
      <pointLight
        position={[0, 0, 0]}
        intensity={0.3}
        color="#E94560"
        distance={4}
        decay={2}
      />
      
      <pointLight
        position={[2, 2, 2]}
        intensity={0.2}
        color="#F7B801"
        distance={6}
        decay={2}
      />
      
      <pointLight
        position={[-2, -1, 3]}
        intensity={0.15}
        color="#F8F9FA"
        distance={5}
        decay={2}
      />
    </group>
  );
};