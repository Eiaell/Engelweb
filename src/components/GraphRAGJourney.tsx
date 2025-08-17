'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

interface GraphRAGJourneyProps {
  scrollProgress: number;
}

const GraphRAGJourney: React.FC<GraphRAGJourneyProps> = ({ scrollProgress }) => {
  const groupRef = useRef<THREE.Group>(null);

  // Journey steps with 3D positions
  const journeySteps = useMemo(() => [
    {
      id: 'start',
      position: new THREE.Vector3(0, 2, -35),
      title: 'VIENE CON DATA NO ESTRUCTURADA',
      subtitle: 'Documentos, PDFs, Excel dispersos',
      color: '#FF4444'
    },
    {
      id: 'extraction',
      position: new THREE.Vector3(-15, 4, -55),
      title: 'EXTRACCIÓN',
      subtitle: 'Parsing y segmentación inteligente',
      color: '#FF6600'
    },
    {
      id: 'embedding',
      position: new THREE.Vector3(10, 6, -75),
      title: 'VECTORIZACIÓN',
      subtitle: 'Embeddings semánticos',
      color: '#FFAA00'
    },
    {
      id: 'relationships',
      position: new THREE.Vector3(-8, 8, -95),
      title: 'RELACIONES',
      subtitle: 'Detección de conexiones',
      color: '#FFDD00'
    },
    {
      id: 'graph',
      position: new THREE.Vector3(12, 10, -115),
      title: 'GRAFO DE CONOCIMIENTO',
      subtitle: 'Estructura conectada',
      color: '#00FF88'
    },
    {
      id: 'reasoning',
      position: new THREE.Vector3(-5, 12, -135),
      title: 'RAZONAMIENTO',
      subtitle: 'GraphRAG en acción',
      color: '#00AAFF'
    },
    {
      id: 'insights',
      position: new THREE.Vector3(8, 14, -155),
      title: 'INSIGHTS',
      subtitle: 'Decisiones precisas',
      color: '#8800FF'
    }
  ], []);

  // Create dotted red line path
  const pathGeometry = useMemo(() => {
    const points = [];
    const curve = new THREE.CatmullRomCurve3(
      journeySteps.map(step => step.position)
    );
    
    // Generate points along the curve
    const divisions = 200;
    for (let i = 0; i <= divisions; i++) {
      const t = i / divisions;
      const point = curve.getPoint(t);
      points.push(point);
    }
    
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [journeySteps]);

  // Create dotted line material - DISABLED
  const lineMaterial = useMemo(() => {
    return new THREE.LineDashedMaterial({
      color: '#00000000',
      dashSize: 3,
      gapSize: 2,
      linewidth: 3,
      transparent: true,
      opacity: 0.0 // HIDDEN - no red line
    });
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;

    const time = state.clock.elapsedTime;
    
    // Show journey path when we start moving away from files (after 30% scroll)
    const pathOpacity = Math.max(0, Math.min(1, (scrollProgress - 0.3) * 3));
    groupRef.current.traverse((child) => {
      if (child.material) {
        child.material.opacity = pathOpacity;
      }
    });

    // Animate dash offset for moving line effect
    if (groupRef.current.children[0] && groupRef.current.children[0].material) {
      const material = groupRef.current.children[0].material as THREE.LineDashedMaterial;
      material.dashSize = 3 + Math.sin(time * 2) * 0.5;
      material.needsUpdate = true;
    }

    // Scale based on zoom level
    const scale = 1 + scrollProgress * 0.5;
    groupRef.current.scale.setScalar(scale);
  });

  // Don't show until we start scrolling away from files
  if (scrollProgress < 0.35) return null;

  return (
    <group ref={groupRef}>
      {/* Connection line from files area */}
      <ConnectionLine scrollProgress={scrollProgress} />
      
      {/* Dotted red line path */}
      <line geometry={pathGeometry} material={lineMaterial} />
      
      {/* Journey step markers */}
      {journeySteps.map((step, index) => {
        // Show steps progressively as we scroll
        const stepProgress = Math.max(0, (scrollProgress - 0.3 - index * 0.08) * 5);
        if (stepProgress <= 0) return null;
        
        return (
          <JourneyStep 
            key={step.id}
            step={step}
            progress={Math.min(1, stepProgress)}
          />
        );
      })}
      
      {/* Arrow at the end of the path */}
      <Arrow 
        position={journeySteps[journeySteps.length - 1].position}
        direction={new THREE.Vector3(0.2, 0.1, -0.5).normalize()}
        scrollProgress={scrollProgress}
      />
    </group>
  );
};

// Individual journey step component
interface JourneyStepProps {
  step: {
    id: string;
    position: THREE.Vector3;
    title: string;
    subtitle: string;
    color: string;
  };
  progress: number;
}

const JourneyStep: React.FC<JourneyStepProps> = ({ step, progress }) => {
  const stepRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!stepRef.current) return;
    
    const time = state.clock.elapsedTime;
    
    // Gentle floating animation
    stepRef.current.position.copy(step.position);
    stepRef.current.position.y += Math.sin(time * 1.5 + step.position.x * 0.1) * 0.5;
    
    // Gentle rotation
    stepRef.current.rotation.y = time * 0.2;
    
    // Scale based on progress
    const scale = progress * 0.8 + 0.2;
    stepRef.current.scale.setScalar(scale);
  });

  return (
    <group ref={stepRef}>
      {/* Step marker sphere */}
      <mesh>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial 
          color={step.color} 
          transparent 
          opacity={progress * 0.8}
        />
      </mesh>
      
      {/* Glow effect */}
      <mesh>
        <sphereGeometry args={[1.5, 16, 16]} />
        <meshBasicMaterial 
          color={step.color} 
          transparent 
          opacity={progress * 0.3}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Step title */}
      <Text
        text={step.title}
        fontSize={0.8}
        color={step.color}
        anchorX="center"
        anchorY="middle"
        position={[0, 2.5, 0]}
        maxWidth={8}
        textAlign="center"
      >
        <meshBasicMaterial 
          color={step.color} 
          transparent 
          opacity={progress}
        />
      </Text>
      
      {/* Step subtitle */}
      <Text
        text={step.subtitle}
        fontSize={0.4}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        position={[0, 1.8, 0]}
        maxWidth={10}
        textAlign="center"
      >
        <meshBasicMaterial 
          color="#ffffff" 
          transparent 
          opacity={progress * 0.7}
        />
      </Text>
    </group>
  );
};

// Arrow component at the end of the journey
interface ArrowProps {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  scrollProgress: number;
}

const Arrow: React.FC<ArrowProps> = ({ position, direction, scrollProgress }) => {
  const arrowRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!arrowRef.current) return;
    
    const time = state.clock.elapsedTime;
    
    // Position the arrow
    arrowRef.current.position.copy(position);
    arrowRef.current.position.add(direction.clone().multiplyScalar(3));
    
    // Point in the direction
    arrowRef.current.lookAt(
      arrowRef.current.position.clone().add(direction)
    );
    
    // Pulsing animation
    const pulse = 1 + Math.sin(time * 3) * 0.2;
    arrowRef.current.scale.setScalar(pulse);
  });

  // Show arrow only when journey is mostly visible
  const arrowOpacity = Math.max(0, (scrollProgress - 0.7) * 5);
  if (arrowOpacity <= 0) return null;

  return (
    <group ref={arrowRef}>
      {/* Arrow head */}
      <mesh>
        <coneGeometry args={[0.5, 2, 8]} />
        <meshBasicMaterial 
          color="#00000000" 
          transparent 
          opacity={arrowOpacity}
        />
      </mesh>
      
      {/* Arrow shaft */}
      <mesh position={[0, -1.5, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 2, 8]} />
        <meshBasicMaterial 
          color="#00000000" 
          transparent 
          opacity={arrowOpacity}
        />
      </mesh>
      
      {/* Arrow glow */}
      <mesh>
        <coneGeometry args={[0.8, 2.5, 8]} />
        <meshBasicMaterial 
          color="#00000000" 
          transparent 
          opacity={arrowOpacity * 0.3}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
};

// Connection line from files to journey start
interface ConnectionLineProps {
  scrollProgress: number;
}

const ConnectionLine: React.FC<ConnectionLineProps> = ({ scrollProgress }) => {
  const lineRef = useRef<THREE.Line>(null);

  const connectionGeometry = useMemo(() => {
    const points = [
      new THREE.Vector3(0, 5, -25), // From files area
      new THREE.Vector3(0, 3, -30), // Transition point
      new THREE.Vector3(0, 2, -35)  // To journey start
    ];
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  const connectionMaterial = useMemo(() => {
    return new THREE.LineDashedMaterial({
      color: '#00000000',
      dashSize: 2,
      gapSize: 1,
      linewidth: 2,
      transparent: true,
      opacity: 0.6
    });
  }, []);

  useFrame((state) => {
    if (!lineRef.current) return;

    const time = state.clock.elapsedTime;
    
    // Animate the connection line
    const material = lineRef.current.material as THREE.LineDashedMaterial;
    material.dashSize = 2 + Math.sin(time * 3) * 0.3;
    material.needsUpdate = true;

    // Show connection when starting to move away from files
    const connectionOpacity = Math.max(0, Math.min(0.8, (scrollProgress - 0.3) * 4));
    material.opacity = connectionOpacity;
  });

  return (
    <line 
      ref={lineRef}
      geometry={connectionGeometry} 
      material={connectionMaterial} 
    />
  );
};

export default GraphRAGJourney;