'use client';

import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import DataFlowVisualization from '@/components/DataFlowVisualization';
import { SectionProps } from '@/types';
import * as THREE from 'three';

const DataGraph3D: React.FC<SectionProps> = ({
  isActive,
  scrollProgress
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [interactionPoint, setInteractionPoint] = useState<THREE.Vector3 | null>(null);
  const { camera, gl } = useThree();

  // Handle mouse interaction for data chunks
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isActive) return;

      // Convert mouse position to 3D world space
      const rect = gl.domElement.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      const vector = new THREE.Vector3(x, y, 0.5);
      vector.unproject(camera);
      
      const direction = vector.sub(camera.position).normalize();
      const distance = -camera.position.z / direction.z;
      const worldPosition = camera.position.clone().add(direction.multiplyScalar(distance));
      
      setInteractionPoint(worldPosition);
    };

    const handleMouseLeave = () => {
      setInteractionPoint(null);
    };

    if (isActive) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isActive, camera, gl]);

  // Camera animation based on scroll
  useFrame(() => {
    if (!groupRef.current || !isActive) return;

    // Smooth camera movement for immersive effect
    const targetZ = 5 + (scrollProgress * 10);
    camera.position.z += (targetZ - camera.position.z) * 0.02;

    // Gentle camera sway
    const time = Date.now() * 0.001;
    camera.position.x = Math.sin(time * 0.1) * 0.5;
    camera.position.y = Math.cos(time * 0.07) * 0.3;
    
    // Look at center with slight offset
    camera.lookAt(
      Math.sin(time * 0.05) * 2,
      Math.cos(time * 0.03) * 1,
      0
    );
  });

  if (!isActive) return null;

  return (
    <group ref={groupRef}>
      <DataFlowVisualization
        isActive={isActive}
        interactionPoint={interactionPoint}
      />
    </group>
  );
};

export default DataGraph3D;