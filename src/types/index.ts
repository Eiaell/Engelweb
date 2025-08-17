import * as THREE from 'three';

export interface SectionProps {
  isActive: boolean;
  scrollProgress: number;
  sectionProgress: number;
  velocity: number;
}

export interface ScrollState {
  scrollY: number;
  progress: number;
  currentSection: number;
  direction: 'up' | 'down';
  velocity: number;
  sectionProgress: number;
  previousSection: number;
}

export interface CameraState {
  position: [number, number, number];
  rotation: [number, number, number];
  fov: number;
  lookAt?: [number, number, number];
}

// Enhanced camera behavior types
export interface CameraMicroMovement {
  breathing: {
    intensity: number;
    frequency: number;
    enabled: boolean;
  };
  drift: {
    intensity: number;
    speed: number;
    enabled: boolean;
  };
  sway: {
    intensity: number;
    frequency: number;
    enabled: boolean;
  };
}

export interface CameraDollyShot {
  type: 'track-in' | 'track-out' | 'push-in' | 'pull-out';
  distance: number;
  duration: number;
  ease: string;
  maintainFraming: boolean;
}

export interface CameraFocusPull {
  from: number;
  to: number;
  duration: number;
  ease: string;
  blurIntensity: number;
}

export interface CameraPersonality {
  name: string;
  microMovements: CameraMicroMovement;
  responsiveness: number;
  smoothing: number;
  anticipation: number;
  overshoot: number;
}

export interface CameraInterestPoint {
  position: [number, number, number];
  weight: number;
  falloff: number;
  active: boolean;
}

export interface CameraBounds {
  position: {
    min: [number, number, number];
    max: [number, number, number];
  };
  rotation: {
    min: [number, number, number];
    max: [number, number, number];
  };
}

export interface CameraKeyframe extends CameraState {
  progress: number;
  duration: number;
  ease: string;
  shake?: {
    intensity: number;
    duration: number;
  };
  dollyShot?: CameraDollyShot;
  focusPull?: CameraFocusPull;
  personality?: string;
  interestPoints?: CameraInterestPoint[];
  bounds?: CameraBounds;
  anticipationDistance?: number;
}

export interface SceneAnimation {
  target: string;
  property: string;
  from: unknown;
  to: unknown;
  progress: [number, number];
  duration: number;
  ease: string;
  stagger?: number;
}

export interface TextRevealConfig {
  id: string;
  progress: number;
  duration: number;
  delay: number;
  variant: 'fade' | 'slideUp' | 'typewriter' | 'splitWords' | 'magneticHover';
  stagger?: number;
}

export interface ParticleSystemConfig {
  count: number;
  size: [number, number];
  speed: [number, number];
  opacity: [number, number];
  color: string;
  activationProgress: [number, number];
}

export interface ScrollAnimation {
  sectionId: number;
  name: SectionName;
  scrollRange: [number, number];
  cameraKeyframes: CameraKeyframe[];
  sceneAnimations: SceneAnimation[];
  textRevealTiming: TextRevealConfig[];
  particleSystem?: ParticleSystemConfig;
  transitionDuration: number;
}

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  animationComplexity: 'low' | 'medium' | 'high';
  shouldOptimize: boolean;
}

export interface AnimationQuality {
  particles: boolean;
  shadows: boolean;
  postProcessing: boolean;
  lodLevel: number;
  textureResolution: number;
}

export type SectionName = 
  | 'identity'
  | 'origin' 
  | 'mission'
  | 'present'
  | 'vision'
  | 'cta';

export interface SectionConfig {
  name: SectionName;
  component: React.ComponentType<SectionProps>;
  camera: CameraState;
  duration: number;
}

export interface OptimizedGeometry {
  high: THREE.BufferGeometry;
  medium: THREE.BufferGeometry;
  low: THREE.BufferGeometry;
}

export interface PerformanceConstraints {
  maxPolygons: number;
  maxTextureSize: number;
  maxParticles: number;
  maxLights: number;
  targetFPS: number;
}

export interface SectionData {
  identity: {
    text: string[];
    animation: 'rotate' | 'morph' | 'pulse';
  };
  origin: {
    locations: {
      puno: { lat: number; lng: number; name: string };
      appenweier: { lat: number; lng: number; name: string };
    };
    narrative: string[];
  };
  mission: {
    principles: string[];
    gearCount: number;
  };
  present: {
    tools: Array<{ name: string; category: string; icon: string }>;
    dataFlowIntensity: number;
  };
  vision: {
    modules: Array<{ type: string; connections: number[] }>;
    expansionSteps: number;
  };
  cta: {
    message: string;
    action: string;
  };
}