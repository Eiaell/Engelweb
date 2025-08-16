'use client';

import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { gsap } from 'gsap';

interface InteractiveEntityExtractionSceneProps {
  scrollProgress: number;
  sceneTriggered?: boolean;
}

// Entity types for extraction
const entityTypes = [
  {
    type: 'PERSONAS' as const,
    icon: '👤',
    color: '#3B82F6', // Azul
    label: 'PERSONAS',
    count: 12
  },
  {
    type: 'PROCESOS' as const,
    icon: '⚙️', 
    color: '#10B981', // Verde
    label: 'PROCESOS',
    count: 8
  },
  {
    type: 'RELACIONES' as const,
    icon: '🔗',
    color: '#F59E0B', // Amarillo/Naranja
    label: 'RELACIONES', 
    count: 15
  },
  {
    type: 'CONCEPTOS' as const,
    icon: '💡',
    color: '#8B5CF6', // Púrpura
    label: 'CONCEPTOS',
    count: 22
  }
] as const;

const InteractiveEntityExtractionScene: React.FC<InteractiveEntityExtractionSceneProps> = ({ 
  scrollProgress,
  sceneTriggered = false
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [sceneVisible, setSceneVisible] = useState(false);

  // Activar la escena 3D cuando el título haya pasado la línea media
  useEffect(() => {
    if (sceneTriggered && !sceneVisible) {
      setSceneVisible(true);
      if (groupRef.current) {
        gsap.set(groupRef.current.scale, { x: 3, y: 3, z: 3 }); // MÁS GRANDE que vectorización
        gsap.set(groupRef.current.position, { x: 0, y: 0, z: 10 }); // MÁS CERCA
        gsap.set(groupRef.current.rotation, { y: 0 });
      }
    }
  }, [sceneTriggered, sceneVisible]);

  // Animation loop con efecto horizonte
  useFrame((state) => {
    if (!groupRef.current) return;

    const time = state.clock.elapsedTime;
    const sectionStart = 0.35; // Tercera sección
    const sectionEnd = 0.55;   // Hasta cuarta sección
    const localProgress = Math.min(1, Math.max(0, (scrollProgress - sectionStart) / (sectionEnd - sectionStart)));

    // Efecto horizonte: 80% en primer plano, 20% alejándose
    if (sceneVisible && localProgress > 0) {
      const horizonThreshold = 0.8;
      
      if (localProgress <= horizonThreshold) {
        // Primeros 80%: mantener GRANDE en primer plano
        const stayProgress = localProgress / horizonThreshold;
        gsap.set(groupRef.current.scale, { 
          x: 3 - (stayProgress * 0.5), // De 3 a 2.5 (sigue siendo grande)
          y: 3 - (stayProgress * 0.5), 
          z: 3 - (stayProgress * 0.5) 
        });
        gsap.set(groupRef.current.position, { 
          x: 0, 
          y: 0, 
          z: 10 - (stayProgress * 3) // De Z=10 a Z=7
        });
      } else {
        // Últimos 20%: alejamiento rápido hacia el horizonte
        const horizonProgress = (localProgress - horizonThreshold) / (1 - horizonThreshold);
        const easeOut = 1 - Math.pow(1 - horizonProgress, 3);
        
        gsap.set(groupRef.current.scale, { 
          x: 2.5 - (easeOut * 2.3), // De 2.5 a 0.2
          y: 2.5 - (easeOut * 2.3), 
          z: 2.5 - (easeOut * 2.3) 
        });
        gsap.set(groupRef.current.position, { 
          x: 0, 
          y: easeOut * -8, // Bajar hacia el horizonte
          z: 7 - (easeOut * 60) // Alejarse hacia Z=-53
        });
      }
    }
  });

  // Show during entity extraction section
  const sectionStart = 0.35;
  const sectionEnd = 0.55;
  if (scrollProgress < sectionStart || scrollProgress > sectionEnd) return null;

  return (
    <group ref={groupRef} scale={sceneVisible ? [1, 1, 1] : [0, 0, 0]}>
      {/* Entity Extraction Visualization */}
      <group position={[0, 0, -50]}>
        
        {/* Central Processing Hub */}
        <mesh>
          <sphereGeometry args={[8, 32, 32]} />
          <meshBasicMaterial
            color="#4F46E5"
            transparent
            opacity={0.3}
            wireframe={true}
          />
        </mesh>

        {/* Entity Type Clusters */}
        {entityTypes.map((entityType, typeIndex) => (
          <group key={entityType.type}>
            {/* Cluster Hub */}
            <group 
              position={[
                Math.cos((typeIndex / entityTypes.length) * Math.PI * 2) * 25,
                Math.sin((typeIndex / entityTypes.length) * Math.PI * 2) * 15,
                Math.sin((typeIndex / entityTypes.length) * Math.PI * 2) * 8
              ]}
            >
              {/* Hub Core */}
              <mesh>
                <boxGeometry args={[4, 4, 4]} />
                <meshBasicMaterial
                  color={entityType.color}
                  transparent={false}
                />
              </mesh>

              {/* Hub Label */}
              <Text
                text={entityType.label}
                fontSize={2}
                color="#FFFFFF"
                anchorX="center"
                anchorY="middle"
                position={[0, 6, 0]}
              >
                <meshBasicMaterial color="#FFFFFF" toneMapped={false} />
              </Text>

              {/* Count Display */}
              <Text
                text={`${entityType.count}`}
                fontSize={1.5}
                color={entityType.color}
                anchorX="center"
                anchorY="middle"
                position={[0, -6, 0]}
              >
                <meshBasicMaterial color={entityType.color} toneMapped={false} />
              </Text>

              {/* Entity Particles orbiting the hub */}
              <OrbitingEntities 
                entityType={entityType} 
                count={entityType.count}
                hubIndex={typeIndex}
              />
            </group>
          </group>
        ))}

        {/* Connection Lines between clusters */}
        <ConnectionLines entityTypes={entityTypes} />
      </group>

      {/* Scene title */}
      <Text
        text="EXTRACCIÓN DE ENTIDADES"
        fontSize={3}
        color="#4F46E5"
        anchorX="center"
        anchorY="middle"
        position={[0, 25, -40]}
      >
        <meshBasicMaterial color="#4F46E5" toneMapped={false} />
      </Text>
    </group>
  );
};

// Componente para entidades orbitando cada hub
interface OrbitingEntitiesProps {
  entityType: typeof entityTypes[0];
  count: number;
  hubIndex: number;
}

const OrbitingEntities: React.FC<OrbitingEntitiesProps> = ({ entityType, count, hubIndex }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (!groupRef.current) return;
    
    const time = state.clock.elapsedTime;
    const baseSpeed = 0.5 + hubIndex * 0.1;
    
    groupRef.current.children.forEach((entity, index) => {
      if (entity.type === 'Mesh') {
        const angle = (index / count) * Math.PI * 2 + time * baseSpeed;
        const radius = 8 + (index % 3) * 2; // Órbitas variables
        
        entity.position.x = Math.cos(angle) * radius;
        entity.position.z = Math.sin(angle) * radius;
        entity.position.y = Math.sin(time * 2 + index) * 1;
        
        entity.rotation.x = time * 0.5;
        entity.rotation.y = time * 0.3;
      }
    });
  });
  
  return (
    <group ref={groupRef}>
      {Array.from({ length: Math.min(count, 8) }, (_, i) => ( // Limitar para performance
        <mesh key={i}>
          <boxGeometry args={[0.8, 0.8, 0.8]} />
          <meshBasicMaterial
            color={entityType.color}
            transparent
            opacity={0.8}
          />
        </mesh>
      ))}
    </group>
  );
};

// Componente para líneas de conexión entre clusters
interface ConnectionLinesProps {
  entityTypes: typeof entityTypes;
}

const ConnectionLines: React.FC<ConnectionLinesProps> = ({ entityTypes }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (!groupRef.current) return;
    
    const time = state.clock.elapsedTime;
    
    // Animar las conexiones
    groupRef.current.children.forEach((line, index) => {
      if (line.material) {
        line.material.opacity = 0.3 + Math.sin(time * 2 + index) * 0.2;
      }
    });
  });
  
  return (
    <group ref={groupRef}>
      {entityTypes.map((_, fromIndex) => 
        entityTypes.map((_, toIndex) => {
          if (fromIndex >= toIndex) return null;
          
          const fromPos = new THREE.Vector3(
            Math.cos((fromIndex / entityTypes.length) * Math.PI * 2) * 25,
            Math.sin((fromIndex / entityTypes.length) * Math.PI * 2) * 15,
            Math.sin((fromIndex / entityTypes.length) * Math.PI * 2) * 8
          );
          
          const toPos = new THREE.Vector3(
            Math.cos((toIndex / entityTypes.length) * Math.PI * 2) * 25,
            Math.sin((toIndex / entityTypes.length) * Math.PI * 2) * 15,
            Math.sin((toIndex / entityTypes.length) * Math.PI * 2) * 8
          );
          
          const points = [fromPos, toPos];
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          
          return (
            <line key={`${fromIndex}-${toIndex}`} geometry={geometry}>
              <lineBasicMaterial 
                color="#666666" 
                transparent 
                opacity={0.4} 
              />
            </line>
          );
        })
      )}
    </group>
  );
};

export default InteractiveEntityExtractionScene;