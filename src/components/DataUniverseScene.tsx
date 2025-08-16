'use client';

import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import WindowsFiles from './WindowsFiles';
import InteractiveVectorizationScene from './InteractiveVectorizationScene';
import InteractiveEntityExtractionScene from './InteractiveEntityExtractionScene';
import SimpleKnowledgeGraphScene from './SimpleKnowledgeGraphScene';
// REMOVED: import InteractiveQueryResponseScene from './InteractiveQueryResponseScene';
import * as THREE from 'three';

interface DataChunk {
  id: string;
  text: string;
  position: THREE.Vector3;
  color: string;
  size: number;
  opacity: number;
  rotationSpeed: number;
  type: 'concept' | 'connection' | 'insight' | 'process';
  section: number; // Which section this chunk belongs to
}

interface DataUniverseSceneProps {
  scrollProgress: number;
  currentSection: number;
  interactionPoint?: THREE.Vector3 | null;
  cameraOffset: { x: number; y: number };
  sceneTriggered?: {
    vectorization: boolean;
    entityExtraction: boolean;
    knowledgeGraph: boolean;
    // REMOVED: queryResponse: boolean;
  };
}

// REMOVED: Floating text content that was creating unwanted background words
const allTextContent = ``;

// Phosphorescent color palette
const colors = {
  concept: '#00FFB3',      // Cyan-green
  connection: '#FF0080',   // Magenta
  insight: '#FFFF00',      // Electric yellow
  process: '#8A2BE2',      // Blue-violet
  accent: '#FF6600'        // Orange accent
};

const DataUniverseScene: React.FC<DataUniverseSceneProps> = ({ 
  scrollProgress,
  interactionPoint = null,
  cameraOffset,
  sceneTriggered = {
    vectorization: false,
    entityExtraction: false,
    knowledgeGraph: false
    // REMOVED: queryResponse: false
  }
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [chunks, setChunks] = useState<DataChunk[]>([]);
  const [performanceGrade, setPerformanceGrade] = useState<'high' | 'medium' | 'low'>('high');
  const lastFrameTime = useRef(Date.now());

  // Create data chunks distributed throughout the 3D space
  const dataChunks = useMemo(() => {
    const sentences = allTextContent.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const processedChunks: DataChunk[] = [];
    const sectionsCount = 7;

    sentences.forEach((sentence, sentenceIndex) => {
      const words = sentence.trim().split(/\s+/);
      const fragments = [];
      
      // Group words into chunks of 2-5 words
      for (let i = 0; i < words.length; i += Math.floor(Math.random() * 4) + 2) {
        const fragment = words.slice(i, i + Math.floor(Math.random() * 4) + 2).join(' ');
        if (fragment.length > 0) {
          fragments.push(fragment);
        }
      }

      fragments.forEach((fragment, fragmentIndex) => {
        // Determine section based on sentence index
        const section = Math.floor((sentenceIndex / sentences.length) * sectionsCount);
        
        // Determine chunk type based on content
        let type: DataChunk['type'] = 'concept';
        if (fragment.includes('conexión') || fragment.includes('relación') || fragment.includes('conecta')) {
          type = 'connection';
        } else if (fragment.includes('grafo') || fragment.includes('sistema') || fragment.includes('genera')) {
          type = 'process';
        } else if (fragment.includes('magia') || fragment.includes('precisión') || fragment.includes('transparencia')) {
          type = 'insight';
        }

        // Position chunks further away from the files area
        const sectionDepth = -50 + (section * -40); // Start at -50 and go deeper (more negative)
        
        const angle = (fragmentIndex * 0.618) % (Math.PI * 2); // Golden angle
        const radius = 20 + Math.random() * 40;
        const height = 5 + Math.random() * 30; // Keep chunks well above the platform

        processedChunks.push({
          id: `chunk-${sentenceIndex}-${fragmentIndex}`,
          text: fragment,
          position: new THREE.Vector3(
            Math.cos(angle) * radius,
            height,
            sectionDepth + Math.sin(angle) * radius
          ),
          color: colors[type],
          size: 0.4 + Math.random() * 0.6,
          opacity: 0.7 + Math.random() * 0.3,
          rotationSpeed: (Math.random() - 0.5) * 0.3,
          type,
          section
        });
      });
    });

    // PERFORMANCE: Limit to 1500 chunks total
    return processedChunks.slice(0, 1500);
  }, []);

  // Initialize chunks
  useEffect(() => {
    setChunks(dataChunks);
  }, [dataChunks]);

  // Animation loop with performance monitoring
  useFrame((state) => {
    if (!groupRef.current) return;

    const currentTime = Date.now();
    const frameTime = currentTime - lastFrameTime.current;
    lastFrameTime.current = currentTime;

    // Performance monitoring - only update when grade changes
    const newGrade = frameTime > 20 ? 'low' : frameTime > 16 ? 'medium' : 'high';
    if (newGrade !== performanceGrade) {
      setPerformanceGrade(newGrade);
    }

    const time = state.clock.elapsedTime;
    
    // Camera movement: Scroll controls distance/zoom, drag controls lateral (X,Y)
    // Start close at Z=20, then move back exponentially
    const baseZ = 20 + (scrollProgress * scrollProgress * 200); // Exponential zoom out effect
    const targetY = cameraOffset.y + (scrollProgress * 10); // Rise up as we zoom out
    
    // Update camera position with both scroll and drag offsets
    state.camera.position.x += (cameraOffset.x - state.camera.position.x) * 0.05;
    state.camera.position.y += (targetY - state.camera.position.y) * 0.05;
    state.camera.position.z += (baseZ - state.camera.position.z) * 0.03;
    
    // Look direction - always look towards the origin area where files are
    const lookAtX = cameraOffset.x * 0.3; // Slight follow of camera movement
    const lookAtY = Math.max(-5, cameraOffset.y - 5 - scrollProgress * 5); // Look down more as we zoom out
    const lookAtZ = -10 - scrollProgress * 20; // Look towards the files area
    state.camera.lookAt(lookAtX, lookAtY, lookAtZ);

    // Update chunks with performance scaling
    const updateFrequency = performanceGrade === 'low' ? 4 : performanceGrade === 'medium' ? 2 : 1;
    if (Math.floor(time * 60) % updateFrequency !== 0) return;

    // Update chunks directly without triggering re-renders
    chunks.forEach((chunk, index) => {
      // Skip updates for distant chunks on low performance
      if (performanceGrade === 'low' && index % 3 !== 0) {
        return;
      }
      
      // Floating motion
      const floatOffset = Math.sin(time * 0.3 + chunk.position.x * 0.05) * 1.5;
      chunk.position.y += floatOffset * 0.01;
      
      // Gentle orbital drift
      const driftSpeed = 0.05 * (performanceGrade === 'low' ? 0.5 : 1);
      chunk.position.x += Math.cos(time * driftSpeed + chunk.position.z * 0.01) * 0.005;
      chunk.position.z += Math.sin(time * driftSpeed + chunk.position.x * 0.01) * 0.005;
      
      // Mouse interaction - attraction/repulsion
      if (interactionPoint && performanceGrade !== 'low') {
        const distance = chunk.position.distanceTo(interactionPoint);
        if (distance < 8) {
          const force = (8 - distance) / 8;
          const direction = chunk.position.clone().sub(interactionPoint).normalize();
          chunk.position.add(direction.multiplyScalar(force * 0.05));
        }
      }
      
      // Pulsing opacity
      const pulseSpeed = chunk.type === 'insight' ? 1.5 : 0.8;
      chunk.opacity = 0.5 + Math.sin(time * pulseSpeed + chunk.position.x * 0.1) * 0.4;
    });
  });

  return (
    <group ref={groupRef}>
      {/* Infinite Platform - Wire Grid */}
      <InfinitePlatform />
      
      {/* Windows Files at the beginning */}
      <WindowsFiles scrollProgress={scrollProgress} />
      
      {/* Vectorization Scene - Second section */}
      <InteractiveVectorizationScene 
        scrollProgress={scrollProgress} 
        sceneTriggered={sceneTriggered.vectorization}
      />
      
      {/* Entity Extraction Scene - Third section */}
      <InteractiveEntityExtractionScene 
        scrollProgress={scrollProgress} 
        sceneTriggered={sceneTriggered.entityExtraction}
      />
      
      {/* Knowledge Graph Scene - Fourth section */}
      <SimpleKnowledgeGraphScene 
        scrollProgress={scrollProgress} 
        sceneTriggered={sceneTriggered?.knowledgeGraph} 
      />
      
      {/* REMOVED: Query Response Scene - Fifth section
      <InteractiveQueryResponseScene scrollProgress={scrollProgress} />
      */}
      
      {/* GraphRAG Journey Path */}
      
      {/* REMOVED: Data chunks that were creating floating background text
      {chunks.map((chunk, index) => {
        // LOD: Only render chunks near current camera position
        const currentCameraZ = 20 + (scrollProgress * scrollProgress * 200);
        const chunkDistance = chunk.position.distanceTo(new THREE.Vector3(
          cameraOffset.x,
          cameraOffset.y + (scrollProgress * 10),
          currentCameraZ
        ));
        
        if (chunkDistance > 50) return null; // Frustum culling
        
        // Performance-based LOD
        if (performanceGrade === 'low' && index % 3 !== 0) return null;
        if (performanceGrade === 'medium' && index % 2 !== 0 && chunkDistance > 30) return null;
        
        return (
          <DataChunkComponent 
            key={chunk.id}
            chunk={chunk}
            performanceGrade={performanceGrade}
          />
        );
      })}
      */}
      
      {/* REMOVED: Connection lines between chunks (no longer needed)
      {performanceGrade === 'high' && <ConnectionLines chunks={chunks} scrollProgress={scrollProgress} />}
      */}
    </group>
  );
};

// Infinite platform background with white grid
const InfinitePlatform: React.FC = () => {
  const gridRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (!gridRef.current) return;
    
    // Move the grid with the camera to create infinite effect
    gridRef.current.position.x = Math.floor(state.camera.position.x / 10) * 10;
    gridRef.current.position.z = Math.floor(state.camera.position.z / 10) * 10;
  });

  const gridLines = useMemo(() => {
    const lines = [];
    const size = 400; // Larger size for infinite feel
    const divisions = 80;
    const step = size / divisions;

    // Create infinite floor grid
    for (let i = 0; i <= divisions; i++) {
      const pos = -size/2 + i * step;
      
      // Horizontal lines (along X axis)
      lines.push(
        <line key={`h-${i}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([
                -size/2, 0, pos,
                size/2, 0, pos
              ])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#ffffff" transparent opacity={0.6} />
        </line>
      );
      
      // Vertical lines (along Z axis)
      lines.push(
        <line key={`v-${i}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([
                pos, 0, -size/2,
                pos, 0, size/2
              ])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#ffffff" transparent opacity={0.6} />
        </line>
      );
    }

    return lines;
  }, []);

  return (
    <group ref={gridRef}>
      {gridLines}
      
      {/* Invisible floor plane for reference */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[400, 400]} />
        <meshBasicMaterial color="#000000" transparent opacity={0} />
      </mesh>
    </group>
  );
};

// Individual data chunk component
interface DataChunkComponentProps {
  chunk: DataChunk;
  performanceGrade: 'high' | 'medium' | 'low';
}

const DataChunkComponent: React.FC<DataChunkComponentProps> = ({ chunk, performanceGrade }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    
    const time = state.clock.elapsedTime;
    const rotationMultiplier = performanceGrade === 'low' ? 0.3 : 1;
    
    meshRef.current.rotation.y = time * chunk.rotationSpeed * rotationMultiplier;
    meshRef.current.rotation.x = Math.sin(time * 0.2) * 0.05;
    meshRef.current.position.copy(chunk.position);
  });

  return (
    <mesh ref={meshRef}>
      <Text
        text={chunk.text}
        fontSize={chunk.size * (performanceGrade === 'low' ? 0.7 : 1)}
        color={chunk.color}
        anchorX="center"
        anchorY="middle"
        maxWidth={8}
        textAlign="center"
        outlineWidth={performanceGrade === 'high' ? 0.02 : 0}
        outlineColor={chunk.color}
      >
        <meshBasicMaterial 
          transparent 
          opacity={chunk.opacity}
          color={chunk.color}
        />
      </Text>
      
      {/* Glow effect */}
      {performanceGrade !== 'low' && (
        <mesh position={[0, 0, -0.1]}>
          <planeGeometry args={[chunk.text.length * 0.08, 0.8]} />
          <meshBasicMaterial
            color={chunk.color}
            transparent
            opacity={chunk.opacity * 0.15}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
    </mesh>
  );
};

// Connection lines between chunks
interface ConnectionLinesProps {
  chunks: DataChunk[];
  scrollProgress: number;
}

const ConnectionLines: React.FC<ConnectionLinesProps> = ({ chunks, scrollProgress }) => {
  const linesRef = useRef<THREE.Group>(null);
  
  const connections = useMemo(() => {
    const lines: Array<{from: THREE.Vector3; to: THREE.Vector3; color: string}> = [];
    const currentSection = Math.floor(scrollProgress * 7);
    
    // Only show connections for chunks in nearby sections
    const nearbyChunks = chunks.filter(chunk => 
      Math.abs(chunk.section - currentSection) <= 1
    );
    
    // Sample chunks for performance
    const sampledChunks = nearbyChunks.filter((_, index) => index % 6 === 0);
    
    sampledChunks.forEach((chunk1, i) => {
      sampledChunks.slice(i + 1).forEach(chunk2 => {
        const distance = chunk1.position.distanceTo(chunk2.position);
        
        if (distance < 12) {
          lines.push({
            from: chunk1.position.clone(),
            to: chunk2.position.clone(),
            color: chunk1.type === chunk2.type ? chunk1.color : colors.connection
          });
        }
      });
    });
    
    return lines.slice(0, 20); // Limit for performance
  }, [chunks, scrollProgress]);

  useFrame((state) => {
    if (!linesRef.current) return;
    
    const time = state.clock.elapsedTime;
    linesRef.current.children.forEach((line, index) => {
      const material = (line as THREE.Line).material as THREE.LineBasicMaterial;
      material.opacity = 0.1 + Math.sin(time * 0.8 + index * 0.4) * 0.1;
    });
  });

  return (
    <group ref={linesRef}>
      {connections.map((connection, index) => {
        const points = [connection.from, connection.to];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        
        return (
          <line key={index} geometry={geometry}>
            <lineBasicMaterial
              color={connection.color}
              transparent
              opacity={0.2}
              blending={THREE.AdditiveBlending}
            />
          </line>
        );
      })}
    </group>
  );
};

export default DataUniverseScene;