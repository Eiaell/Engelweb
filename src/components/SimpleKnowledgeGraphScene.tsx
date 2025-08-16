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

// Componente de clusters con movimientos únicos por cluster
const StaticClusters: React.FC = () => {
  return (
    <group>
      {clusterConfigs.map((config, configIndex) => (
        <FloatingCluster
          key={config.id}
          config={config}
          clusterIndex={configIndex}
        />
      ))}
    </group>
  );
};

// Componente para cluster completo con movimiento único
const FloatingCluster: React.FC<{
  config: typeof clusterConfigs[0];
  clusterIndex: number;
}> = ({ config, clusterIndex }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    
    const time = state.clock.elapsedTime;
    
    // Cada cluster tiene un tipo de movimiento diferente
    switch (clusterIndex) {
      case 0: // DATOS (morado) - Flotación vertical suave
        groupRef.current.position.set(
          config.position.x,
          config.position.y + Math.sin(time * 1.5) * 0.4,
          config.position.z
        );
        groupRef.current.rotation.y = Math.sin(time * 0.8) * 0.1;
        break;
        
      case 1: // PROCESOS (azul) - Movimiento circular horizontal pequeño
        const circleRadius = 0.15; // Reducido para mantenerse visible
        groupRef.current.position.set(
          config.position.x + Math.cos(time * 2) * circleRadius,
          config.position.y,
          config.position.z + Math.sin(time * 2) * circleRadius
        );
        // Sin rotación para mantener texto siempre visible
        break;
        
      case 2: // PERSONAS (amarillo) - Balanceo lado a lado suave
        groupRef.current.position.set(
          config.position.x + Math.sin(time * 1.8) * 0.3, // Reducido para mantenerse visible
          config.position.y,
          config.position.z
        );
        groupRef.current.rotation.z = Math.sin(time * 1.8) * 0.1; // Inclinación más sutil
        break;
        
      case 3: // PRODUCTOS (naranja) - Pulsación (escala)
        const pulseScale = 1 + Math.sin(time * 2.5) * 0.1;
        groupRef.current.scale.set(pulseScale, pulseScale, pulseScale);
        groupRef.current.position.set(
          config.position.x,
          config.position.y + Math.sin(time * 3) * 0.2,
          config.position.z
        );
        break;
        
      case 4: // CLIENTES (rojo) - Figura de 8 pequeña
        const t = time * 1.2;
        const figure8X = Math.sin(t) * 0.2; // Reducido para mantenerse visible
        const figure8Y = Math.sin(t * 2) * 0.15; // Reducido para mantenerse visible
        groupRef.current.position.set(
          config.position.x + figure8X,
          config.position.y + figure8Y,
          config.position.z
        );
        // Rotación fija para mejor visibilidad hacia la cámara
        groupRef.current.rotation.y = 0.3; // Rotación constante para orientarse hacia la cámara
        break;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Etiqueta del cluster */}
      <Text
        text={config.label}
        fontSize={1.5}
        color={config.color}
        anchorX="center"
        anchorY="middle"
        position={[0, 2, 0]}
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        <meshBasicMaterial 
          color={config.color}
          transparent={false}
          toneMapped={false}
        />
      </Text>
      
      {/* Cuadraditos estáticos dentro del cluster */}
      {Array.from({ length: 15 }, (_, i) => {
        const angle = (i / 15) * Math.PI * 2;
        const radius = 1.5 + (i % 3) * 0.5;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius * 0.5;
        const z = Math.sin(angle) * radius * 0.3;
        
        return (
          <mesh 
            key={`cube-${i}`}
            position={[x, y, z]}
          >
            <boxGeometry args={[0.2, 0.2, 0.2]} />
            <meshBasicMaterial 
              color={config.color}
              transparent={false}
              toneMapped={false}
            />
          </mesh>
        );
      })}
    </group>
  );
};


export default SimpleKnowledgeGraphScene;