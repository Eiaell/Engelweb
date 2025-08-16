'use client';

import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { gsap } from 'gsap';

interface InteractiveVectorizationSceneProps {
  scrollProgress: number;
  sceneTriggered?: boolean;
}

// Document types with strong colors
const documentTypes = [
  {
    type: 'word' as const,
    color: '#0066CC',  // Azul fuerte (Word)
    label: 'WORD',
  },
  {
    type: 'pdf' as const,
    color: '#DC143C',  // Rojo fuerte (PDF)
    label: 'PDF',
  },
  {
    type: 'excel' as const,
    color: '#008000',  // Verde fuerte (Excel)
    label: 'EXCEL',
  },
  {
    type: 'pim' as const,
    color: '#8B008B',  // Púrpura fuerte (PIM)
    label: 'PIM',
  },
  {
    type: 'dam' as const,
    color: '#FF8C00',  // Naranja fuerte (DAM)
    label: 'DAM',
  }
] as const;

const InteractiveVectorizationScene: React.FC<InteractiveVectorizationSceneProps> = ({ 
  scrollProgress,
  sceneTriggered = false
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const databaseRef = useRef<THREE.Mesh>(null);
  const [sceneVisible, setSceneVisible] = useState(false);

  // Activar la escena 3D cuando el título haya pasado la línea media
  useEffect(() => {
    if (sceneTriggered && !sceneVisible) {
      setSceneVisible(true);
      if (groupRef.current) {
        gsap.set(groupRef.current.scale, { x: 2, y: 2, z: 2 });
        gsap.set(groupRef.current.position, { x: 0, y: 0, z: 5 });
        gsap.set(groupRef.current.rotation, { y: 0 });
      }
    }
  }, [sceneTriggered, sceneVisible]);

  // Animation loop
  useFrame((state) => {
    if (!groupRef.current) return;

    const time = state.clock.elapsedTime;
    const sectionStart = 0.18;
    const sectionEnd = 0.40;
    const localProgress = Math.min(1, Math.max(0, (scrollProgress - sectionStart) / (sectionEnd - sectionStart)));

    // Efecto horizonte: 80% en primer plano, 20% alejándose
    if (sceneVisible && localProgress > 0) {
      const horizonThreshold = 0.8;
      
      if (localProgress <= horizonThreshold) {
        const stayProgress = localProgress / horizonThreshold;
        gsap.set(groupRef.current.scale, { 
          x: 2 - (stayProgress * 0.3),
          y: 2 - (stayProgress * 0.3), 
          z: 2 - (stayProgress * 0.3) 
        });
        gsap.set(groupRef.current.position, { 
          x: 0, 
          y: 0, 
          z: 5 - (stayProgress * 2)
        });
      } else {
        const horizonProgress = (localProgress - horizonThreshold) / (1 - horizonThreshold);
        const easeOut = 1 - Math.pow(1 - horizonProgress, 3);
        
        gsap.set(groupRef.current.scale, { 
          x: 1.7 - (easeOut * 1.5),
          y: 1.7 - (easeOut * 1.5), 
          z: 1.7 - (easeOut * 1.5) 
        });
        gsap.set(groupRef.current.position, { 
          x: 0, 
          y: easeOut * -5,
          z: 3 - (easeOut * 50)
        });
      }
    }

    // Database estático
    if (databaseRef.current) {
      databaseRef.current.scale.setScalar(1);
      databaseRef.current.rotation.x = 0;
      databaseRef.current.rotation.y = 0;
      databaseRef.current.rotation.z = 0;
    }
  });

  // Show during vectorization section
  const sectionStart = 0.18;
  const sectionEnd = 0.40;
  if (scrollProgress < sectionStart || scrollProgress > sectionEnd) return null;

  return (
    <group ref={groupRef} scale={sceneVisible ? [1, 1, 1] : [0, 0, 0]}>
      {/* Vector Database */}
      <group position={[0, 0, -45]}>
        {/* Main database core - cubo sólido como dado */}
        <mesh
          ref={databaseRef}
          name="vector-database"
        >
          <boxGeometry args={[30, 30, 30]} />
          <meshBasicMaterial
            color="#FF6B35"
            transparent={false}
            opacity={1.0}
            wireframe={false}
          />
        </mesh>
        
        {/* Textos del cubo - todos visibles desde el frente */}
        <Text
          text="TOKENIZE"
          fontSize={1.5}
          color="#FFFFFF"
          anchorX="center"
          anchorY="middle"
          position={[-8, 8, 18]}
        >
          <meshBasicMaterial color="#FFFFFF" toneMapped={false} />
        </Text>
        
        <Text
          text="EMBED"
          fontSize={1.5}
          color="#FFFFFF"
          anchorX="center"
          anchorY="middle"
          position={[8, 8, 18]}
        >
          <meshBasicMaterial color="#FFFFFF" toneMapped={false} />
        </Text>
        
        <Text
          text="INDEX"
          fontSize={1.5}
          color="#FFFFFF"
          anchorX="center"
          anchorY="middle"
          position={[-8, -8, 18]}
        >
          <meshBasicMaterial color="#FFFFFF" toneMapped={false} />
        </Text>
        
        <Text
          text="STORE"
          fontSize={1.5}
          color="#FFFFFF"
          anchorX="center"
          anchorY="middle"
          position={[8, -8, 18]}
        >
          <meshBasicMaterial color="#FFFFFF" toneMapped={false} />
        </Text>
        
        <Text
          text="VECTOR DB"
          fontSize={4}
          color="#FFFFFF"
          anchorX="center"
          anchorY="middle"
          position={[0, 3, 18]}
        >
          <meshBasicMaterial color="#FFFFFF" toneMapped={false} />
        </Text>
        
        {/* Candado debajo de VECTOR DB */}
        <Text
          text="🔒"
          fontSize={6}
          anchorX="center"
          anchorY="middle"
          position={[0, -5, 18]}
        >
          <meshBasicMaterial toneMapped={false} />
        </Text>

        {/* Documentos orbitando alrededor del cubo central */}
        <OrbitingDocuments documentTypes={documentTypes} />
      </group>

      {/* Scene title - movido lejos del cubo */}
      <Text
        text="FRAGMENTACIÓN Y VECTORIZACIÓN"
        fontSize={2.5}
        color="#00FFFF"
        anchorX="center"
        anchorY="middle"
        position={[0, 35, -25]}
      >
        <meshBasicMaterial color="#00FFFF" toneMapped={false} />
      </Text>
    </group>
  );
};

// Componente separado para los documentos orbitando
interface OrbitingDocumentsProps {
  documentTypes: typeof documentTypes;
}

const OrbitingDocuments: React.FC<OrbitingDocumentsProps> = ({ documentTypes }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (!groupRef.current) return;
    
    const time = state.clock.elapsedTime;
    
    // Actualizar las órbitas en cada frame
    groupRef.current.children.forEach((typeGroup, typeIndex) => {
      if (typeGroup.type === 'Group') {
        typeGroup.children.forEach((docGroup, docIndex) => {
          if (docGroup.type === 'Group') {
            const baseAngle = (docIndex / 8) * Math.PI * 2 + typeIndex * 0.8;
            const radius = 35 + typeIndex * 6;
            const orbitSpeed = 0.3 + typeIndex * 0.15;
            const currentAngle = baseAngle + time * orbitSpeed;
            
            docGroup.position.x = Math.cos(currentAngle) * radius;
            docGroup.position.z = Math.sin(currentAngle) * radius;
            docGroup.position.y = Math.sin(time * 1.5 + docIndex) * 2;
            docGroup.rotation.y = time * 0.4;
          }
        });
      }
    });
  });
  
  return (
    <group ref={groupRef}>
      {documentTypes.map((docType, index) => (
        <group key={docType.type}>
          {Array.from({ length: 8 }, (_, i) => (
            <group key={i}>
              {/* Documento como rectángulo */}
              <mesh>
                <boxGeometry args={[2, 3, 0.2]} />
                <meshBasicMaterial
                  color={docType.color}
                  transparent={false}
                />
              </mesh>
              
              {/* Etiqueta del documento */}
              <Text
                text={docType.label}
                fontSize={0.6}
                color="#FFFFFF"
                anchorX="center"
                anchorY="middle"
                position={[0, 0, 0.2]}
              >
                <meshBasicMaterial color="#FFFFFF" toneMapped={false} />
              </Text>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
};

export default InteractiveVectorizationScene;