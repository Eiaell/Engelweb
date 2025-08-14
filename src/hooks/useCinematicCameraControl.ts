'use client';

import { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { gsap } from 'gsap';
import { 
  CameraKeyframe, 
  ScrollState, 
  CameraDollyShot, 
  CameraPersonality, 
  CameraInterestPoint,
  CameraBounds 
} from '@/types';
import * as THREE from 'three';

interface CinematicCameraOptions {
  enableShake: boolean;
  enableDynamics: boolean;
  enableMicroMovements: boolean;
  enableLookAhead: boolean;
  enableComposition: boolean;
  performanceMode: 'high' | 'medium' | 'low';
  personality?: string;
  debug?: boolean;
}

interface CameraLookAheadState {
  velocity: THREE.Vector3;
  acceleration: THREE.Vector3;
  targetOffset: THREE.Vector3;
  smoothingFactor: number;
  predictionDistance: number;
}

interface CameraMicroMovementState {
  breathing: {
    time: number;
    amplitude: number;
    frequency: number;
  };
  drift: {
    time: number;
    direction: THREE.Vector3;
    speed: number;
  };
  sway: {
    time: number;
    axis: THREE.Vector3;
    intensity: number;
  };
}

interface CameraCompositionGuides {
  ruleOfThirds: boolean;
  leadingLines: boolean;
  framing: 'close' | 'medium' | 'wide' | 'extreme-wide';
  focusPoint: THREE.Vector3;
  subjectTracking: boolean;
}

// Cinematic camera personalities with different behavioral characteristics
const CAMERA_PERSONALITIES: Record<string, CameraPersonality> = {
  intimate: {
    name: 'intimate',
    microMovements: {
      breathing: { intensity: 0.002, frequency: 0.3, enabled: true },
      drift: { intensity: 0.001, speed: 0.1, enabled: true },
      sway: { intensity: 0.0005, frequency: 0.2, enabled: true }
    },
    responsiveness: 0.95,
    smoothing: 0.8,
    anticipation: 0.15,
    overshoot: 0.05
  },
  cinematic: {
    name: 'cinematic',
    microMovements: {
      breathing: { intensity: 0.001, frequency: 0.4, enabled: true },
      drift: { intensity: 0.0015, speed: 0.08, enabled: true },
      sway: { intensity: 0.001, frequency: 0.15, enabled: true }
    },
    responsiveness: 0.85,
    smoothing: 0.9,
    anticipation: 0.25,
    overshoot: 0.1
  },
  dynamic: {
    name: 'dynamic',
    microMovements: {
      breathing: { intensity: 0.003, frequency: 0.6, enabled: true },
      drift: { intensity: 0.002, speed: 0.12, enabled: true },
      sway: { intensity: 0.0015, frequency: 0.25, enabled: true }
    },
    responsiveness: 0.7,
    smoothing: 0.6,
    anticipation: 0.3,
    overshoot: 0.15
  },
  stable: {
    name: 'stable',
    microMovements: {
      breathing: { intensity: 0.0005, frequency: 0.2, enabled: false },
      drift: { intensity: 0.0005, speed: 0.05, enabled: false },
      sway: { intensity: 0.0002, frequency: 0.1, enabled: false }
    },
    responsiveness: 0.98,
    smoothing: 0.95,
    anticipation: 0.05,
    overshoot: 0.02
  }
};

export const useCinematicCameraControl = (
  scrollState: ScrollState,
  cameraKeyframes: CameraKeyframe[],
  options: CinematicCameraOptions = {
    enableShake: true,
    enableDynamics: true,
    enableMicroMovements: true,
    enableLookAhead: true,
    enableComposition: true,
    performanceMode: 'high',
    personality: 'cinematic'
  }
) => {
  const { camera, scene } = useThree();
  
  // Core animation references
  const timelineRef = useRef<gsap.core.Timeline>();
  const shakeTimelineRef = useRef<gsap.core.Timeline>();
  const dollyTimelineRef = useRef<gsap.core.Timeline>();
  
  // Camera state tracking
  const originalPositionRef = useRef(new THREE.Vector3());
  const originalRotationRef = useRef(new THREE.Euler());
  const targetPositionRef = useRef(new THREE.Vector3());
  const targetRotationRef = useRef(new THREE.Euler());
  const lookAtTargetRef = useRef<THREE.Vector3 | null>(null);
  
  // Advanced camera state
  const lookAheadRef = useRef<CameraLookAheadState>({
    velocity: new THREE.Vector3(),
    acceleration: new THREE.Vector3(),
    targetOffset: new THREE.Vector3(),
    smoothingFactor: 0.85,
    predictionDistance: 2.0
  });
  
  const microMovementRef = useRef<CameraMicroMovementState>({
    breathing: { time: 0, amplitude: 0.002, frequency: 0.3 },
    drift: { time: 0, direction: new THREE.Vector3(1, 0.5, 0.3).normalize(), speed: 0.08 },
    sway: { time: 0, axis: new THREE.Vector3(0, 0, 1), intensity: 0.001 }
  });
  
  const compositionRef = useRef<CameraCompositionGuides>({
    ruleOfThirds: true,
    leadingLines: true,
    framing: 'medium',
    focusPoint: new THREE.Vector3(),
    subjectTracking: true
  });
  
  const interestPointsRef = useRef<CameraInterestPoint[]>([]);
  const cameraBoundsRef = useRef<CameraBounds | null>(null);
  
  // Performance and state management
  const [currentPersonality, setCurrentPersonality] = useState<CameraPersonality>(
    CAMERA_PERSONALITIES[options.personality || 'cinematic']
  );
  const [isIdleState, setIsIdleState] = useState(true);
  const [currentDollyShot, setCurrentDollyShot] = useState<CameraDollyShot | null>(null);
  
  // Performance monitoring
  const performanceRef = useRef({
    frameCount: 0,
    lastUpdateTime: 0,
    adaptiveQuality: true,
    skipFrames: 0
  });

  // Shake parameters (enhanced from original)
  const shakeRef = useRef({
    intensity: 0,
    frequency: 30,
    decay: 0.95,
    offset: new THREE.Vector3(),
    isActive: false,
    type: 'handheld' as 'handheld' | 'earthquake' | 'impact' | 'camera-shake'
  });

  // Memoized easing functions with cinematic curves
  const easingFunctions = useMemo(() => ({
    'power2.inOut': (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
    'power2.out': (t: number) => 1 - Math.pow(1 - t, 2),
    'power3.out': (t: number) => 1 - Math.pow(1 - t, 3),
    'elastic.out': (t: number) => {
      const c4 = (2 * Math.PI) / 3;
      return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    },
    'back.out': (t: number) => {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    'cinematic.ease': (t: number) => {
      // Custom cinematic easing curve - slow in, fast middle, slow out
      return t < 0.1 ? 5 * t * t : 
             t < 0.9 ? 0.05 + 0.9 * (t - 0.1) / 0.8 : 
             0.95 + 0.05 * (1 - Math.pow(1 - (t - 0.9) / 0.1, 2));
    },
    'dolly.smooth': (t: number) => {
      // Smooth dolly movement with natural acceleration/deceleration
      const smoothT = 3 * t * t - 2 * t * t * t;
      return smoothT;
    }
  }), []);

  /**
   * Advanced dolly shot implementation with natural camera movement
   */
  const executeDollyShot = useCallback((dollyConfig: CameraDollyShot, startPosition: THREE.Vector3) => {
    if (!options.enableDynamics || options.performanceMode === 'low') return;

    setCurrentDollyShot(dollyConfig);
    
    if (dollyTimelineRef.current) {
      dollyTimelineRef.current.kill();
    }

    const direction = new THREE.Vector3();
    const targetPos = startPosition.clone();
    
    switch (dollyConfig.type) {
      case 'track-in':
        direction.copy(camera.getWorldDirection(new THREE.Vector3())).multiplyScalar(-dollyConfig.distance);
        break;
      case 'track-out':
        direction.copy(camera.getWorldDirection(new THREE.Vector3())).multiplyScalar(dollyConfig.distance);
        break;
      case 'push-in':
        // More dramatic than track-in, directly towards subject
        if (lookAtTargetRef.current) {
          direction.subVectors(lookAtTargetRef.current, startPosition).normalize().multiplyScalar(-dollyConfig.distance);
        }
        break;
      case 'pull-out':
        // Dramatic pull away from subject
        if (lookAtTargetRef.current) {
          direction.subVectors(lookAtTargetRef.current, startPosition).normalize().multiplyScalar(dollyConfig.distance);
        }
        break;
    }

    targetPos.add(direction);

    dollyTimelineRef.current = gsap.timeline({
      onComplete: () => setCurrentDollyShot(null)
    });

    dollyTimelineRef.current.to(targetPositionRef.current, {
      x: targetPos.x,
      y: targetPos.y,
      z: targetPos.z,
      duration: dollyConfig.duration,
      ease: easingFunctions['dolly.smooth'] || dollyConfig.ease
    });

    // Maintain framing during dolly if specified
    if (dollyConfig.maintainFraming && lookAtTargetRef.current) {
      dollyTimelineRef.current.to(camera.rotation, {
        x: Math.atan2(
          lookAtTargetRef.current.y - targetPos.y,
          Math.sqrt(
            Math.pow(lookAtTargetRef.current.x - targetPos.x, 2) + 
            Math.pow(lookAtTargetRef.current.z - targetPos.z, 2)
          )
        ),
        duration: dollyConfig.duration,
        ease: dollyConfig.ease
      }, 0);
    }
  }, [camera, options.enableDynamics, options.performanceMode, easingFunctions]);

  /**
   * Look-ahead prediction for smooth camera transitions
   */
  const updateLookAhead = useCallback((deltaTime: number) => {
    if (!options.enableLookAhead || options.performanceMode === 'low') return;

    const lookAhead = lookAheadRef.current;
    const scrollVel = scrollState.velocity || 0;
    
    // Calculate velocity-based prediction
    const predictionStrength = Math.min(Math.abs(scrollVel) * 0.5, 1.0);
    const currentVelocity = new THREE.Vector3(
      scrollVel * currentPersonality.anticipation,
      0,
      scrollVel * currentPersonality.anticipation * 0.5
    );

    // Smooth velocity interpolation
    lookAhead.velocity.lerp(currentVelocity, deltaTime * lookAhead.smoothingFactor);
    
    // Calculate anticipated position offset
    lookAhead.targetOffset.copy(lookAhead.velocity).multiplyScalar(lookAhead.predictionDistance);
    
    // Apply personality-based modifications
    lookAhead.targetOffset.multiplyScalar(predictionStrength * currentPersonality.responsiveness);
    
    // Update target position with look-ahead offset
    targetPositionRef.current.add(lookAhead.targetOffset.multiplyScalar(deltaTime));
  }, [scrollState.velocity, options.enableLookAhead, options.performanceMode, currentPersonality]);

  /**
   * Micro-movements for natural camera behavior during idle states
   */
  const updateMicroMovements = useCallback((deltaTime: number) => {
    if (!options.enableMicroMovements || options.performanceMode === 'low' || !isIdleState) return;

    const microMovement = microMovementRef.current;
    const personality = currentPersonality.microMovements;
    const time = Date.now() * 0.001;

    // Breathing movement - subtle vertical oscillation
    if (personality.breathing.enabled) {
      microMovement.breathing.time += deltaTime * personality.breathing.frequency;
      const breathingOffset = Math.sin(microMovement.breathing.time) * personality.breathing.intensity;
      camera.position.y += breathingOffset;
    }

    // Drift movement - slow lateral movement
    if (personality.drift.enabled) {
      microMovement.drift.time += deltaTime * personality.drift.speed;
      const driftX = Math.sin(microMovement.drift.time * 0.7) * personality.drift.intensity;
      const driftZ = Math.cos(microMovement.drift.time * 0.5) * personality.drift.intensity * 0.5;
      camera.position.x += driftX;
      camera.position.z += driftZ;
    }

    // Sway movement - subtle rotation oscillation
    if (personality.sway.enabled) {
      microMovement.sway.time += deltaTime * personality.sway.frequency;
      const swayRotation = Math.sin(microMovement.sway.time) * personality.sway.intensity;
      camera.rotation.z += swayRotation;
    }
  }, [camera, options.enableMicroMovements, options.performanceMode, isIdleState, currentPersonality]);

  /**
   * Dynamic framing based on content and composition rules
   */
  const updateDynamicFraming = useCallback((keyframe: CameraKeyframe) => {
    if (!options.enableComposition || options.performanceMode === 'low') return;

    const composition = compositionRef.current;
    
    // Update framing based on narrative beats
    const sectionId = Math.floor(scrollState.currentSection);
    
    switch (sectionId) {
      case 0: // Identity - intimate close-up
        composition.framing = 'close';
        composition.focusPoint.set(0, 0, 0);
        break;
      case 1: // Origin - sweeping establishing shots
        composition.framing = 'wide';
        composition.focusPoint.set(0, 2, 0);
        break;
      case 2: // Mission - focused tracking
        composition.framing = 'medium';
        composition.focusPoint.set(0, 0, 2);
        break;
      case 3: // Present - dynamic movement
        composition.framing = 'medium';
        composition.focusPoint.set(2, 1, 0);
        break;
      case 4: // Vision - expansive dolly-out
        composition.framing = 'extreme-wide';
        composition.focusPoint.set(0, 5, 0);
        break;
      case 5: // CTA - conversational medium shot
        composition.framing = 'medium';
        composition.focusPoint.set(0, 0, 3);
        break;
    }

    // Apply composition-based adjustments to camera FOV
    if (camera instanceof THREE.PerspectiveCamera) {
      const targetFOV = keyframe.fov + getFramingFOVAdjustment(composition.framing);
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFOV, 0.05);
      camera.updateProjectionMatrix();
    }
  }, [camera, scrollState.currentSection, options.enableComposition, options.performanceMode]);

  /**
   * Helper function to get FOV adjustments based on framing
   */
  const getFramingFOVAdjustment = useCallback((framing: string): number => {
    switch (framing) {
      case 'close': return -15;
      case 'medium': return 0;
      case 'wide': return 10;
      case 'extreme-wide': return 25;
      default: return 0;
    }
  }, []);

  /**
   * Enhanced shake system with different shake types
   */
  const triggerCinematicShake = useCallback((
    intensity: number, 
    duration: number, 
    type: 'handheld' | 'earthquake' | 'impact' | 'camera-shake' = 'handheld'
  ) => {
    if (!options.enableShake || options.performanceMode === 'low') return;

    // Adjust intensity based on performance mode and personality
    const adjustedIntensity = options.performanceMode === 'medium' ? 
      intensity * 0.7 * currentPersonality.overshoot : 
      intensity * currentPersonality.overshoot;

    shakeRef.current.intensity = adjustedIntensity;
    shakeRef.current.isActive = true;
    shakeRef.current.type = type;

    if (shakeTimelineRef.current) {
      shakeTimelineRef.current.kill();
    }

    shakeTimelineRef.current = gsap.timeline({
      onComplete: () => {
        shakeRef.current.isActive = false;
        shakeRef.current.intensity = 0;
      }
    });

    // Different shake patterns based on type
    switch (type) {
      case 'handheld':
        shakeRef.current.frequency = 25 + Math.random() * 10;
        shakeTimelineRef.current.to(shakeRef.current, {
          intensity: 0,
          duration: duration,
          ease: 'power2.out'
        });
        break;
      
      case 'earthquake':
        shakeRef.current.frequency = 15 + Math.random() * 5;
        shakeTimelineRef.current.to(shakeRef.current, {
          intensity: adjustedIntensity * 0.5,
          duration: duration * 0.3,
          ease: 'power2.in'
        }).to(shakeRef.current, {
          intensity: 0,
          duration: duration * 0.7,
          ease: 'power3.out'
        });
        break;
      
      case 'impact':
        shakeRef.current.frequency = 50 + Math.random() * 20;
        shakeTimelineRef.current.to(shakeRef.current, {
          intensity: 0,
          duration: duration,
          ease: 'power4.out'
        });
        break;
      
      case 'camera-shake':
      default:
        shakeRef.current.frequency = 30 + Math.random() * 15;
        shakeTimelineRef.current.to(shakeRef.current, {
          intensity: 0,
          duration: duration,
          ease: 'power2.out'
        });
        break;
    }
  }, [options.enableShake, options.performanceMode, currentPersonality]);

  /**
   * Enhanced shake calculation with personality-based variations
   */
  const updateEnhancedShake = useCallback(() => {
    if (!shakeRef.current.isActive || !options.enableShake) return;

    const shake = shakeRef.current;
    const time = Date.now() * 0.001;
    const personalityMod = currentPersonality.smoothing;
    
    // Base shake calculation with personality influence
    let shakeX = Math.sin(time * shake.frequency) * shake.intensity * personalityMod;
    let shakeY = Math.cos(time * shake.frequency * 1.1) * shake.intensity * personalityMod;
    let shakeZ = Math.sin(time * shake.frequency * 0.9) * shake.intensity * 0.5 * personalityMod;

    // Type-specific shake patterns
    switch (shake.type) {
      case 'handheld':
        shakeX *= 0.7;
        shakeY *= 1.2;
        shakeZ *= 0.5;
        break;
      case 'earthquake':
        shakeX *= 1.5;
        shakeY *= 0.8;
        shakeZ *= 1.8;
        break;
      case 'impact':
        const impactDecay = Math.pow(shake.intensity / (shake.intensity + 0.1), 2);
        shakeX *= impactDecay * 2;
        shakeY *= impactDecay * 1.5;
        shakeZ *= impactDecay;
        break;
    }
    
    shake.offset.set(shakeX, shakeY, shakeZ);
  }, [options.enableShake, currentPersonality]);

  /**
   * Initialize enhanced timeline with advanced features
   */
  const initializeEnhancedTimeline = useCallback(() => {
    if (timelineRef.current) {
      timelineRef.current.kill();
    }

    timelineRef.current = gsap.timeline({ 
      paused: true,
      onUpdate: () => {
        // Update camera projection matrix for FOV changes
        if (camera instanceof THREE.PerspectiveCamera) {
          camera.updateProjectionMatrix();
        }
      }
    });

    // Create smooth transitions between keyframes with advanced features
    cameraKeyframes.forEach((keyframe, index) => {
      const startTime = keyframe.progress;
      const duration = keyframe.duration / cameraKeyframes.length;

      // Position animation with personality-based easing
      timelineRef.current!.to(targetPositionRef.current, {
        x: keyframe.position[0],
        y: keyframe.position[1],
        z: keyframe.position[2],
        duration: duration * currentPersonality.smoothing,
        ease: keyframe.ease
      }, startTime);

      // Rotation animation
      timelineRef.current!.to(targetRotationRef.current, {
        x: keyframe.rotation[0],
        y: keyframe.rotation[1],
        z: keyframe.rotation[2],
        duration: duration * currentPersonality.smoothing,
        ease: keyframe.ease
      }, startTime);

      // FOV animation with dynamic framing
      if (camera instanceof THREE.PerspectiveCamera) {
        timelineRef.current!.to(camera, {
          fov: keyframe.fov,
          duration: duration,
          ease: keyframe.ease,
          onUpdate: () => updateDynamicFraming(keyframe)
        }, startTime);
      }

      // Look-at target animation
      if (keyframe.lookAt) {
        if (!lookAtTargetRef.current) {
          lookAtTargetRef.current = new THREE.Vector3();
        }
        timelineRef.current!.to(lookAtTargetRef.current, {
          x: keyframe.lookAt[0],
          y: keyframe.lookAt[1],
          z: keyframe.lookAt[2],
          duration: duration,
          ease: keyframe.ease
        }, startTime);
      }

      // Enhanced shake effects
      if (keyframe.shake && options.enableShake) {
        timelineRef.current!.call(() => {
          triggerCinematicShake(
            keyframe.shake!.intensity, 
            keyframe.shake!.duration, 
            'camera-shake'
          );
        }, [], startTime + duration * 0.8);
      }

      // Dolly shot execution
      if (keyframe.dollyShot && options.enableDynamics) {
        timelineRef.current!.call(() => {
          executeDollyShot(keyframe.dollyShot!, targetPositionRef.current);
        }, [], startTime + duration * 0.2);
      }

      // Interest points for subject tracking
      if (keyframe.interestPoints && options.enableComposition) {
        interestPointsRef.current = keyframe.interestPoints;
      }

      // Camera bounds enforcement
      if (keyframe.bounds) {
        cameraBoundsRef.current = keyframe.bounds;
      }
    });
  }, [camera, cameraKeyframes, currentPersonality, options, updateDynamicFraming, triggerCinematicShake, executeDollyShot]);

  /**
   * Enhanced dynamics with camera personality
   */
  const updateEnhancedDynamics = useCallback((deltaTime: number) => {
    if (!options.enableDynamics || options.performanceMode === 'low') return;

    const targetPos = targetPositionRef.current;
    const currentPos = camera.position;
    const personality = currentPersonality;

    // Calculate spring force towards target with personality-based responsiveness
    const force = targetPos.clone()
      .sub(currentPos)
      .multiplyScalar(deltaTime * 10 * personality.responsiveness);
    
    // Apply velocity damping based on scroll velocity and personality
    const scrollVelocityDamping = Math.max(0.7, 1 - Math.abs(scrollState.velocity) * 0.2);
    const personalityDamping = personality.smoothing;
    const combinedDamping = scrollVelocityDamping * personalityDamping;
    
    // Apply smoothed movement
    camera.position.lerp(targetPos, deltaTime * combinedDamping);

    // Enforce camera bounds if specified
    if (cameraBoundsRef.current) {
      const bounds = cameraBoundsRef.current;
      camera.position.clamp(
        new THREE.Vector3(...bounds.position.min),
        new THREE.Vector3(...bounds.position.max)
      );
    }
  }, [camera, options.enableDynamics, options.performanceMode, scrollState.velocity, currentPersonality]);

  /**
   * Idle state detection for micro-movements
   */
  const updateIdleState = useCallback(() => {
    const velocityThreshold = 0.01;
    const isCurrentlyIdle = Math.abs(scrollState.velocity || 0) < velocityThreshold;
    
    if (isCurrentlyIdle !== isIdleState) {
      setIsIdleState(isCurrentlyIdle);
    }
  }, [scrollState.velocity, isIdleState]);

  // Initialize timeline when keyframes or personality changes
  useEffect(() => {
    initializeEnhancedTimeline();
    
    // Store original camera state
    originalPositionRef.current.copy(camera.position);
    originalRotationRef.current.copy(camera.rotation);
    targetPositionRef.current.copy(camera.position);
    targetRotationRef.current.copy(camera.rotation);
    
  }, [initializeEnhancedTimeline, camera]);

  // Main animation loop with performance optimization
  useFrame((state, deltaTime) => {
    const now = performance.now();
    performanceRef.current.frameCount++;

    // Performance-based frame throttling
    const updateInterval = options.performanceMode === 'low' ? 33.33 : // 30 FPS
                          options.performanceMode === 'medium' ? 20 : // 50 FPS
                          16.67; // 60 FPS

    // Skip frames for performance if needed
    if (now - performanceRef.current.lastUpdateTime < updateInterval) {
      performanceRef.current.skipFrames++;
      return;
    }

    performanceRef.current.lastUpdateTime = now;

    // Update timeline progress with smooth interpolation
    if (timelineRef.current) {
      const progress = Math.min(scrollState.progress, 0.999);
      const smoothProgress = gsap.utils.interpolate(
        timelineRef.current.progress(),
        progress,
        currentPersonality.responsiveness * deltaTime * 5
      );
      timelineRef.current.progress(smoothProgress);
    }

    // Update idle state
    updateIdleState();

    // Update look-ahead prediction
    updateLookAhead(deltaTime);

    // Update enhanced shake
    updateEnhancedShake();

    // Update enhanced dynamics
    updateEnhancedDynamics(deltaTime);

    // Update micro-movements for natural behavior
    updateMicroMovements(deltaTime);

    // Apply shake offset
    if (shakeRef.current.isActive) {
      camera.position.add(shakeRef.current.offset);
    }

    // Update look-at target with smooth interpolation
    if (lookAtTargetRef.current) {
      const lookDirection = lookAtTargetRef.current.clone().sub(camera.position);
      const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, -1),
        lookDirection.normalize()
      );
      camera.quaternion.slerp(targetQuaternion, deltaTime * currentPersonality.responsiveness * 2);
    }

    // Debug information
    if (options.debug && performanceRef.current.frameCount % 60 === 0) {
      console.log('Cinematic Camera Debug:', {
        fps: 1000 / (now - performanceRef.current.lastUpdateTime),
        personality: currentPersonality.name,
        isIdle: isIdleState,
        currentDolly: currentDollyShot?.type,
        shaking: shakeRef.current.isActive,
        skipFrames: performanceRef.current.skipFrames,
        lookAheadOffset: lookAheadRef.current.targetOffset.length()
      });
      performanceRef.current.skipFrames = 0;
    }
  });

  // Cleanup
  useEffect(() => {
    return () => {
      timelineRef.current?.kill();
      shakeTimelineRef.current?.kill();
      dollyTimelineRef.current?.kill();
    };
  }, []);

  // Public API
  const setPersonality = useCallback((personalityName: string) => {
    if (CAMERA_PERSONALITIES[personalityName]) {
      setCurrentPersonality(CAMERA_PERSONALITIES[personalityName]);
    }
  }, []);

  const setQuality = useCallback((quality: 'high' | 'medium' | 'low') => {
    options.performanceMode = quality;
    
    // Adjust features based on quality
    options.enableMicroMovements = quality !== 'low';
    options.enableLookAhead = quality === 'high';
    options.enableComposition = quality !== 'low';
  }, [options]);

  const triggerDollyShot = useCallback((
    type: 'track-in' | 'track-out' | 'push-in' | 'pull-out',
    distance: number = 2,
    duration: number = 2,
    maintainFraming: boolean = true
  ) => {
    const dollyConfig: CameraDollyShot = {
      type,
      distance,
      duration,
      ease: 'cinematic.ease',
      maintainFraming
    };
    executeDollyShot(dollyConfig, camera.position.clone());
  }, [executeDollyShot, camera]);

  const addInterestPoint = useCallback((position: [number, number, number], weight: number = 1) => {
    interestPointsRef.current.push({
      position,
      weight,
      falloff: 5,
      active: true
    });
  }, []);

  const removeInterestPoints = useCallback(() => {
    interestPointsRef.current = [];
  }, []);

  const setBounds = useCallback((bounds: CameraBounds) => {
    cameraBoundsRef.current = bounds;
  }, []);

  const resetToSection = useCallback((sectionIndex: number) => {
    if (cameraKeyframes[sectionIndex]) {
      const keyframe = cameraKeyframes[sectionIndex];
      gsap.to(camera.position, {
        x: keyframe.position[0],
        y: keyframe.position[1],
        z: keyframe.position[2],
        duration: 1,
        ease: 'cinematic.ease'
      });
      gsap.to(camera.rotation, {
        x: keyframe.rotation[0],
        y: keyframe.rotation[1],
        z: keyframe.rotation[2],
        duration: 1,
        ease: 'cinematic.ease'
      });
    }
  }, [camera, cameraKeyframes]);

  return {
    // Enhanced camera controls
    timeline: timelineRef.current,
    dollyTimeline: dollyTimelineRef.current,
    shakeTimeline: shakeTimelineRef.current,
    
    // Cinematic functions
    triggerShake: triggerCinematicShake,
    triggerDollyShot,
    setPersonality,
    addInterestPoint,
    removeInterestPoints,
    setBounds,
    resetToSection,
    setQuality,
    
    // State information
    currentPersonality: currentPersonality.name,
    isIdle: isIdleState,
    isShaking: shakeRef.current.isActive,
    currentDollyShot: currentDollyShot?.type,
    currentVelocity: scrollState.velocity,
    
    // Debug information
    getDebugInfo: () => ({
      personality: currentPersonality.name,
      isIdle: isIdleState,
      shaking: shakeRef.current.isActive,
      dollyActive: currentDollyShot !== null,
      lookAheadActive: options.enableLookAhead,
      microMovementsActive: options.enableMicroMovements,
      compositionActive: options.enableComposition,
      performanceMode: options.performanceMode,
      fps: 1000 / (performance.now() - performanceRef.current.lastUpdateTime),
      skipFrames: performanceRef.current.skipFrames
    })
  };
};