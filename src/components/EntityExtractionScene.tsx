'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

interface EntityExtractionSceneProps {
  scrollProgress: number;
}

const EntityExtractionScene: React.FC<EntityExtractionSceneProps> = ({ scrollProgress }) => {
  const groupRef = useRef<THREE.Group>(null);

  // Entity types with their visual representations
  const entityTypes = useMemo(() => [
    {
      type: 'PERSONAS',
      icon: '👤',
      color: '#3B82F6', // Blue
      count: 8,
      symbol: 'PERSON'
    },
    {
      type: 'PROCESOS', 
      icon: '⚙️',
      color: '#10B981', // Green
      count: 6,
      symbol: 'PROCESS'
    },
    {
      type: 'RELACIONES',
      icon: '🔗', 
      color: '#F59E0B', // Amber
      count: 10,
      symbol: 'RELATION'
    },
    {
      type: 'CONCEPTOS',
      icon: '💡',
      color: '#8B5CF6', // Purple  
      count: 7,
      symbol: 'CONCEPT'
    }
  ], []);

  // Generate entities with positions and animations
  const entities = useMemo(() => {
    const allEntities: { type: string; position: [number, number, number]; size: number; id: number }[] = [];
    
    entityTypes.forEach((type, typeIndex) => {
      for (let i = 0; i < type.count; i++) {
        // Start from center, then spread out to categorized areas
        const angle = (i / type.count) * Math.PI * 2;
        const startRadius = 2 + Math.random() * 3;
        const endRadius = 12 + typeIndex * 4;
        
        // Final positions - categorized by type
        const finalAngle = (typeIndex / entityTypes.length) * Math.PI * 2 + (i / type.count) * Math.PI * 0.5;
        
        allEntities.push({
          id: `${type.type}-${i}`,
          type: type.type,
          icon: type.icon,
          color: type.color,
          symbol: type.symbol,
          // Starting position (near center)
          startPos: new THREE.Vector3(
            Math.cos(angle) * startRadius,
            (Math.random() - 0.5) * 4,
            Math.sin(angle) * startRadius
          ),
          // Final categorized position  
          endPos: new THREE.Vector3(
            Math.cos(finalAngle) * endRadius,
            2 + typeIndex * 2,
            Math.sin(finalAngle) * endRadius
          ),
          delay: i * 0.1 + typeIndex * 0.3
        });
      }
    });
    
    return allEntities;
  }, [entityTypes]);

  useFrame((state) => {
    if (!groupRef.current) return;
    
    const time = state.clock.elapsedTime;
    
    // Calculate animation progress for this section
    const sectionStart = 0.28;
    const sectionEnd = 0.42;
    const localProgress = Math.min(1, Math.max(0, (scrollProgress - sectionStart) / (sectionEnd - sectionStart)));
    
    // Animate each entity
    groupRef.current.children.forEach((child, index) => {
      if (child.userData.entity) {
        const entity = entities[index];
        if (!entity) return;
        
        // Individual animation timing
        const entityProgress = Math.min(1, Math.max(0, (localProgress - entity.delay / 10) / 0.8));
        
        if (entityProgress > 0) {
          // Lerp from start to end position
          const currentPos = new THREE.Vector3().lerpVectors(
            entity.startPos,
            entity.endPos,
            entityProgress
          );
          
          child.position.copy(currentPos);
          
          // Add floating motion
          child.position.y += Math.sin(time * 1.5 + entity.delay) * 0.3;
          
          // Scale animation
          const scale = 0.3 + (entityProgress * 0.7);
          child.scale.setScalar(scale);
          
          // Rotation animation
          child.rotation.y = time * 0.5 + entity.delay;
          
          // Opacity animation
          child.traverse((obj) => {
            if (obj.material) {
              obj.material.opacity = Math.min(1, entityProgress * 1.5);
            }
          });
        }
      }
    });
  });

  // Show only during entity extraction section
  const sectionStart = 0.28;
  const sectionEnd = 0.55;
  if (scrollProgress < sectionStart || scrollProgress > sectionEnd) return null;

  return (
    <group ref={groupRef}>
      {/* Central extraction core */}
      <group position={[0, 0, 0]}>
        <mesh>
          <sphereGeometry args={[2, 16, 16]} />
          <meshBasicMaterial 
            color="#FF6B6B"
            transparent
            opacity={0.3}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        
        {/* Extraction beams */}
        {entityTypes.map((type, index) => {
          const angle = (index / entityTypes.length) * Math.PI * 2;
          const x = Math.cos(angle) * 8;
          const z = Math.sin(angle) * 8;
          
          return (
            <mesh key={type.type} position={[x/2, 0, z/2]} lookAt={[x, 2 + index * 2, z]}>
              <cylinderGeometry args={[0.1, 0.05, 8, 8]} />
              <meshBasicMaterial 
                color={type.color}
                transparent
                opacity={0.6}
              />
            </mesh>
          );
        })}
      </group>

      {/* Entity category labels */}
      {entityTypes.map((type, index) => {
        const angle = (index / entityTypes.length) * Math.PI * 2;
        const radius = 16;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        return (
          <group key={`label-${type.type}`} position={[x, 4 + index * 2, z]}>
            <Text
              text={type.type}
              fontSize={1.5}
              color={type.color}
              anchorX="center"
              anchorY="middle"
            >
              <meshBasicMaterial 
                color={type.color}
                toneMapped={false}
              />
            </Text>
          </group>
        );
      })}

      {/* Individual entities */}
      {entities.map((entity, index) => (
        <group 
          key={entity.id} 
          userData={{ entity: true }}
          position={entity.startPos}
        >
          {/* Entity background */}
          <mesh>
            <sphereGeometry args={[0.8, 8, 8]} />
            <meshBasicMaterial 
              color={entity.color}
              transparent
              opacity={0.7}
            />
          </mesh>
          
          {/* Entity symbol */}
          <Text
            text={entity.symbol}
            fontSize={0.6}
            color="#FFFFFF"
            anchorX="center"
            anchorY="middle"
            position={[0, 0, 0.9]}
          >
            <meshBasicMaterial 
              color="#FFFFFF"
              toneMapped={false}
            />
          </Text>
          
          {/* Glow effect */}
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[1.2, 8, 8]} />
            <meshBasicMaterial 
              color={entity.color}
              transparent
              opacity={0.2}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      ))}

      {/* Static title */}
      <Text
        text="EXTRACCIÓN DE ENTIDADES"
        fontSize={2}
        color="#FF6B6B"
        anchorX="center"
        anchorY="middle"
        position={[0, 8, 0]}
      >
        <meshBasicMaterial 
          color="#FF6B6B"
          toneMapped={false}
        />
      </Text>
    </group>
  );
};

export default EntityExtractionScene;