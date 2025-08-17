'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

interface KnowledgeGraphSceneProps {
  scrollProgress: number;
}

const KnowledgeGraphScene: React.FC<KnowledgeGraphSceneProps> = ({ scrollProgress }) => {
  const groupRef = useRef<THREE.Group>(null);

  // Knowledge graph nodes - representing key concepts, entities, and relationships
  const graphNodes = useMemo(() => {
    const nodes: { id: number; type: string; position: [number, number, number]; color: string; size: number }[] = [];
    const nodeTypes = [
      { type: 'CORE', color: '#FF6B6B', size: 2, count: 3 },      // Core concepts
      { type: 'ENTITY', color: '#4ECDC4', size: 1.5, count: 8 },   // Entities  
      { type: 'PROCESS', color: '#45B7D1', size: 1.3, count: 6 },  // Processes
      { type: 'RELATION', color: '#F9CA24', size: 1, count: 12 }   // Relations
    ];

    let nodeId = 0;
    nodeTypes.forEach((nodeType, typeIndex) => {
      for (let i = 0; i < nodeType.count; i++) {
        // Spherical distribution for organic graph layout
        const phi = Math.acos(-1 + (2 * (nodeId + i)) / 29); // 29 total nodes
        const theta = Math.sqrt(29 * Math.PI) * phi;
        
        const radius = 8 + typeIndex * 2 + Math.random() * 3;
        
        nodes.push({
          id: nodeId++,
          type: nodeType.type,
          color: nodeType.color,
          size: nodeType.size,
          position: new THREE.Vector3(
            radius * Math.sin(phi) * Math.cos(theta),
            radius * Math.sin(phi) * Math.sin(theta), 
            radius * Math.cos(phi)
          ),
          connections: [] as number[], // Will be populated
          pulse: Math.random() * Math.PI * 2 // For pulsing animation
        });
      }
    });

    // Generate connections based on proximity and type compatibility
    nodes.forEach((node, index) => {
      const maxConnections = node.type === 'CORE' ? 5 : node.type === 'ENTITY' ? 3 : 2;
      const connectionCandidates = nodes
        .filter((other, otherIndex) => otherIndex !== index)
        .map((other, otherIndex) => ({
          ...other,
          originalIndex: otherIndex < index ? otherIndex : otherIndex + 1,
          distance: node.position.distanceTo(other.position)
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, maxConnections);

      node.connections = connectionCandidates.map(candidate => candidate.originalIndex);
    });

    return nodes;
  }, []);

  // Generate connection lines between nodes
  const connections = useMemo(() => {
    const lines: { from: [number, number, number]; to: [number, number, number]; opacity: number }[] = [];
    graphNodes.forEach((node, index) => {
      node.connections.forEach((connectionIndex: number) => {
        if (connectionIndex > index) { // Avoid duplicate lines
          const connectedNode = graphNodes[connectionIndex];
          lines.push({
            from: node.position,
            to: connectedNode.position,
            fromType: node.type,
            toType: connectedNode.type,
            strength: 1 / (1 + node.position.distanceTo(connectedNode.position) * 0.1)
          });
        }
      });
    });
    return lines;
  }, [graphNodes]);

  useFrame((state) => {
    if (!groupRef.current) return;
    
    const time = state.clock.elapsedTime;
    
    // Calculate animation progress
    const sectionStart = 0.42;
    const sectionEnd = 0.7;
    const localProgress = Math.min(1, Math.max(0, (scrollProgress - sectionStart) / (sectionEnd - sectionStart)));
    
    // Animate graph formation
    groupRef.current.children.forEach((child, index) => {
      if (child.userData.isNode) {
        const node = graphNodes[index];
        if (!node) return;
        
        // Nodes appear progressively
        const nodeProgress = Math.min(1, Math.max(0, (localProgress - index * 0.02) / 0.8));
        
        if (nodeProgress > 0) {
          // Scale animation
          const scale = nodeProgress * node.size;
          child.scale.setScalar(scale);
          
          // Floating motion
          const originalY = node.position.y;
          child.position.y = originalY + Math.sin(time * 0.8 + node.pulse) * 0.5;
          
          // Pulsing brightness
          const pulseIntensity = 0.8 + Math.sin(time * 2 + node.pulse) * 0.3;
          child.traverse((obj) => {
            if (obj.material) {
              obj.material.opacity = Math.min(1, nodeProgress * pulseIntensity);
            }
          });
          
          // Rotation for core nodes
          if (node.type === 'CORE') {
            child.rotation.y = time * 0.3;
            child.rotation.x = time * 0.2;
          }
        }
      }
      
      if (child.userData.isConnection) {
        // Connections appear after nodes
        const connectionProgress = Math.min(1, Math.max(0, (localProgress - 0.3) / 0.7));
        child.traverse((obj) => {
          if (obj.material) {
            obj.material.opacity = connectionProgress * 0.4;
          }
        });
      }
    });
    
    // Rotate entire graph slowly
    if (groupRef.current) {
      groupRef.current.rotation.y = time * 0.1;
    }
  });

  // Show only during knowledge graph section
  const sectionStart = 0.42;
  const sectionEnd = 0.7;
  if (scrollProgress < sectionStart || scrollProgress > sectionEnd) return null;

  return (
    <group ref={groupRef}>
      {/* Graph nodes */}
      {graphNodes.map((node, index) => (
        <group 
          key={`node-${node.id}`}
          position={node.position}
          userData={{ isNode: true }}
        >
          {/* Main node sphere */}
          <mesh>
            <sphereGeometry args={[node.size, 12, 12]} />
            <meshBasicMaterial 
              color={node.color}
              transparent
              opacity={0.8}
            />
          </mesh>
          
          {/* Node glow */}
          <mesh>
            <sphereGeometry args={[node.size * 1.3, 8, 8]} />
            <meshBasicMaterial 
              color={node.color}
              transparent
              opacity={0.2}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          
          {/* Node type label for core nodes */}
          {node.type === 'CORE' && (
            <Text
              text={`CORE ${node.id + 1}`}
              fontSize={0.6}
              color="#FFFFFF"
              anchorX="center"
              anchorY="middle"
              position={[0, 0, node.size + 0.5]}
            >
              <meshBasicMaterial 
                color="#FFFFFF"
                toneMapped={false}
              />
            </Text>
          )}
        </group>
      ))}

      {/* Connection lines */}
      {connections.map((connection, index) => {
        const midpoint = new THREE.Vector3().addVectors(connection.from, connection.to).multiplyScalar(0.5);
        const direction = new THREE.Vector3().subVectors(connection.to, connection.from);
        const distance = direction.length();
        
        return (
          <group key={`connection-${index}`} userData={{ isConnection: true }}>
            <mesh position={midpoint} lookAt={connection.to}>
              <cylinderGeometry args={[0.02, 0.02, distance, 6]} />
              <meshBasicMaterial 
                color="#64FFDA"
                transparent
                opacity={0.4}
              />
            </mesh>
            
            {/* Connection strength indicator */}
            <mesh position={midpoint}>
              <sphereGeometry args={[0.1 * connection.strength, 6, 6]} />
              <meshBasicMaterial 
                color="#FFEB3B"
                transparent
                opacity={0.6}
              />
            </mesh>
          </group>
        );
      })}

      {/* Central knowledge core */}
      <group position={[0, 0, 0]}>
        <mesh>
          <octahedronGeometry args={[3]} />
          <meshBasicMaterial 
            color="#FF6B6B"
            transparent
            opacity={0.1}
            wireframe
          />
        </mesh>
        
        <Text
          text="KNOWLEDGE GRAPH"
          fontSize={1.8}
          color="#FF6B6B"
          anchorX="center"
          anchorY="middle"
          position={[0, 5, 0]}
        >
          <meshBasicMaterial 
            color="#FF6B6B"
            toneMapped={false}
          />
        </Text>
      </group>

      {/* Information flow particles */}
      {Array.from({ length: 20 }, (_, i) => (
        <mesh 
          key={`particle-${i}`}
          position={[
            (Math.random() - 0.5) * 30,
            (Math.random() - 0.5) * 30,
            (Math.random() - 0.5) * 30
          ]}
        >
          <sphereGeometry args={[0.1, 4, 4]} />
          <meshBasicMaterial 
            color="#64FFDA"
            transparent
            opacity={0.6}
          />
        </mesh>
      ))}
    </group>
  );
};

export default KnowledgeGraphScene;