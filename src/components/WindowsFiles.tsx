'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

interface WindowsFilesProps {
  scrollProgress: number;
}

const WindowsFiles: React.FC<WindowsFilesProps> = ({ scrollProgress }) => {
  const groupRef = useRef<THREE.Group>(null);

  // File types data
  const fileTypes = useMemo(() => [
    {
      id: 'folder1',
      type: 'FOLDER',
      position: new THREE.Vector3(-8, 3, -10),
      color: '#FFD700',
      icon: '📁',
      label: 'FOLDER',
      bounceOffset: 0
    },
    {
      id: 'excel1',
      type: 'XLS',
      position: new THREE.Vector3(5, 4, -15),
      color: '#217346',
      icon: '📊',
      label: 'XLS',
      bounceOffset: 0.5
    },
    {
      id: 'pdf1',
      type: 'PDF',
      position: new THREE.Vector3(-3, 5, -8),
      color: '#DC143C',
      icon: '📄',
      label: 'PDF',
      bounceOffset: 1.0
    },
    {
      id: 'ppt1',
      type: 'PPT',
      position: new THREE.Vector3(10, 3, -12),
      color: '#D04423',
      icon: '📊',
      label: 'PPT',
      bounceOffset: 1.5
    },
    {
      id: 'word1',
      type: 'DOC',
      position: new THREE.Vector3(-12, 4, -18),
      color: '#2B579A',
      icon: '📝',
      label: 'DOC',
      bounceOffset: 0.3
    },
    {
      id: 'csv1',
      type: 'CSV',
      position: new THREE.Vector3(2, 6, -20),
      color: '#0F7B0F',
      icon: '📋',
      label: 'CSV',
      bounceOffset: 0.8
    },
    {
      id: 'txt1',
      type: 'TXT',
      position: new THREE.Vector3(-7, 3, -25),
      color: '#666666',
      icon: '📄',
      label: 'TXT',
      bounceOffset: 1.2
    },
    {
      id: 'img1',
      type: 'IMG',
      position: new THREE.Vector3(8, 5, -22),
      color: '#FF6B35',
      icon: '🖼️',
      label: 'IMG',
      bounceOffset: 0.7
    }
  ], []);

  useFrame((state) => {
    if (!groupRef.current) return;

    const time = state.clock.elapsedTime;
    
    // Hide files as we scroll away (fade out after scroll progress > 0.15)
    const opacity = Math.max(0, 1 - (scrollProgress * 6));
    // Only fade the group, not individual materials to keep text always visible initially
    if (scrollProgress > 0.15) {
      groupRef.current.traverse((child) => {
        if (child.material) {
          child.material.opacity = opacity;
        }
      });
    }

    // Scale down files as we scroll away, but keep them visible longer
    const scale = Math.max(0.1, 1 - (scrollProgress * 1.5));
    groupRef.current.scale.setScalar(scale);
  });

  // Only show at the beginning - visible longer
  if (scrollProgress > 0.4) return null;

  return (
    <group ref={groupRef}>
      {/* Large illuminated sign */}
      <group position={[0, 12, -15]}>
        {/* Sign background - glowing white rectangle */}
        <mesh>
          <boxGeometry args={[20, 6, 0.5]} />
          <meshBasicMaterial 
            color="#ffffff" 
            transparent 
            opacity={0.9}
          />
        </mesh>
        
        {/* Sign glow effect */}
        <mesh position={[0, 0, 0.1]}>
          <boxGeometry args={[22, 8, 0.1]} />
          <meshBasicMaterial 
            color="#ffffff" 
            transparent 
            opacity={0.3}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        
        {/* Sign text */}
        <Text
          text="EMPRESA"
          fontSize={3}
          color="#000000"
          anchorX="center"
          anchorY="middle"
          position={[0, 1.5, 0.3]}
        >
          <meshBasicMaterial color="#000000" />
        </Text>
        
        <Text
          text="DATA NO ESTRUCTURADA"
          fontSize={1.8}
          color="#000000"
          anchorX="center"
          anchorY="middle"
          position={[0, -1, 0.3]}
        >
          <meshBasicMaterial color="#000000" />
        </Text>
      </group>

      {/* Windows file icons */}
      {fileTypes.map((file) => (
        <WindowsFile 
          key={file.id}
          file={file}
        />
      ))}
    </group>
  );
};

// Individual file component
interface FileData {
  id: string;
  type: string;
  position: THREE.Vector3;
  color: string;
  icon: string;
  label: string;
  bounceOffset: number;
}

interface WindowsFileProps {
  file: FileData;
}

const WindowsFile: React.FC<WindowsFileProps> = ({ file }) => {
  const meshRef = useRef<THREE.Group>(null);
  const textRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    
    const time = state.clock.elapsedTime;
    
    // Bouncing animation with individual offset
    const bounce = Math.sin(time * 2 + file.bounceOffset * Math.PI) * 0.5;
    meshRef.current.position.copy(file.position);
    meshRef.current.position.y += bounce;
    
    // Slight rotation for more dynamic feel
    meshRef.current.rotation.y = Math.sin(time * 0.5 + file.bounceOffset) * 0.1;
    
    // Keep text always fully visible initially
    if (textRef.current && textRef.current.material) {
      const material = textRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 1; // Always fully visible
    }
  });

  return (
    <group ref={meshRef}>
      {/* File body - large cube */}
      <mesh>
        <boxGeometry args={[4, 5, 1]} />
        <meshBasicMaterial 
          color={file.color} 
          transparent 
          opacity={0.8}
        />
      </mesh>
      
      {/* File border */}
      <mesh>
        <boxGeometry args={[4.2, 5.2, 1.1]} />
        <meshBasicMaterial 
          color="#ffffff" 
          transparent 
          opacity={0.3}
        />
      </mesh>
      
      {/* File icon (emoji) */}
      <Text
        text={file.icon}
        fontSize={2}
        anchorX="center"
        anchorY="middle"
        position={[0, 1, 0.6]}
      >
        <meshBasicMaterial />
      </Text>
      
      {/* File type text - LARGE AND PROMINENT */}
      <Text
        ref={textRef}
        text={file.type}
        fontSize={1.5}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        position={[0, -0.5, 0.6]}
      >
        <meshBasicMaterial 
          color="#ffffff" 
          transparent={true}
          opacity={1}
        />
      </Text>
      
      {/* Glow effect */}
      <mesh position={[0, 0, -0.1]}>
        <boxGeometry args={[5, 6, 0.5]} />
        <meshBasicMaterial 
          color={file.color} 
          transparent 
          opacity={0.2}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
};

export default WindowsFiles;