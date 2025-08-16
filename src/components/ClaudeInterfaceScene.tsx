'use client';

import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { gsap } from 'gsap';

interface ClaudeInterfaceSceneProps {
  scrollProgress: number;
  sceneTriggered?: boolean;
}

const ClaudeInterfaceScene: React.FC<ClaudeInterfaceSceneProps> = ({ 
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
        gsap.set(groupRef.current.scale, { x: 25, y: 25, z: 25 }); // GIGANTE
        gsap.set(groupRef.current.position, { x: 0, y: 0, z: -10 }); // MUY CERCA
      }
    }
  }, [sceneTriggered, sceneVisible]);

  // Mantener posición estable del grupo
  useFrame(() => {
    if (!groupRef.current || !sceneVisible) return;
    
    groupRef.current.scale.set(25, 25, 25);
    groupRef.current.position.set(0, 0, -10);
  });

  // Mostrar durante la sección final - aparece solo al 98%
  const sectionStart = 0.98;
  const sectionEnd = 1.00;
  if (scrollProgress < sectionStart || scrollProgress > sectionEnd) return null;
  if (!sceneVisible) return null;

  // La firma solo aparece al final del scroll (99%+)
  const showSignature = scrollProgress >= 0.99;

  return (
    <group ref={groupRef}>
      {/* Interfaz súper simple y gigante */}
      <SimpleGiantInterface showSignature={showSignature} />
    </group>
  );
};

// Interfaz súper simple y gigante
const SimpleGiantInterface: React.FC<{ showSignature: boolean }> = ({ showSignature }) => {
  const interfaceRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!interfaceRef.current) return;
    
    const time = state.clock.elapsedTime;
    
    // Sutil animación de flotación
    interfaceRef.current.position.y = Math.sin(time * 0.5) * 0.1;
  });

  return (
    <group ref={interfaceRef}>
      {/* Fondo simple - pantalla gigante */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[15, 10, 0.5]} />
        <meshBasicMaterial 
          color="#2D3748"
          transparent={false}
          toneMapped={false}
        />
      </mesh>

      {/* Título principal */}
      <Text
        text="Bienvenido"
        fontSize={2.5}
        color="#FFFFFF"
        anchorX="center"
        anchorY="middle"
        position={[0, 2, 0.3]}
        outlineWidth={0.1}
        outlineColor="#000000"
      >
        <meshBasicMaterial 
          color="#FFFFFF" 
          transparent={false}
          toneMapped={false}
        />
      </Text>

      {/* Subtítulo simple */}
      <Text
        text="Soy tu asistente"
        fontSize={1.5}
        color="#4FACFE"
        anchorX="center"
        anchorY="middle"
        position={[0, 0, 0.3]}
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        <meshBasicMaterial 
          color="#4FACFE" 
          transparent={false}
          toneMapped={false}
        />
      </Text>

      {/* Barra de entrada visual */}
      <mesh position={[0, -2, 0.3]}>
        <boxGeometry args={[12, 1, 0.1]} />
        <meshBasicMaterial 
          color="#1A202C"
          transparent={false}
          toneMapped={false}
        />
      </mesh>

      {/* Placeholder texto */}
      <Text
        text="Escribe tu pregunta aquí..."
        fontSize={0.6}
        color="#666666"
        anchorX="left"
        anchorY="middle"
        position={[-5.5, -2, 0.4]}
      >
        <meshBasicMaterial 
          color="#666666" 
          transparent={false}
          toneMapped={false}
        />
      </Text>

      {/* Botón enviar */}
      <mesh position={[5, -2, 0.4]}>
        <boxGeometry args={[1.5, 0.8, 0.1]} />
        <meshBasicMaterial 
          color="#4FACFE"
          transparent={false}
          toneMapped={false}
        />
      </mesh>

      <Text
        text="→"
        fontSize={0.8}
        color="#FFFFFF"
        anchorX="center"
        anchorY="middle"
        position={[5, -2, 0.5]}
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

// Componente para la firma fosforescente que aparece solo al final
const PhosphorescentSignature: React.FC = () => {
  const signatureRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!signatureRef.current) return;
    
    const time = state.clock.elapsedTime;
    
    // Efecto fosforescente pulsante
    const intensity = 0.7 + Math.sin(time * 3) * 0.3;
    signatureRef.current.children.forEach((child) => {
      if (child.type === 'Mesh') {
        const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
        material.opacity = intensity;
      }
    });
  });

  return (
    <group ref={signatureRef}>
      {/* Firma abajo a la izquierda */}
      <Text
        text="@E. Huber"
        fontSize={0.8}
        color="#00FF88"
        anchorX="left"
        anchorY="bottom"
        position={[-7, -4.5, 0.6]}
        outlineWidth={0.02}
        outlineColor="#004400"
      >
        <meshBasicMaterial 
          color="#00FF88"
          transparent={true}
          opacity={0.8}
          toneMapped={false}
        />
      </Text>
      
      {/* Efecto glow fosforescente */}
      <mesh position={[-5.5, -4.3, 0.5]}>
        <planeGeometry args={[3, 0.6]} />
        <meshBasicMaterial 
          color="#00FF88"
          transparent={true}
          opacity={0.1}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
};

export default ClaudeInterfaceScene;