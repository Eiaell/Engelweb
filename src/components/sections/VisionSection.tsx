'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SectionProps } from '@/types';
import { PerformanceManager } from '@/lib/performance';
import { MemoryManager } from '@/lib/memoryManager';
import { OptimizationManager } from '@/lib/optimizations';

export const VisionSection: React.FC<SectionProps> = ({ 
  isActive, 
  scrollProgress, 
  sectionProgress 
}) => {
  const cityRef = useRef<THREE.Group>(null);
  const moduleRefs = useRef<(THREE.Group | null)[]>([]);
  const connectionsRef = useRef<THREE.Group>(null);
  const expansionRef = useRef<THREE.Group>(null);
  const memoryManager = MemoryManager.getInstance();
  const sectionId = 'vision-section';

  // Create modular city geometries
  const { moduleGeometries, connectionGeometry, baseGeometry } = useMemo(() => {
    // Define different module types
    const moduleTypes = [
      // Core hub (center)
      { 
        geometry: new THREE.CylinderGeometry(0.8, 1.2, 0.6, 8),
        position: [0, 0, 0],
        scale: 1.2,
        type: 'core'
      },
      // Processing modules (surrounding core)
      { 
        geometry: new THREE.BoxGeometry(0.6, 0.8, 0.6),
        position: [2, 0.2, 0],
        scale: 1,
        type: 'processor'
      },
      { 
        geometry: new THREE.BoxGeometry(0.6, 0.8, 0.6),
        position: [-2, 0.2, 0],
        scale: 1,
        type: 'processor'
      },
      { 
        geometry: new THREE.BoxGeometry(0.6, 0.8, 0.6),
        position: [0, 0.2, 2],
        scale: 1,
        type: 'processor'
      },
      { 
        geometry: new THREE.BoxGeometry(0.6, 0.8, 0.6),
        position: [0, 0.2, -2],
        scale: 1,
        type: 'processor'
      },
      // Connector modules (diagonal)
      { 
        geometry: new THREE.OctahedronGeometry(0.4, 1),
        position: [1.4, 0.4, 1.4],
        scale: 0.8,
        type: 'connector'
      },
      { 
        geometry: new THREE.OctahedronGeometry(0.4, 1),
        position: [-1.4, 0.4, 1.4],
        scale: 0.8,
        type: 'connector'
      },
      { 
        geometry: new THREE.OctahedronGeometry(0.4, 1),
        position: [1.4, 0.4, -1.4],
        scale: 0.8,
        type: 'connector'
      },
      { 
        geometry: new THREE.OctahedronGeometry(0.4, 1),
        position: [-1.4, 0.4, -1.4],
        scale: 0.8,
        type: 'connector'
      },
      // Expansion modules (outer ring)
      { 
        geometry: new THREE.TetrahedronGeometry(0.5, 1),
        position: [3.5, 0.6, 0],
        scale: 0.7,
        type: 'expansion'
      },
      { 
        geometry: new THREE.TetrahedronGeometry(0.5, 1),
        position: [-3.5, 0.6, 0],
        scale: 0.7,
        type: 'expansion'
      },
      { 
        geometry: new THREE.TetrahedronGeometry(0.5, 1),
        position: [0, 0.6, 3.5],
        scale: 0.7,
        type: 'expansion'
      },
      { 
        geometry: new THREE.TetrahedronGeometry(0.5, 1),
        position: [0, 0.6, -3.5],
        scale: 0.7,
        type: 'expansion'
      }
    ];

    // Optimize all geometries
    const optimizedModules = moduleTypes.map(module => ({
      ...module,
      geometry: PerformanceManager.optimizeGeometry(module.geometry, 1000)
    }));

    // Create connection lines between modules
    const connections = new THREE.BufferGeometry();
    const connectionPoints = [
      // Core to processors
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(2, 0.2, 0),
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(-2, 0.2, 0),
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.2, 2),
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.2, -2),
      // Processors to connectors
      new THREE.Vector3(2, 0.2, 0), new THREE.Vector3(1.4, 0.4, 1.4),
      new THREE.Vector3(2, 0.2, 0), new THREE.Vector3(1.4, 0.4, -1.4),
      new THREE.Vector3(-2, 0.2, 0), new THREE.Vector3(-1.4, 0.4, 1.4),
      new THREE.Vector3(-2, 0.2, 0), new THREE.Vector3(-1.4, 0.4, -1.4),
      // Connectors to expansion
      new THREE.Vector3(1.4, 0.4, 1.4), new THREE.Vector3(3.5, 0.6, 0),
      new THREE.Vector3(1.4, 0.4, -1.4), new THREE.Vector3(0, 0.6, -3.5),
      new THREE.Vector3(-1.4, 0.4, 1.4), new THREE.Vector3(-3.5, 0.6, 0),
      new THREE.Vector3(-1.4, 0.4, -1.4), new THREE.Vector3(0, 0.6, 3.5)
    ];
    connections.setFromPoints(connectionPoints);

    // Create base platform
    const base = new THREE.CylinderGeometry(5, 5.5, 0.2, 32);
    const optimizedBase = PerformanceManager.optimizeGeometry(base, 2000);

    return {
      moduleGeometries: optimizedModules,
      connectionGeometry: connections,
      baseGeometry: optimizedBase
    };
  }, []);

  // Create materials for different module types
  const materials = useMemo(() => {
    // Core module material - central hub
    const coreMaterial = new THREE.MeshLambertMaterial({
      color: new THREE.Color('#E94560'),
      emissive: new THREE.Color('#8B0000'),
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.9,
    });

    // Processor module material
    const processorMaterial = new THREE.MeshLambertMaterial({
      color: new THREE.Color('#4169E1'),
      emissive: new THREE.Color('#191970'),
      emissiveIntensity: 0.2,
      transparent: true,
      opacity: 0.8,
    });

    // Connector module material
    const connectorMaterial = new THREE.MeshLambertMaterial({
      color: new THREE.Color('#32CD32'),
      emissive: new THREE.Color('#228B22'),
      emissiveIntensity: 0.2,
      transparent: true,
      opacity: 0.7,
    });

    // Expansion module material
    const expansionMaterial = new THREE.MeshLambertMaterial({
      color: new THREE.Color('#F7B801'),
      emissive: new THREE.Color('#DAA520'),
      emissiveIntensity: 0.2,
      transparent: true,
      opacity: 0.6,
    });

    // Connection lines material
    const connectionMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color('#F8F9FA'),
      transparent: true,
      opacity: 0.4,
      linewidth: 2,
    });

    // Base platform material
    const baseMaterial = new THREE.MeshLambertMaterial({
      color: new THREE.Color('#1E1E2E'),
      transparent: true,
      opacity: 0.3,
      wireframe: true,
    });

    return {
      core: coreMaterial,
      processor: processorMaterial,
      connector: connectorMaterial,
      expansion: expansionMaterial,
      connection: connectionMaterial,
      base: baseMaterial
    };
  }, []);

  // Get material by module type
  const getMaterialByType = (type: string) => {
    switch (type) {
      case 'core': return materials.core;
      case 'processor': return materials.processor;
      case 'connector': return materials.connector;
      case 'expansion': return materials.expansion;
      default: return materials.core;
    }
  };

  // Animation loop
  useFrame((state, delta) => {
    if (!isActive) return;

    const time = state.clock.elapsedTime;
    const progress = sectionProgress;

    // Animate city expansion
    if (cityRef.current) {
      // Overall rotation
      cityRef.current.rotation.y = time * 0.1;
      
      // Scale based on progress
      const cityScale = 0.5 + progress * 0.7;
      cityRef.current.scale.setScalar(cityScale);
    }

    // Animate individual modules
    moduleRefs.current.forEach((moduleRef, index) => {
      if (moduleRef && moduleGeometries[index]) {
        const config = moduleGeometries[index];
        const moduleProgress = Math.max(0, (progress * 4) - index * 0.1);
        
        // Emergence animation
        const targetY = config.position[1];
        const emergenceOffset = (1 - Math.min(moduleProgress, 1)) * -2;
        moduleRef.position.y = targetY + emergenceOffset;
        
        // Module-specific animations
        switch (config.type) {
          case 'core':
            moduleRef.rotation.y = time * 0.3;
            moduleRef.scale.setScalar(config.scale * (1 + Math.sin(time) * 0.1));
            break;
          case 'processor':
            moduleRef.rotation.x = time * 0.2;
            moduleRef.rotation.z = Math.sin(time * 0.5 + index) * 0.1;
            break;
          case 'connector':
            moduleRef.rotation.x = time * 0.4;
            moduleRef.rotation.y = time * 0.3;
            moduleRef.rotation.z = time * 0.2;
            break;
          case 'expansion':
            moduleRef.rotation.y = time * 0.6;
            const pulsing = 1 + Math.sin(time * 2 + index) * 0.2;
            moduleRef.scale.setScalar(config.scale * pulsing);
            break;
        }
        
        // Opacity based on progress
        const material = moduleRef.children[0] as THREE.Mesh;
        if (material && material.material) {
          (material.material as THREE.Material).opacity = Math.min(moduleProgress, 1) * 0.8;
        }
      }
    });

    // Animate connections
    if (connectionsRef.current) {
      // Connections appear after modules
      const connectionProgress = Math.max(0, progress * 2 - 0.5);
      materials.connection.opacity = connectionProgress * 0.5;
      
      // Pulsing effect
      const pulse = 1 + Math.sin(time * 3) * 0.2;
      connectionsRef.current.scale.setScalar(pulse);
    }

    // Animate expansion effect
    if (expansionRef.current) {
      expansionRef.current.rotation.y = -time * 0.05;
      materials.base.opacity = 0.1 + progress * 0.3;
    }

    // Dynamic lighting based on progress
    materials.core.emissiveIntensity = 0.2 + progress * 0.3;
    materials.processor.emissiveIntensity = 0.1 + progress * 0.2;
    materials.connector.emissiveIntensity = 0.1 + progress * 0.2;
    materials.expansion.emissiveIntensity = 0.1 + progress * 0.2;
  });

  // Memory management and cleanup
  useEffect(() => {
    // Register scene assets with memory manager
    if (isActive) {
      memoryManager.activateScene(sectionId);
      
      // Register all mesh objects for tracking
      const assets: THREE.Object3D[] = [];
      if (cityRef.current) assets.push(cityRef.current);
      if (connectionsRef.current) assets.push(connectionsRef.current);
      if (expansionRef.current) assets.push(expansionRef.current);
      
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
      moduleGeometries.forEach(config => config.geometry?.dispose());
      connectionGeometry?.dispose();
      baseGeometry?.dispose();

      // Dispose materials
      materials.core?.dispose();
      materials.processor?.dispose();
      materials.connector?.dispose();
      materials.expansion?.dispose();
      materials.connection?.dispose();
      materials.base?.dispose();

      // Deactivate scene and cleanup assets
      memoryManager.deactivateScene(sectionId);

      console.log(`🧹 VisionSection: Cleaned up ${moduleGeometries.length} module geometries and materials`);
    };
  }, [moduleGeometries, connectionGeometry, baseGeometry, materials, sectionId, memoryManager]);

  return (
    <group position={[0, 0, 0]} visible={isActive}>
      {/* Base platform */}
      <group ref={expansionRef}>
        <mesh
          geometry={baseGeometry}
          material={materials.base}
          position={[0, -1, 0]}
          receiveShadow
        />
      </group>
      
      {/* Modular city system */}
      <group ref={cityRef}>
        {/* Individual modules */}
        {moduleGeometries.map((config, index) => (
          <group
            key={`module-${index}`}
            ref={(ref) => { moduleRefs.current[index] = ref; }}
            position={config.position as [number, number, number]}
          >
            <mesh
              geometry={config.geometry}
              material={getMaterialByType(config.type)}
              castShadow
              receiveShadow
            />
          </group>
        ))}
        
        {/* Connection system */}
        <group ref={connectionsRef}>
          <line
            geometry={connectionGeometry}
            material={materials.connection}
          />
        </group>
      </group>
      
      {/* Architectural lighting */}
      <pointLight
        position={[0, 3, 0]}
        intensity={0.4}
        color="#E94560"
        distance={10}
        decay={2}
        castShadow
      />
      
      <pointLight
        position={[3, 1, 3]}
        intensity={0.2}
        color="#4169E1"
        distance={8}
        decay={2}
      />
      
      <pointLight
        position={[-3, 1, -3]}
        intensity={0.2}
        color="#32CD32"
        distance={8}
        decay={2}
      />
    </group>
  );
};