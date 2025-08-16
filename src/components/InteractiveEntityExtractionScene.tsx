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
        gsap.set(groupRef.current.scale, { x: 4, y: 4, z: 4 }); // AÚN MÁS GRANDE
        gsap.set(groupRef.current.position, { x: 0, y: 0, z: 15 }); // MÁS CERCA
        gsap.set(groupRef.current.rotation, { y: 0 });
      }
    }
  }, [sceneTriggered, sceneVisible]);

  // Animation loop con efecto horizonte
  useFrame((state) => {
    if (!groupRef.current) return;

    const time = state.clock.elapsedTime;
    const sectionStart = 0.40; // Tercera sección uniforme (40-60%)
    const sectionEnd = 0.60;   // Final uniforme de tercera sección
    const localProgress = Math.min(1, Math.max(0, (scrollProgress - sectionStart) / (sectionEnd - sectionStart)));

    // Mantener prominente casi todo el tiempo, solo alejarse al final
    if (sceneVisible && localProgress > 0) {
      const horizonThreshold = 0.95; // Ahora 95% en primer plano
      
      if (localProgress <= horizonThreshold) {
        // Primeros 95%: mantener GRANDE y prominente (casi sin cambios)
        gsap.set(groupRef.current.scale, { 
          x: 4, // Mantener tamaño completo
          y: 4, 
          z: 4 
        });
        gsap.set(groupRef.current.position, { 
          x: 0, 
          y: 0, 
          z: 15 // Mantener cerca
        });
      } else {
        // Últimos 5%: alejamiento rápido hacia el horizonte
        const horizonProgress = (localProgress - horizonThreshold) / (1 - horizonThreshold);
        const easeOut = 1 - Math.pow(1 - horizonProgress, 3);
        
        gsap.set(groupRef.current.scale, { 
          x: 4 - (easeOut * 3.8), // De 4 a 0.2 muy rápido
          y: 4 - (easeOut * 3.8), 
          z: 4 - (easeOut * 3.8) 
        });
        gsap.set(groupRef.current.position, { 
          x: 0, 
          y: easeOut * -8, // Bajar hacia el horizonte
          z: 15 - (easeOut * 68) // Alejarse hacia Z=-53
        });
      }
    }
  });

  // Show during entity extraction section
  const sectionStart = 0.40; // Tercera sección uniforme
  const sectionEnd = 0.60;   // Final uniforme de tercera sección
  if (scrollProgress < sectionStart || scrollProgress > sectionEnd) return null;

  return (
    <group ref={groupRef} scale={sceneVisible ? [1, 1, 1] : [0, 0, 0]}>
      {/* Entity Extraction Visualization */}
      <group position={[0, 0, -50]}>
        
        {/* Central Processing Hub */}
        <mesh>
          <sphereGeometry args={[12, 32, 32]} />
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
                Math.cos((typeIndex / entityTypes.length) * Math.PI * 2) * 35,
                Math.sin((typeIndex / entityTypes.length) * Math.PI * 2) * 20,
                Math.sin((typeIndex / entityTypes.length) * Math.PI * 2) * 12
              ]}
            >
              {/* Hub Core */}
              <mesh>
                <boxGeometry args={[6, 6, 6]} />
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

      </group>

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
        const radius = 12 + (index % 3) * 3; // Órbitas variables más grandes
        
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
          <boxGeometry args={[1.2, 1.2, 1.2]} />
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


export default InteractiveEntityExtractionScene;