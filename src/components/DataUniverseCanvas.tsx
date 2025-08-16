'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense, useEffect, useRef, useState } from 'react';
import { ScrollState } from '@/types';
import DataUniverseScene from './DataUniverseScene';
import * as THREE from 'three';

interface DataUniverseCanvasProps {
  scrollState: ScrollState;
  className?: string;
  sceneTriggered?: {
    vectorization: boolean;
    entityExtraction: boolean;
    knowledgeGraph: boolean;
    queryResponse: boolean;
  };
}

export const DataUniverseCanvas: React.FC<DataUniverseCanvasProps> = ({ 
  scrollState, 
  className = '',
  sceneTriggered = {
    vectorization: false,
    entityExtraction: false,
    knowledgeGraph: false,
    queryResponse: false
  }
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [interactionPoint, setInteractionPoint] = useState<THREE.Vector3 | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 5 }); // Start camera slightly elevated

  // Handle mouse interaction and dragging for lateral movement
  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (!canvasRef.current) return;
      setIsDragging(true);
      setDragStart({ x: event.clientX, y: event.clientY });
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Handle dragging for camera movement
      if (isDragging) {
        const deltaX = (event.clientX - dragStart.x) * 0.1;
        const deltaY = -(event.clientY - dragStart.y) * 0.1;
        
        setCameraOffset(prev => ({
          x: prev.x + deltaX,
          y: prev.y + deltaY
        }));
        
        setDragStart({ x: event.clientX, y: event.clientY });
      }

      // Create interaction point for chunks (always active)
      const worldPosition = new THREE.Vector3(
        cameraOffset.x + x * 20,
        cameraOffset.y + y * 15,
        (scrollState.progress * 6 - 3) * 60
      );
      
      setInteractionPoint(worldPosition);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleMouseLeave = () => {
      setInteractionPoint(null);
      setIsDragging(false);
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [scrollState.progress]);

  return (
    <div className={`fixed inset-0 -z-10 ${className}`}>
      <Canvas
        ref={canvasRef}
        camera={{ 
          position: [0, 0, 20], 
          fov: 75, 
          near: 0.1, 
          far: 2000 
        }}
        dpr={[1, 2]}
        performance={{ min: 0.5, max: 1, debounce: 200 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance"
        }}
        style={{ background: '#000000' }}
      >
        <Suspense fallback={null}>
          {/* Ambient lighting for the data chunks */}
          <ambientLight intensity={0.2} />
          <pointLight position={[50, 50, 50]} intensity={0.3} />
          <pointLight position={[-50, -50, -50]} intensity={0.2} />
          
          <DataUniverseScene 
            scrollProgress={scrollState.progress}
            currentSection={scrollState.currentSection}
            interactionPoint={interactionPoint}
            cameraOffset={cameraOffset}
            sceneTriggered={sceneTriggered}
          />
        </Suspense>
      </Canvas>
    </div>
  );
};