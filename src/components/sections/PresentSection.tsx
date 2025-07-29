'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SectionProps } from '@/types';
import { PerformanceManager } from '@/lib/performance';
import { MemoryManager } from '@/lib/memoryManager';
import { OptimizationManager } from '@/lib/optimizations';

export const PresentSection: React.FC<SectionProps> = ({ 
  isActive, 
  scrollProgress, 
  sectionProgress 
}) => {
  const dataRiversRef = useRef<THREE.Group>(null);
  const toolIconsRef = useRef<THREE.Group>(null);
  const flowParticlesRef = useRef<THREE.Points>(null);
  const streamLinesRef = useRef<THREE.Group>(null);
  const memoryManager = MemoryManager.getInstance();
  const sectionId = 'present-section';

  // Create data river geometries and tool icons
  const { riverGeometry, toolGeometries, particleGeometry, streamGeometry } = useMemo(() => {
    // Create flowing river paths using curves
    const riverPaths = [
      new THREE.CubicBezierCurve3(
        new THREE.Vector3(-4, 2, 0),
        new THREE.Vector3(-1, 1, 1),
        new THREE.Vector3(1, -1, -1),
        new THREE.Vector3(4, -2, 0)
      ),
      new THREE.CubicBezierCurve3(
        new THREE.Vector3(-3, -1.5, 0.5),
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(2, 0.5, -0.5),
        new THREE.Vector3(3.5, 1.5, 0)
      ),
      new THREE.CubicBezierCurve3(
        new THREE.Vector3(-2, 0, -1),
        new THREE.Vector3(0, 2, 0.5),
        new THREE.Vector3(0, -2, -0.5),
        new THREE.Vector3(2, 0, 1)
      )
    ];

    // Create tube geometries for rivers
    const rivers = riverPaths.map(path => {
      const tubeGeometry = new THREE.TubeGeometry(path, 64, 0.05, 8, false);
      return PerformanceManager.optimizeGeometry(tubeGeometry, 2000);
    });

    // Create tool icon geometries (simple shapes representing tools)
    const tools = [
      // LangChain (chain links)
      new THREE.TorusGeometry(0.15, 0.05, 8, 16),
      // Zapier (lightning bolt shape)
      new THREE.ConeGeometry(0.1, 0.4, 6),
      // RAG (document stack)
      new THREE.BoxGeometry(0.2, 0.3, 0.05),
      // AI Agents (brain-like)
      new THREE.SphereGeometry(0.15, 16, 16),
      // APIs (connection nodes)
      new THREE.OctahedronGeometry(0.12, 1)
    ];

    const optimizedTools = tools.map(tool => 
      PerformanceManager.optimizeGeometry(tool, 500)
    );

    // Create flowing particles along rivers
    const particles = new THREE.BufferGeometry();
    const particleCount = 800; // Under 1000 limit
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const riverIndices = new Float32Array(particleCount);
    const progress = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      const index = i * 3;
      const riverIndex = Math.floor(Math.random() * riverPaths.length);
      const t = Math.random();
      
      // Get point on random river path
      const point = riverPaths[riverIndex].getPoint(t);
      positions[index] = point.x;
      positions[index + 1] = point.y;
      positions[index + 2] = point.z;
      
      // Calculate tangent for velocity direction
      const tangent = riverPaths[riverIndex].getTangent(t);
      velocities[index] = tangent.x * 0.02;
      velocities[index + 1] = tangent.y * 0.02;
      velocities[index + 2] = tangent.z * 0.02;
      
      riverIndices[i] = riverIndex;
      progress[i] = t;
    }
    
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    particles.setAttribute('riverIndex', new THREE.BufferAttribute(riverIndices, 1));
    particles.setAttribute('progress', new THREE.BufferAttribute(progress, 1));

    // Create stream lines for visual connection
    const streamLines = new THREE.BufferGeometry();
    const streamPoints = [];
    for (let i = 0; i < 50; i++) {
      const t = i / 49;
      riverPaths.forEach(path => {
        streamPoints.push(path.getPoint(t));
      });
    }
    streamLines.setFromPoints(streamPoints);

    return {
      riverGeometry: rivers,
      toolGeometries: optimizedTools,
      particleGeometry: particles,
      streamGeometry: streamLines
    };
  }, []);

  // Create materials for data visualization
  const materials = useMemo(() => {
    // Glowing river material
    const riverMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#00CED1'),
      transparent: true,
      opacity: 0.6,
      emissive: new THREE.Color('#008B8B'),
      emissiveIntensity: 0.3,
    });

    // Tool icon materials with distinct colors
    const toolMaterials = [
      // LangChain - Green
      new THREE.MeshLambertMaterial({ 
        color: '#32CD32', 
        emissive: '#228B22', 
        emissiveIntensity: 0.2 
      }),
      // Zapier - Orange  
      new THREE.MeshLambertMaterial({ 
        color: '#FF6347', 
        emissive: '#CD5C5C', 
        emissiveIntensity: 0.2 
      }),
      // RAG - Blue
      new THREE.MeshLambertMaterial({ 
        color: '#4169E1', 
        emissive: '#191970', 
        emissiveIntensity: 0.2 
      }),
      // AI Agents - Purple
      new THREE.MeshLambertMaterial({ 
        color: '#9370DB', 
        emissive: '#663399', 
        emissiveIntensity: 0.2 
      }),
      // APIs - Gold
      new THREE.MeshLambertMaterial({ 
        color: '#F7B801', 
        emissive: '#DAA520', 
        emissiveIntensity: 0.2 
      })
    ];

    // Flowing particle material
    const particleMaterial = new THREE.PointsMaterial({
      color: new THREE.Color('#00FFFF'),
      size: 0.015,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    // Stream line material
    const streamMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color('#20B2AA'),
      transparent: true,
      opacity: 0.3,
      linewidth: 1,
    });

    return {
      river: riverMaterial,
      tools: toolMaterials,
      particle: particleMaterial,
      stream: streamMaterial
    };
  }, []);

  // Tool positions and data
  const toolConfigs = useMemo(() => [
    { name: 'LangChain', position: [-3, 1.5, 0.5], rotation: [0, 0, 0] },
    { name: 'Zapier', position: [2.5, -1, 0.8], rotation: [0, 0, Math.PI / 4] },
    { name: 'RAG', position: [-1.5, -2, 0.3], rotation: [0.2, 0, 0] },
    { name: 'AI Agents', position: [1, 2, -0.5], rotation: [0, 0, 0] },
    { name: 'APIs', position: [3, 0.5, 0.2], rotation: [0, Math.PI / 4, 0] }
  ], []);

  // Animation loop
  useFrame((state, delta) => {
    if (!isActive) return;

    const time = state.clock.elapsedTime;
    const progress = sectionProgress;

    // Animate data rivers
    if (dataRiversRef.current) {
      dataRiversRef.current.children.forEach((river, index) => {
        if (river instanceof THREE.Mesh) {
          // Flowing effect by animating material
          const material = river.material as THREE.MeshBasicMaterial;
          material.emissiveIntensity = 0.2 + Math.sin(time * 2 + index) * 0.1;
          
          // Subtle scale pulsing
          const scale = 1 + Math.sin(time * 1.5 + index * 0.5) * 0.1;
          river.scale.setScalar(scale);
        }
      });
    }

    // Animate tool icons
    if (toolIconsRef.current) {
      toolIconsRef.current.children.forEach((tool, index) => {
        if (tool instanceof THREE.Mesh) {
          const config = toolConfigs[index];
          
          // Floating animation
          tool.position.y = config.position[1] + Math.sin(time * 0.8 + index) * 0.1;
          tool.position.z = config.position[2] + Math.cos(time * 0.6 + index) * 0.05;
          
          // Rotation based on tool type
          tool.rotation.y += delta * (0.5 + index * 0.2);
          tool.rotation.x = config.rotation[0] + Math.sin(time + index) * 0.1;
          
          // Scale based on section progress
          const scale = 0.8 + progress * 0.4;
          tool.scale.setScalar(scale);
          
          // Adjust material opacity
          const material = tool.material as THREE.MeshLambertMaterial;
          material.opacity = 0.7 + progress * 0.3;
        }
      });
    }

    // Animate flowing particles
    if (flowParticlesRef.current) {
      const positions = flowParticlesRef.current.geometry.attributes.position;
      const velocities = flowParticlesRef.current.geometry.attributes.velocity;
      const progressAttr = flowParticlesRef.current.geometry.attributes.progress;
      const riverIndices = flowParticlesRef.current.geometry.attributes.riverIndex;
      
      // Recompute river paths for animation
      const riverPaths = [
        new THREE.CubicBezierCurve3(
          new THREE.Vector3(-4, 2, 0),
          new THREE.Vector3(-1, 1, 1),
          new THREE.Vector3(1, -1, -1),
          new THREE.Vector3(4, -2, 0)
        ),
        new THREE.CubicBezierCurve3(
          new THREE.Vector3(-3, -1.5, 0.5),
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(2, 0.5, -0.5),
          new THREE.Vector3(3.5, 1.5, 0)
        ),
        new THREE.CubicBezierCurve3(
          new THREE.Vector3(-2, 0, -1),
          new THREE.Vector3(0, 2, 0.5),
          new THREE.Vector3(0, -2, -0.5),
          new THREE.Vector3(2, 0, 1)
        )
      ];
      
      for (let i = 0; i < positions.count; i++) {
        // Update progress along curve
        progressAttr.array[i] += delta * 0.1;
        
        if (progressAttr.array[i] >= 1) {
          progressAttr.array[i] = 0;
        }
        
        // Get new position on curve
        const riverIndex = Math.floor(riverIndices.array[i]);
        const point = riverPaths[riverIndex].getPoint(progressAttr.array[i]);
        
        positions.array[i * 3] = point.x;
        positions.array[i * 3 + 1] = point.y;
        positions.array[i * 3 + 2] = point.z;
      }
      
      positions.needsUpdate = true;
      progressAttr.needsUpdate = true;
    }

    // Animate stream lines
    if (streamLinesRef.current) {
      streamLinesRef.current.rotation.y = time * 0.1;
      materials.stream.opacity = 0.2 + progress * 0.3;
    }

    // Adjust overall opacity based on progress
    materials.river.opacity = 0.4 + progress * 0.4;
    materials.particle.opacity = 0.5 + progress * 0.5;
  });

  // Memory management and cleanup
  useEffect(() => {
    // Register scene assets with memory manager
    if (isActive) {
      memoryManager.activateScene(sectionId);
      
      // Register all mesh objects for tracking
      const assets: THREE.Object3D[] = [];
      if (dataRiversRef.current) assets.push(dataRiversRef.current);
      if (toolIconsRef.current) assets.push(toolIconsRef.current);
      if (flowParticlesRef.current) assets.push(flowParticlesRef.current);
      if (streamLinesRef.current) assets.push(streamLinesRef.current);
      
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
      riverGeometry.forEach(geometry => geometry?.dispose());
      toolGeometries.forEach(geometry => geometry?.dispose());
      particleGeometry?.dispose();
      streamGeometry?.dispose();

      // Dispose materials
      materials.river?.dispose();
      materials.tool?.dispose();
      materials.particle?.dispose();
      materials.stream?.dispose();

      // Deactivate scene and cleanup assets
      memoryManager.deactivateScene(sectionId);

      console.log(`🧹 PresentSection: Cleaned up rivers, tools, and particle systems`);
    };
  }, [riverGeometry, toolGeometries, particleGeometry, streamGeometry, materials, sectionId, memoryManager]);

  return (
    <group position={[0, 0, 0]} visible={isActive}>
      {/* Data rivers */}
      <group ref={dataRiversRef}>
        {riverGeometry.map((geometry, index) => (
          <mesh
            key={`river-${index}`}
            geometry={geometry}
            material={materials.river}
            castShadow
          />
        ))}
      </group>
      
      {/* Tool icons floating in the data streams */}
      <group ref={toolIconsRef}>
        {toolGeometries.map((geometry, index) => (
          <mesh
            key={`tool-${index}`}
            geometry={geometry}
            material={materials.tools[index]}
            position={toolConfigs[index].position as [number, number, number]}
            rotation={toolConfigs[index].rotation as [number, number, number]}
            castShadow
            receiveShadow
          />
        ))}
      </group>
      
      {/* Flowing particles */}
      <points
        ref={flowParticlesRef}
        geometry={particleGeometry}
        material={materials.particle}
      />
      
      {/* Stream connection lines */}
      <group ref={streamLinesRef}>
        <line
          geometry={streamGeometry}
          material={materials.stream}
        />
      </group>
      
      {/* Dynamic lighting for data flow effect */}
      <pointLight
        position={[0, 2, 1]}
        intensity={0.4}
        color="#00CED1"
        distance={8}
        decay={2}
      />
      
      <pointLight
        position={[2, -1, 1]}
        intensity={0.3}
        color="#F7B801"
        distance={6}
        decay={2}
      />
    </group>
  );
};