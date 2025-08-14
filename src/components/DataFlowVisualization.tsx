'use client';

import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

interface DataChunk {
  id: string;
  text: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: string;
  size: number;
  opacity: number;
  baseY: number;
  rotationSpeed: number;
  type: 'concept' | 'connection' | 'insight' | 'process';
}

interface DataFlowVisualizationProps {
  isActive?: boolean;
  interactionPoint?: THREE.Vector3 | null;
}

// Text content divided into semantic chunks
const textContent = `
Cuando realizas una consulta, el sistema no solo busca vectores similares. Explora activamente los nodos y relaciones cercanas en el grafo, proporcionando al LLM un contexto multidimensional. Es como la diferencia entre leer una página aislada de un libro y entender cómo esa página se conecta con capítulos anteriores y posteriores.

Reducción drástica de alucinaciones: Las respuestas se anclan en conexiones estructuradas y verificables del grafo. En lugar de que el modelo "imagine" relaciones, trabaja con conexiones explícitas y validadas. Para una industria donde un error puede costar vidas, esta precisión no es negociable.

Transparencia y gobernanza: Aquí está la magia real. Cuando el sistema genera una respuesta, puedes rastrear exactamente el camino a través del grafo: qué nodos se consultaron, qué relaciones se siguieron, por qué se priorizaron ciertas conexiones. Esta explicabilidad no es solo una característica técnica; es un requisito
`;

// Phosphorescent color palette
const colors = {
  concept: '#00FFB3',      // Cyan-green
  connection: '#FF0080',   // Magenta
  insight: '#FFFF00',      // Electric yellow
  process: '#8A2BE2',      // Blue-violet
  accent: '#FF6600'        // Orange accent
};

const DataFlowVisualization: React.FC<DataFlowVisualizationProps> = ({ 
  isActive = true, 
  interactionPoint = null 
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [chunks, setChunks] = useState<DataChunk[]>([]);
  const [performanceGrade, setPerformanceGrade] = useState<'high' | 'medium' | 'low'>('high');
  const mouseInfluence = useRef(new THREE.Vector3());
  const lastFrameTime = useRef(Date.now());

  // Parse text into semantic chunks with performance optimization
  const dataChunks = useMemo(() => {
    const sentences = textContent.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const processedChunks: DataChunk[] = [];

    sentences.forEach((sentence, index) => {
      // Divide each sentence into meaningful fragments
      const words = sentence.trim().split(/\s+/);
      const fragments = [];
      
      // Group words into chunks of 2-4 words
      for (let i = 0; i < words.length; i += Math.floor(Math.random() * 3) + 2) {
        const fragment = words.slice(i, i + Math.floor(Math.random() * 3) + 2).join(' ');
        if (fragment.length > 0) {
          fragments.push(fragment);
        }
      }

      fragments.forEach((fragment, fragmentIndex) => {
        // Determine chunk type based on content
        let type: DataChunk['type'] = 'concept';
        if (fragment.includes('conexión') || fragment.includes('relación') || fragment.includes('conecta')) {
          type = 'connection';
        } else if (fragment.includes('grafo') || fragment.includes('sistema') || fragment.includes('genera')) {
          type = 'process';
        } else if (fragment.includes('magia') || fragment.includes('precisión') || fragment.includes('transparencia')) {
          type = 'insight';
        }

        // Create random 3D position in infinite space
        const angle = (index * fragmentIndex * 0.7) % (Math.PI * 2);
        const radius = 8 + Math.random() * 12;
        const height = (Math.random() - 0.5) * 20;

        processedChunks.push({
          id: `chunk-${index}-${fragmentIndex}`,
          text: fragment,
          position: new THREE.Vector3(
            Math.cos(angle) * radius,
            height,
            Math.sin(angle) * radius
          ),
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 0.02,
            (Math.random() - 0.5) * 0.01,
            (Math.random() - 0.5) * 0.02
          ),
          color: colors[type],
          size: 0.3 + Math.random() * 0.4,
          opacity: 0.8 + Math.random() * 0.2,
          baseY: height,
          rotationSpeed: (Math.random() - 0.5) * 0.5,
          type
        });
      });
    });

    // PERFORMANCE CONSTRAINT: Limit to max 800 particles (within 1000 limit)
    return processedChunks.slice(0, 800);
  }, []);

  // Initialize chunks
  useEffect(() => {
    setChunks(dataChunks);
  }, [dataChunks]);

  // Animation loop with performance monitoring
  useFrame((state) => {
    if (!groupRef.current || !isActive) return;

    const currentTime = Date.now();
    const frameTime = currentTime - lastFrameTime.current;
    lastFrameTime.current = currentTime;

    // PERFORMANCE MONITORING: Adapt based on frame rate
    if (frameTime > 20) { // Less than 50 FPS
      setPerformanceGrade('low');
    } else if (frameTime > 16) { // Less than 60 FPS
      setPerformanceGrade('medium');
    } else {
      setPerformanceGrade('high');
    }

    const time = state.clock.elapsedTime;
    
    // Update mouse influence
    if (interactionPoint) {
      mouseInfluence.current.copy(interactionPoint);
    }

    // LOD-based chunk updates
    const updateFrequency = performanceGrade === 'low' ? 3 : performanceGrade === 'medium' ? 2 : 1;
    if (Math.floor(time * 60) % updateFrequency !== 0) return;

    // Update chunks with performance scaling
    setChunks(prevChunks => 
      prevChunks.map((chunk, index) => {
        // Skip updates for distant/invisible chunks on low performance
        if (performanceGrade === 'low' && index % 3 !== 0) {
          return chunk;
        }

        const newChunk = { ...chunk };
        
        // Gentle floating motion with individual rhythm
        const floatOffset = Math.sin(time * 0.5 + newChunk.position.x * 0.1) * 2;
        newChunk.position.y = newChunk.baseY + floatOffset;
        
        // Orbital movement around center (reduced on low performance)
        const orbitSpeed = (0.1 + Math.sin(time * 0.1) * 0.05) * (performanceGrade === 'low' ? 0.5 : 1);
        newChunk.position.x += Math.cos(time * orbitSpeed + newChunk.position.z * 0.1) * 0.01;
        newChunk.position.z += Math.sin(time * orbitSpeed + newChunk.position.x * 0.1) * 0.01;
        
        // Mouse interaction - repulsion effect (reduced on low performance)
        if (interactionPoint && performanceGrade !== 'low') {
          const distance = newChunk.position.distanceTo(interactionPoint);
          if (distance < 5) {
            const repelForce = (5 - distance) / 5;
            const direction = newChunk.position.clone().sub(interactionPoint).normalize();
            newChunk.position.add(direction.multiplyScalar(repelForce * 0.1));
          }
        }
        
        // Pulsing opacity based on type
        const pulseSpeed = newChunk.type === 'insight' ? 2 : 1;
        newChunk.opacity = 0.6 + Math.sin(time * pulseSpeed + newChunk.position.x * 0.2) * 0.3;
        
        // Keep chunks within bounds (infinite feel but contained)
        const maxDistance = 25;
        if (newChunk.position.length() > maxDistance) {
          newChunk.position.normalize().multiplyScalar(maxDistance * 0.9);
        }

        return newChunk;
      })
    );
  });

  return (
    <group ref={groupRef}>
      {/* Infinite space background effect */}
      <mesh position={[0, 0, -50]}>
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial color="#000" transparent opacity={0.95} />
      </mesh>
      
      {/* Data chunks with LOD rendering */}
      {chunks.map((chunk, index) => {
        // LOD: Skip rendering distant chunks on low performance
        if (performanceGrade === 'low' && index % 2 !== 0) return null;
        if (performanceGrade === 'medium' && index % 4 === 3) return null;
        
        return (
          <DataChunkComponent 
            key={chunk.id}
            chunk={chunk}
            performanceGrade={performanceGrade}
          />
        );
      })}
      
      {/* Connection lines between nearby chunks - only on high performance */}
      {performanceGrade === 'high' && <ConnectionLines chunks={chunks} />}
    </group>
  );
};

// Individual data chunk component
interface DataChunkComponentProps {
  chunk: DataChunk;
  performanceGrade?: 'high' | 'medium' | 'low';
}

const DataChunkComponent: React.FC<DataChunkComponentProps> = ({ chunk, performanceGrade = 'high' }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    
    const time = state.clock.elapsedTime;
    
    // Reduce rotation frequency on low performance
    const rotationMultiplier = performanceGrade === 'low' ? 0.5 : 1;
    
    // Gentle rotation
    meshRef.current.rotation.y = time * chunk.rotationSpeed * rotationMultiplier;
    meshRef.current.rotation.x = Math.sin(time * 0.3) * 0.1 * rotationMultiplier;
    
    // Update position
    meshRef.current.position.copy(chunk.position);
  });

  return (
    <mesh ref={meshRef}>
      <Text
        text={chunk.text}
        fontSize={chunk.size * (performanceGrade === 'low' ? 0.8 : 1)}
        color={chunk.color}
        anchorX="center"
        anchorY="middle"
        maxWidth={6}
        textAlign="center"
        // Add glow effect only on high performance
        outlineWidth={performanceGrade === 'high' ? 0.05 : 0}
        outlineColor={chunk.color}
      >
        <meshBasicMaterial 
          transparent 
          opacity={chunk.opacity}
          color={chunk.color}
        />
      </Text>
      
      {/* Phosphorescent glow effect - only on medium/high performance */}
      {performanceGrade !== 'low' && (
        <mesh position={[0, 0, -0.1]}>
          <planeGeometry args={[chunk.text.length * 0.1, 0.6]} />
          <meshBasicMaterial
            color={chunk.color}
            transparent
            opacity={chunk.opacity * 0.2}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
    </mesh>
  );
};

// Connection lines between related chunks
interface ConnectionLinesProps {
  chunks: DataChunk[];
}

const ConnectionLines: React.FC<ConnectionLinesProps> = ({ chunks }) => {
  const linesRef = useRef<THREE.Group>(null);
  
  const connections = useMemo(() => {
    const lines: Array<{from: THREE.Vector3; to: THREE.Vector3; color: string}> = [];
    
    // PERFORMANCE OPTIMIZATION: Only process every 4th chunk for connections
    const sampledChunks = chunks.filter((_, index) => index % 4 === 0);
    
    // Create connections between nearby chunks of related types
    sampledChunks.forEach((chunk1, i) => {
      sampledChunks.slice(i + 1).forEach(chunk2 => {
        const distance = chunk1.position.distanceTo(chunk2.position);
        
        // Connect nearby chunks or same type chunks (reduced distances for performance)
        if (distance < 6 || (chunk1.type === chunk2.type && distance < 10)) {
          const connectionType = chunk1.type === chunk2.type ? chunk1.type : 'connection';
          lines.push({
            from: chunk1.position.clone(),
            to: chunk2.position.clone(),
            color: colors[connectionType]
          });
        }
      });
    });
    
    // PERFORMANCE CONSTRAINT: Limit to max 30 connections (well within polygon limits)
    return lines.slice(0, 30);
  }, [chunks]);

  useFrame((state) => {
    if (!linesRef.current) return;
    
    // Animate connection opacity
    const time = state.clock.elapsedTime;
    linesRef.current.children.forEach((line, index) => {
      const material = (line as THREE.Line).material as THREE.LineBasicMaterial;
      material.opacity = 0.1 + Math.sin(time * 0.5 + index * 0.3) * 0.1;
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

export default DataFlowVisualization;