'use client';

import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { gsap } from 'gsap';

interface SimpleKnowledgeGraphSceneProps {
  scrollProgress: number;
  sceneTriggered?: boolean;
}

// Configuración de clusters tipo bird flocks - MÁS CERCA Y MÁS GRANDES
const clusterConfigs = [
  {
    id: 'purple',
    color: '#8B5CF6', // Morado
    position: new THREE.Vector3(-4, 2, 0),
    count: 35,
    label: 'DATOS'
  },
  {
    id: 'blue', 
    color: '#3B82F6', // Azul
    position: new THREE.Vector3(4, 2, 0),
    count: 35,
    label: 'PROCESOS'
  },
  {
    id: 'yellow',
    color: '#F59E0B', // Amarillo
    position: new THREE.Vector3(0, 4, 0),
    count: 35,
    label: 'PERSONAS'
  },
  {
    id: 'orange',
    color: '#F97316', // Naranja
    position: new THREE.Vector3(-4, -4, 0),
    count: 35,
    label: 'PRODUCTOS'
  },
  {
    id: 'red',
    color: '#EF4444', // Rojo
    position: new THREE.Vector3(4, -4, 0),
    count: 35,
    label: 'CLIENTES'
  }
];


const SimpleKnowledgeGraphScene: React.FC<SimpleKnowledgeGraphSceneProps> = ({ 
  scrollProgress,
  sceneTriggered = false
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [sceneVisible, setSceneVisible] = useState(false);

  // Activar la escena cuando se triggered
  useEffect(() => {
    if (sceneTriggered && !sceneVisible) {
      setSceneVisible(true);

      if (groupRef.current) {
        gsap.set(groupRef.current.scale, { x: 8, y: 8, z: 8 });
        gsap.set(groupRef.current.position, { x: 0, y: 0, z: -10 });
      }
    }
  }, [sceneTriggered, sceneVisible]);

  // Mantener posición estable del grupo
  useFrame(() => {
    if (!groupRef.current || !sceneVisible) return;
    
    groupRef.current.scale.set(8, 8, 8);
    groupRef.current.position.set(0, 0, -10);
  });

  // Mostrar durante la sección del grafo de conocimiento
  const sectionStart = 0.60;
  const sectionEnd = 0.95;
  if (scrollProgress < sectionStart || scrollProgress > sectionEnd) return null;
  if (!sceneVisible) return null;

  return (
    <group ref={groupRef}>
      {/* Clusters estáticos de cuadraditos */}
      <StaticClusters />
      
      {/* Título principal */}
      <Text
        text="CLUSTERS DE CONOCIMIENTO"
        fontSize={1.2}
        color="#FFFFFF"
        anchorX="center"
        anchorY="middle"
        position={[0, 8, 0]}
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        <meshBasicMaterial 
          color="#FFFFFF" 
          transparent={false}
          toneMapped={false}
        />
      </Text>
    </group>
  );
};

// Componente de clusters con flotación suave
const StaticClusters: React.FC = () => {
  return (
    <group>
      {clusterConfigs.map((config, configIndex) => (
        <group key={config.id}>
          {/* Etiqueta del cluster */}
          <Text
            text={config.label}
            fontSize={1.5}
            color={config.color}
            anchorX="center"
            anchorY="middle"
            position={[
              config.position.x, 
              config.position.y + 2, 
              config.position.z
            ]}
            outlineWidth={0.05}
            outlineColor="#000000"
          >
            <meshBasicMaterial 
              color={config.color}
              transparent={false}
              toneMapped={false}
            />
          </Text>
          
          {/* Cuadraditos flotando alrededor de la palabra */}
          {Array.from({ length: 15 }, (_, i) => {
            const angle = (i / 15) * Math.PI * 2;
            const radius = 1.5 + (i % 3) * 0.5;
            const baseX = config.position.x + Math.cos(angle) * radius;
            const baseY = config.position.y + Math.sin(angle) * radius * 0.5;
            const baseZ = config.position.z + Math.sin(angle) * radius * 0.3;
            
            return (
              <FloatingCube
                key={`cube-${configIndex}-${i}`}
                position={[baseX, baseY, baseZ]}
                color={config.color}
                delay={i * 0.1 + configIndex * 0.3}
              />
            );
          })}
        </group>
      ))}
    </group>
  );
};

// Componente individual para cuadradito flotante
const FloatingCube: React.FC<{
  position: [number, number, number];
  color: string;
  delay: number;
}> = ({ position, color, delay }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    
    const time = state.clock.elapsedTime;
    
    // Flotación suave en Y (arriba y abajo)
    const floatY = Math.sin(time * 2 + delay) * 0.3;
    
    // Pequeña rotación sutil
    const rotationY = Math.sin(time * 1.5 + delay) * 0.2;
    
    // Aplicar transformaciones
    meshRef.current.position.set(
      position[0],
      position[1] + floatY,
      position[2]
    );
    
    meshRef.current.rotation.y = rotationY;
    meshRef.current.rotation.x = Math.sin(time * 1.8 + delay) * 0.1;
  });

  return (
    <mesh ref={meshRef} position={position}>
      <boxGeometry args={[0.2, 0.2, 0.2]} />
      <meshBasicMaterial 
        color={color}
        transparent={false}
        toneMapped={false}
      />
    </mesh>
  );
};

export default SimpleKnowledgeGraphScene;