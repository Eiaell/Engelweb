'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshTransmissionMaterial, Sphere, Torus, Icosahedron, Octahedron } from '@react-three/drei';
import * as THREE from 'three';

interface Premium3DObjectsProps {
  currentSection: number;
  scrollProgress: number;
}

// Custom shader material for premium effects
const PremiumMaterial = ({ color, transmission = 0.9, roughness = 0.1 }: { color: string; transmission?: number; roughness?: number }) => (
  <MeshTransmissionMaterial
    transmission={transmission}
    roughness={roughness}
    thickness={0.2}
    ior={1.5}
    chromaticAberration={0.02}
    anisotropy={0.1}
    distortion={0.1}
    distortionScale={0.2}
    temporalDistortion={0.1}
    color={color}
  />
);

// Section 1: Identity - Quantum Orb with EH pattern
export const IdentityScene = ({ isActive }: { isActive: boolean; progress: number }) => {
  const groupRef = useRef<THREE.Group>(null);
  const orbRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!groupRef.current || !orbRef.current) return;
    
    const time = state.clock.elapsedTime;
    
    // Floating animation
    groupRef.current.position.y = Math.sin(time * 0.5) * 0.3;
    
    // Rotation with EH-inspired pattern (E = 2 beats, H = 3 beats)
    orbRef.current.rotation.x = time * 0.2;
    orbRef.current.rotation.y = time * 0.3;
    orbRef.current.rotation.z = Math.sin(time * 0.7) * 0.1;
    
    // Scale pulsing with golden ratio
    const scale = 1 + Math.sin(time * 1.618) * 0.1;
    orbRef.current.scale.setScalar(scale);
  });

  return (
    <group ref={groupRef} visible={isActive} position={[0, 0, 0]}>
      <Sphere ref={orbRef} args={[1.5, 64, 64]}>
        <PremiumMaterial color="#E94560" transmission={0.8} roughness={0.05} />
      </Sphere>
      
      {/* Inner core with EH pattern */}
      <Sphere args={[0.8, 32, 32]}>
        <meshStandardMaterial
          color="#F7B801"
          emissive="#F7B801"
          emissiveIntensity={0.2}
          transparent
          opacity={0.6}
        />
      </Sphere>
      
      {/* Orbital rings inspired by EH initials */}
      <Torus args={[2, 0.05, 16, 100]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#E94560" emissive="#E94560" emissiveIntensity={0.3} />
      </Torus>
      <Torus args={[2.5, 0.03, 16, 100]} rotation={[0, 0, Math.PI / 2]}>
        <meshStandardMaterial color="#F7B801" emissive="#F7B801" emissiveIntensity={0.2} />
      </Torus>
    </group>
  );
};

// Section 2: Origin - Dual Heritage Crystals
export const OriginScene = ({ isActive, progress }: { isActive: boolean; progress: number }) => {
  const groupRef = useRef<THREE.Group>(null);
  const crystal1Ref = useRef<THREE.Mesh>(null);
  const crystal2Ref = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!groupRef.current || !crystal1Ref.current || !crystal2Ref.current) return;
    
    const time = state.clock.elapsedTime;
    
    // Opposing rotations representing dual heritage
    crystal1Ref.current.rotation.y = time * 0.4;
    crystal2Ref.current.rotation.y = -time * 0.3;
    
    // Gentle floating with phase offset
    crystal1Ref.current.position.y = Math.sin(time * 0.6) * 0.2;
    crystal2Ref.current.position.y = Math.sin(time * 0.6 + Math.PI) * 0.2;
    
    // Proximity effect - they attract each other subtly
    const distance = 2 + Math.sin(time * 0.3) * 0.3;
    crystal1Ref.current.position.x = -distance / 2;
    crystal2Ref.current.position.x = distance / 2;
  });

  return (
    <group ref={groupRef} visible={isActive} position={[0, 0, 0]}>
      {/* Puno (Peru) Crystal - Warm tones */}
      <Octahedron ref={crystal1Ref} args={[1]} position={[-1, 0, 0]}>
        <PremiumMaterial color="#F7B801" transmission={0.7} roughness={0.15} />
      </Octahedron>
      
      {/* Appenweier (Germany) Crystal - Cool precision */}
      <Icosahedron ref={crystal2Ref} args={[1]} position={[1, 0, 0]}>
        <PremiumMaterial color="#E94560" transmission={0.6} roughness={0.1} />
      </Icosahedron>
      
      {/* Energy bridge between them */}
      <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 3, 8]} />
        <meshStandardMaterial
          color="#F8F9FA"
          emissive="#F8F9FA"
          emissiveIntensity={0.3}
          transparent
          opacity={0.6}
        />
      </mesh>
    </group>
  );
};

// Section 3: Mission - Invisible Systems (Wireframe Architecture)
export const MissionScene = ({ isActive, progress }: { isActive: boolean; progress: number }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  const wireframes = useMemo(() => {
    const objects = [];
    
    // Create multiple geometric forms representing systems
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const radius = 2;
      objects.push({
        position: [Math.cos(angle) * radius, Math.sin(angle) * 0.5, Math.sin(angle) * radius],
        rotation: [angle * 0.5, angle, angle * 0.3],
        geometry: i % 2 === 0 ? 'box' : 'octahedron',
        scale: 0.6 + (i * 0.1)
      });
    }
    
    return objects;
  }, []);
  
  useFrame((state) => {
    if (!groupRef.current) return;
    
    const time = state.clock.elapsedTime;
    
    // Slow orbital motion
    groupRef.current.rotation.y = time * 0.1;
    
    // Individual object animations
    groupRef.current.children.forEach((child, index) => {
      if (child instanceof THREE.Mesh) {
        child.rotation.x += 0.01 * (index + 1);
        child.rotation.z += 0.005 * (index + 1);
      }
    });
  });

  return (
    <group ref={groupRef} visible={isActive} position={[0, 0, 0]}>
      {wireframes.map((obj, index) => (
        <mesh
          key={index}
          position={obj.position as [number, number, number]}
          rotation={obj.rotation as [number, number, number]}
          scale={obj.scale}
        >
          {obj.geometry === 'box' ? (
            <boxGeometry args={[1, 1, 1]} />
          ) : (
            <octahedronGeometry args={[1]} />
          )}
          <meshStandardMaterial
            color="#E94560"
            wireframe
            emissive="#E94560"
            emissiveIntensity={0.2}
          />
        </mesh>
      ))}
      
      {/* Central core */}
      <Sphere args={[0.3, 16, 16]}>
        <meshStandardMaterial
          color="#F7B801"
          emissive="#F7B801"
          emissiveIntensity={0.5}
        />
      </Sphere>
    </group>
  );
};

// Section 4: Present - Data Flow Rivers
export const PresentScene = ({ isActive, progress }: { isActive: boolean; progress: number }) => {
  const groupRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);
  
  const particles = useMemo(() => {
    const positions = new Float32Array(200 * 3);
    const colors = new Float32Array(200 * 3);
    
    for (let i = 0; i < 200; i++) {
      // Create flowing streams
      const stream = Math.floor(i / 40);
      const t = (i % 40) / 40;
      
      positions[i * 3] = Math.sin(stream * Math.PI * 0.4) * (2 + t * 3);
      positions[i * 3 + 1] = (stream - 2) * 0.8;
      positions[i * 3 + 2] = Math.cos(stream * Math.PI * 0.4) * (2 + t * 3);
      
      // EH color scheme
      const isRed = stream % 2 === 0;
      colors[i * 3] = isRed ? 233/255 : 247/255;     // R
      colors[i * 3 + 1] = isRed ? 69/255 : 184/255;  // G
      colors[i * 3 + 2] = isRed ? 96/255 : 1/255;    // B
    }
    
    return { positions, colors };
  }, []);
  
  useFrame((state) => {
    if (!particlesRef.current) return;
    
    const time = state.clock.elapsedTime;
    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
    
    // Animate particle flow
    for (let i = 0; i < 200; i++) {
      const stream = Math.floor(i / 40);
      const t = ((i % 40) / 40 + time * 0.2) % 1;
      
      positions[i * 3] = Math.sin(stream * Math.PI * 0.4) * (2 + t * 3);
      positions[i * 3 + 1] = (stream - 2) * 0.8 + Math.sin(time + i * 0.1) * 0.1;
      positions[i * 3 + 2] = Math.cos(stream * Math.PI * 0.4) * (2 + t * 3);
    }
    
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <group ref={groupRef} visible={isActive} position={[0, 0, 0]}>
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={200}
            array={particles.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={200}
            array={particles.colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.05}
          vertexColors
          transparent
          opacity={0.8}
          sizeAttenuation
        />
      </points>
    </group>
  );
};

// Section 5: Vision - Modular City Unfolding
export const VisionScene = ({ isActive, progress }: { isActive: boolean; progress: number }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  const modules = useMemo(() => {
    const objects = [];
    
    // Create modular grid representing future systems
    for (let x = -2; x <= 2; x++) {
      for (let z = -2; z <= 2; z++) {
        if (x === 0 && z === 0) continue; // Leave center empty
        
        objects.push({
          position: [x * 1.5, 0, z * 1.5],
          scale: Math.random() * 0.5 + 0.5,
          delay: (Math.abs(x) + Math.abs(z)) * 0.2
        });
      }
    }
    
    return objects;
  }, []);
  
  useFrame((state) => {
    if (!groupRef.current) return;
    
    const time = state.clock.elapsedTime;
    
    groupRef.current.children.forEach((child, index) => {
      if (child instanceof THREE.Mesh) {
        const moduleItem = modules[index];
        if (moduleItem) {
          // Staggered emergence animation
          const emergence = Math.max(0, Math.sin(time * 0.5 - moduleItem.delay));
          child.position.y = emergence * 2 - 1;
          child.rotation.y = time * 0.3 + moduleItem.delay;
        }
      }
    });
  });

  return (
    <group ref={groupRef} visible={isActive} position={[0, 0, 0]}>
      {modules.map((moduleItem, index) => (
        <mesh
          key={index}
          position={moduleItem.position as [number, number, number]}
          scale={moduleItem.scale}
        >
          <boxGeometry args={[0.8, 0.8, 0.8]} />
          <PremiumMaterial 
            color={index % 2 === 0 ? "#E94560" : "#F7B801"} 
            transmission={0.6} 
            roughness={0.2} 
          />
        </mesh>
      ))}
      
      {/* Central hub */}
      <Sphere args={[0.5, 32, 32]} position={[0, 0, 0]}>
        <meshStandardMaterial
          color="#F8F9FA"
          emissive="#F8F9FA"
          emissiveIntensity={0.3}
        />
      </Sphere>
    </group>
  );
};

// Section 6: CTA - Conversation Portal
export const CTAScene = ({ isActive, progress }: { isActive: boolean; progress: number }) => {
  const groupRef = useRef<THREE.Group>(null);
  const portalRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!portalRef.current) return;
    
    const time = state.clock.elapsedTime;
    
    // Portal rotation
    portalRef.current.rotation.z = time * 0.5;
    
    // Pulsing scale
    const scale = 1 + Math.sin(time * 2) * 0.1;
    portalRef.current.scale.setScalar(scale);
  });

  return (
    <group ref={groupRef} visible={isActive} position={[0, 0, 0]}>
      <Torus ref={portalRef} args={[1.5, 0.1, 16, 100]}>
        <meshStandardMaterial
          color="#E94560"
          emissive="#E94560"
          emissiveIntensity={0.5}
        />
      </Torus>
      
      {/* Inner portal effect */}
      <Sphere args={[1.2, 32, 32]}>
        <PremiumMaterial color="#F7B801" transmission={0.9} roughness={0.05} />
      </Sphere>
      
      {/* EH signature particles */}
      {Array.from({ length: 20 }, (_, i) => (
        <mesh
          key={i}
          position={[
            Math.cos((i / 20) * Math.PI * 2) * 2,
            Math.sin((i / 20) * Math.PI * 2) * 0.5,
            Math.sin((i / 20) * Math.PI * 2) * 2
          ]}
        >
          <sphereGeometry args={[0.02]} />
          <meshStandardMaterial
            color="#F8F9FA"
            emissive="#F8F9FA"
            emissiveIntensity={0.8}
          />
        </mesh>
      ))}
    </group>
  );
};

export default function Premium3DObjects({ currentSection, scrollProgress }: Premium3DObjectsProps) {
  return (
    <>
      <IdentityScene isActive={currentSection === 0} progress={scrollProgress} />
      <OriginScene isActive={currentSection === 1} progress={scrollProgress} />
      <MissionScene isActive={currentSection === 2} progress={scrollProgress} />
      <PresentScene isActive={currentSection === 3} progress={scrollProgress} />
      <VisionScene isActive={currentSection === 4} progress={scrollProgress} />
      <CTAScene isActive={currentSection === 5} progress={scrollProgress} />
    </>
  );
}