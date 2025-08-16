'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

interface VectorizationSceneProps {
  scrollProgress: number;
}

const VectorizationScene: React.FC<VectorizationSceneProps> = ({ scrollProgress }) => {
  const groupRef = useRef<THREE.Group>(null);

  // Text chunks data - representing document fragments
  const textChunks = useMemo(() => [
    {
      id: 'chunk1',
      text: 'Proceso de\nnegocio',
      position: new THREE.Vector3(-15, 8, -20),
      color: '#60A5FA'
    },
    {
      id: 'chunk2', 
      text: 'Política\nempresarial',
      position: new THREE.Vector3(15, 6, -18),
      color: '#34D399'
    },
    {
      id: 'chunk3',
      text: 'Datos\ncliente',
      position: new THREE.Vector3(-12, -5, -22),
      color: '#F87171'
    },
    {
      id: 'chunk4',
      text: 'Metadata\ndocumento',
      position: new THREE.Vector3(18, -3, -16),
      color: '#FBBF24'
    }
  ], []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const time = state.clock.elapsedTime;
    
    // Database animation - core rotation and floating cubes
    const dbGroup = groupRef.current.children[0];
    if (dbGroup && dbGroup.type === 'Group') {
      // Rotate main core group (cube + text together)
      const coreGroup = dbGroup.children[0];
      if (coreGroup && coreGroup.userData.isCore) {
        coreGroup.rotation.x = time * 0.3;
        coreGroup.rotation.y = time * 0.5;
      }
      
      // Animate orbiting and floating cubes
      dbGroup.children.forEach((child, index) => {
        if (child.type === 'Mesh' && index > 0) { // Skip core and text
          // Check if it's an orbiting cube
          if (child.userData.isOrbiting) {
            const layer = child.userData.layer;
            const cubeIndex = child.userData.index;
            const radius = child.userData.radius;
            const baseAngle = child.userData.baseAngle;
            
            // Orbital motion - different speeds per layer
            const orbitSpeed = 0.3 + layer * 0.2;
            const currentAngle = baseAngle + time * orbitSpeed * (layer % 2 === 0 ? 1 : -1);
            
            child.position.x = Math.cos(currentAngle) * radius;
            child.position.z = Math.sin(currentAngle) * radius;
            child.position.y = (layer - 1) * 2 + Math.sin(time * 0.5 + cubeIndex) * 0.3;
            
            // Self rotation
            child.rotation.x = time * 0.5;
            child.rotation.y = time * 0.3;
            child.rotation.z = time * 0.4;
          } else {
            // Regular floating cubes
            const originalPos = child.userData.originalPosition || child.position.clone();
            child.userData.originalPosition = originalPos;
            child.position.y = originalPos.y + Math.sin(time * 0.5 + index) * 0.8;
            child.rotation.x = time * 0.4;
            child.rotation.y = time * 0.2;
            child.rotation.z = time * 0.3;
          }
        }
      });
    }
    
    // Text chunks floating animation
    groupRef.current.children.forEach((child, index) => {
      if (child.userData.isChunk) {
        const originalY = textChunks[index]?.position.y || 0;
        child.position.y = originalY + Math.sin(time + index) * 0.5;
      }
    });
  });

  // Show during the vectorization section - stays longer until next text appears
  const sectionStart = 0.14;
  const sectionEnd = 0.4;
  if (scrollProgress < sectionStart || scrollProgress > sectionEnd) return null;

  return (
    <group ref={groupRef}>
      {/* Database in Motion - Animated Data Structure */}
      <group position={[0, 0, 10]} ref={(ref) => {
        if (ref) {
          // Stay in front until almost the end, then move away quickly
          const totalProgress = (scrollProgress - sectionStart) / (sectionEnd - sectionStart);
          
          if (totalProgress < 0.8) {
            // Stay in foreground for 80% of the time
            ref.position.z = 10;
          } else {
            // Move away quickly in the last 20%
            const fastMoveProgress = (totalProgress - 0.8) / 0.2;
            ref.position.z = 10 - (fastMoveProgress * 30); // Quick movement to z=-20
          }
        }
      }}>
        {/* Central Database Core with Text - Large and Solid */}
        <group position={[0, 0, 0]} userData={{ isCore: true }}>
          {/* The green cube */}
          <mesh>
            <octahedronGeometry args={[6]} />
            <meshBasicMaterial 
              color="#00FF88"
              toneMapped={false}
            />
          </mesh>
          
        </group>
        
        {/* Orbiting Data Cubes - Multiple layers around the core */}
        {Array.from({ length: 3 }, (_, layer) => {
          const radius = 8 + layer * 2; // Larger orbital radii for bigger cube
          const cubesInLayer = 8 + layer * 2; // More cubes in outer layers
          
          return Array.from({ length: cubesInLayer }, (_, i) => {
            const angle = (i / cubesInLayer) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const y = (layer - 1) * 2; // Vertical spacing between layers
            const fileColors = ['#60A5FA', '#8B5CF6', '#F87171', '#FBBF24', '#EC4899'];
            const cubeColor = fileColors[(layer + i) % fileColors.length];
            
            return (
              <mesh 
                key={`orbit-${layer}-${i}`} 
                position={[x, y, z]}
                userData={{ 
                  layer: layer, 
                  index: i, 
                  radius: radius, 
                  baseAngle: angle,
                  isOrbiting: true 
                }}
              >
                <boxGeometry args={[0.4, 0.4, 0.4]} />
                <meshBasicMaterial 
                  color={cubeColor}
                  toneMapped={false}
                  transparent
                  opacity={0.8}
                />
              </mesh>
            );
          });
        }).flat()}
        
        {/* Index Structures - Floating around */}
        {Array.from({ length: 15 }, (_, i) => {
          const angle = (i / 15) * Math.PI * 2;
          const radius = 6 + Math.sin(i) * 2;
          const x = Math.cos(angle) * radius;
          const z = Math.sin(angle) * radius;
          const y = Math.sin(i * 0.5) * 3;
          const fileColors = ['#60A5FA', '#8B5CF6', '#F87171', '#FBBF24', '#EC4899']; // azul, púrpura, rojo, amarillo, rosado
          const indexColor = fileColors[i % fileColors.length];
          
          return (
            <mesh key={`index-${i}`} position={[x, y, z]}>
              <boxGeometry args={[0.4, 0.4, 0.4]} />
              <meshBasicMaterial 
                color={indexColor}
                toneMapped={false}
                transparent
                opacity={0.8}
              />
            </mesh>
          );
        })}
        
      </group>

      {/* Static VECTOR DB text - completely fixed position */}
      <Text
        text="VECTOR DB"
        fontSize={3}
        color="#FF0000"
        anchorX="center"
        anchorY="middle"
        position={[0, 5, 0]}
      >
        <meshBasicMaterial 
          color="#FF0000"
          toneMapped={false}
        />
      </Text>

      {/* Text chunks */}
      {textChunks.map((chunk, index) => (
        <group key={chunk.id} userData={{ isChunk: true }}>
          <Text
            text={chunk.text}
            fontSize={1.2}
            color={chunk.color}
            anchorX="center"
            anchorY="middle"
            position={chunk.position}
          >
            <meshBasicMaterial 
              color={chunk.color}
              transparent
              opacity={1}
            />
          </Text>
        </group>
      ))}
    </group>
  );
};

export default VectorizationScene;