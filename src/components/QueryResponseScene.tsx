'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

interface QueryResponseSceneProps {
  scrollProgress: number;
}

const QueryResponseScene: React.FC<QueryResponseSceneProps> = ({ scrollProgress }) => {
  const groupRef = useRef<THREE.Group>(null);
  const queryOrbRef = useRef<THREE.Mesh>(null);

  // Query path through the knowledge network
  const queryPath = useMemo(() => [
    new THREE.Vector3(-15, 5, 0),    // Query entry point
    new THREE.Vector3(-8, 3, -5),    // First knowledge node
    new THREE.Vector3(-2, -1, 8),    // Entity connection
    new THREE.Vector3(5, 4, -3),     // Process node
    new THREE.Vector3(8, -2, 6),     // Relationship hub
    new THREE.Vector3(12, 1, -4),    // Core knowledge
    new THREE.Vector3(15, -3, 0),    // Answer assembly point
  ], []);

  // Evidence nodes that light up during query processing
  const evidenceNodes = useMemo(() => [
    { 
      position: new THREE.Vector3(-8, 3, -5), 
      type: 'SOURCE', 
      color: '#4ECDC4',
      content: 'DOC_REF_1'
    },
    { 
      position: new THREE.Vector3(-2, -1, 8), 
      type: 'ENTITY', 
      color: '#45B7D1',
      content: 'PERSON_X'
    },
    { 
      position: new THREE.Vector3(5, 4, -3), 
      type: 'PROCESS', 
      color: '#F9CA24',
      content: 'WORKFLOW_Y'
    },
    { 
      position: new THREE.Vector3(8, -2, 6), 
      type: 'RELATION', 
      color: '#FF6B6B',
      content: 'CONNECTS_TO'
    },
    { 
      position: new THREE.Vector3(12, 1, -4), 
      type: 'INSIGHT', 
      color: '#A855F7',
      content: 'CONCLUSION'
    }
  ], []);

  // Answer components that get assembled
  const answerComponents = useMemo(() => [
    { text: 'BASED ON', position: new THREE.Vector3(18, 2, 0), color: '#64FFDA' },
    { text: 'DOCUMENT', position: new THREE.Vector3(20, 1, 0), color: '#4ECDC4' },
    { text: 'ANALYSIS', position: new THREE.Vector3(22, 0, 0), color: '#45B7D1' },
    { text: 'RESULT:', position: new THREE.Vector3(24, -1, 0), color: '#F9CA24' },
    { text: 'PRECISE', position: new THREE.Vector3(26, -2, 0), color: '#FF6B6B' },
    { text: 'ANSWER', position: new THREE.Vector3(28, -3, 0), color: '#A855F7' }
  ], []);

  useFrame((state) => {
    if (!groupRef.current) return;
    
    const time = state.clock.elapsedTime;
    
    // Calculate animation progress
    const sectionStart = 0.55;
    const sectionEnd = 0.85;
    const localProgress = Math.min(1, Math.max(0, (scrollProgress - sectionStart) / (sectionEnd - sectionStart)));
    
    // Query orb movement along path
    if (queryOrbRef.current && localProgress > 0) {
      const pathProgress = localProgress * (queryPath.length - 1);
      const currentSegment = Math.floor(pathProgress);
      const segmentProgress = pathProgress - currentSegment;
      
      if (currentSegment < queryPath.length - 1) {
        const currentPos = new THREE.Vector3().lerpVectors(
          queryPath[currentSegment],
          queryPath[currentSegment + 1],
          segmentProgress
        );
        queryOrbRef.current.position.copy(currentPos);
        
        // Add floating motion
        queryOrbRef.current.position.y += Math.sin(time * 4) * 0.2;
        
        // Pulsing size based on activity
        const pulseScale = 1 + Math.sin(time * 6) * 0.3;
        queryOrbRef.current.scale.setScalar(pulseScale);
      }
    }
    
    // Animate evidence nodes lighting up
    groupRef.current.children.forEach((child, index) => {
      if (child.userData.isEvidence) {
        const evidenceIndex = child.userData.evidenceIndex;
        const activationTime = (evidenceIndex + 1) / evidenceNodes.length;
        const isActive = localProgress > activationTime;
        
        if (isActive) {
          const intensity = 0.8 + Math.sin(time * 3 + evidenceIndex) * 0.4;
          child.traverse((obj) => {
            if (obj.material) {
              obj.material.opacity = intensity;
            }
          });
          
          // Pulsing scale
          const scale = 1 + Math.sin(time * 2 + evidenceIndex) * 0.2;
          child.scale.setScalar(scale);
        } else {
          child.scale.setScalar(0.1);
        }
      }
      
      if (child.userData.isAnswerComponent) {
        const componentIndex = child.userData.componentIndex;
        const appearTime = 0.6 + (componentIndex * 0.05);
        const componentProgress = Math.min(1, Math.max(0, (localProgress - appearTime) / 0.3));
        
        if (componentProgress > 0) {
          child.scale.setScalar(componentProgress);
          child.traverse((obj) => {
            if (obj.material) {
              obj.material.opacity = componentProgress;
            }
          });
          
          // Gentle floating
          child.position.y += Math.sin(time * 1.5 + componentIndex) * 0.1;
        }
      }
    });
  });

  // Show only during query response section
  const sectionStart = 0.55;
  const sectionEnd = 0.85;
  if (scrollProgress < sectionStart || scrollProgress > sectionEnd) return null;

  return (
    <group ref={groupRef}>
      {/* Query orb traveling through the graph */}
      <mesh ref={queryOrbRef} position={queryPath[0]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial 
          color="#00FFFF"
          transparent
          opacity={0.8}
        />
      </mesh>
      
      {/* Query orb glow */}
      <mesh ref={(ref) => {
        if (ref && queryOrbRef.current) {
          ref.position.copy(queryOrbRef.current.position);
        }
      }}>
        <sphereGeometry args={[1.5, 12, 12]} />
        <meshBasicMaterial 
          color="#00FFFF"
          transparent
          opacity={0.2}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Query path visualization */}
      {queryPath.slice(0, -1).map((point, index) => {
        const nextPoint = queryPath[index + 1];
        const midpoint = new THREE.Vector3().addVectors(point, nextPoint).multiplyScalar(0.5);
        const direction = new THREE.Vector3().subVectors(nextPoint, point);
        const distance = direction.length();
        
        return (
          <mesh key={`path-${index}`} position={midpoint} lookAt={nextPoint}>
            <cylinderGeometry args={[0.05, 0.05, distance, 8]} />
            <meshBasicMaterial 
              color="#00FFFF"
              transparent
              opacity={0.3}
            />
          </mesh>
        );
      })}

      {/* Evidence nodes that get activated */}
      {evidenceNodes.map((node, index) => (
        <group 
          key={`evidence-${index}`}
          position={node.position}
          userData={{ isEvidence: true, evidenceIndex: index }}
        >
          {/* Evidence node sphere */}
          <mesh>
            <sphereGeometry args={[1.2, 12, 12]} />
            <meshBasicMaterial 
              color={node.color}
              transparent
              opacity={0.1}
            />
          </mesh>
          
          {/* Evidence glow */}
          <mesh>
            <sphereGeometry args={[2, 8, 8]} />
            <meshBasicMaterial 
              color={node.color}
              transparent
              opacity={0.1}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          
          {/* Evidence label */}
          <Text
            text={node.content}
            fontSize={0.8}
            color={node.color}
            anchorX="center"
            anchorY="middle"
            position={[0, 2, 0]}
          >
            <meshBasicMaterial 
              color={node.color}
              toneMapped={false}
            />
          </Text>
        </group>
      ))}

      {/* Answer assembly area */}
      <group position={[20, -5, 0]}>
        {/* Assembly platform */}
        <mesh>
          <cylinderGeometry args={[6, 6, 0.5, 16]} />
          <meshBasicMaterial 
            color="#333333"
            transparent
            opacity={0.3}
          />
        </mesh>
        
        {/* Answer components */}
        {answerComponents.map((component, index) => (
          <group 
            key={`answer-${index}`}
            position={[
              (index - 2.5) * 2,
              1 + index * 0.2,
              0
            ]}
            userData={{ isAnswerComponent: true, componentIndex: index }}
          >
            <Text
              text={component.text}
              fontSize={1}
              color={component.color}
              anchorX="center"
              anchorY="middle"
            >
              <meshBasicMaterial 
                color={component.color}
                toneMapped={false}
              />
            </Text>
          </group>
        ))}
      </group>

      {/* User query input area */}
      <group position={[-20, 5, 0]}>
        <mesh>
          <boxGeometry args={[6, 3, 1]} />
          <meshBasicMaterial 
            color="#444444"
            transparent
            opacity={0.5}
          />
        </mesh>
        
        <Text
          text="USER QUERY"
          fontSize={1.2}
          color="#00FFFF"
          anchorX="center"
          anchorY="middle"
          position={[0, 0, 0.6]}
        >
          <meshBasicMaterial 
            color="#00FFFF"
            toneMapped={false}
          />
        </Text>
      </group>

      {/* Scene title */}
      <Text
        text="CONSULTA Y RESPUESTA"
        fontSize={2}
        color="#00FFFF"
        anchorX="center"
        anchorY="middle"
        position={[0, 8, 0]}
      >
        <meshBasicMaterial 
          color="#00FFFF"
          toneMapped={false}
        />
      </Text>

      {/* Traceable path indicators */}
      {evidenceNodes.map((node, index) => (
        <group key={`trace-${index}`} position={node.position}>
          <Text
            text={`TRACE ${index + 1}`}
            fontSize={0.5}
            color="#FFFF00"
            anchorX="center"
            anchorY="middle"
            position={[0, -2, 0]}
          >
            <meshBasicMaterial 
              color="#FFFF00"
              toneMapped={false}
            />
          </Text>
        </group>
      ))}
    </group>
  );
};

export default QueryResponseScene;