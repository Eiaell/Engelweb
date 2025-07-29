'use client';

import { useRef, useEffect, useCallback, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { gsap } from 'gsap';
import { CameraKeyframe, ScrollState, PerformanceMetrics } from '@/types';
import * as THREE from 'three';

interface CameraControlOptions {
  enableShake: boolean;
  enableDynamics: boolean;
  performanceMode: 'high' | 'medium' | 'low';
}

export const useCameraControl = (
  scrollState: ScrollState,
  cameraKeyframes: CameraKeyframe[],
  options: CameraControlOptions = {
    enableShake: true,
    enableDynamics: true,
    performanceMode: 'high'
  }
) => {
  const { camera, scene } = useThree();
  const timelineRef = useRef<gsap.core.Timeline>();
  const shakeTimelineRef = useRef<gsap.core.Timeline>();
  const dynamicsRef = useRef({
    velocity: new THREE.Vector3(),
    acceleration: new THREE.Vector3(),
    damping: 0.95,
    mass: 1.0
  });
  
  // Camera state tracking
  const originalPositionRef = useRef(new THREE.Vector3());
  const originalRotationRef = useRef(new THREE.Euler());
  const targetPositionRef = useRef(new THREE.Vector3());
  const targetRotationRef = useRef(new THREE.Euler());
  const lookAtTargetRef = useRef<THREE.Vector3 | null>(null);
  
  // Performance monitoring
  const performanceRef = useRef({
    frameCount: 0,
    lastUpdateTime: 0,
    adaptiveQuality: true
  });

  // Shake parameters
  const shakeRef = useRef({
    intensity: 0,
    frequency: 30,
    decay: 0.95,
    offset: new THREE.Vector3(),
    isActive: false
  });

  // Memoized easing functions for better performance
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
    }
  }), []);

  const initializeTimeline = useCallback(() => {
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

    // Create smooth transitions between keyframes
    cameraKeyframes.forEach((keyframe, index) => {
      const startTime = keyframe.progress;
      const duration = keyframe.duration / cameraKeyframes.length;

      // Position animation
      timelineRef.current!.to(targetPositionRef.current, {
        x: keyframe.position[0],
        y: keyframe.position[1],
        z: keyframe.position[2],
        duration: duration,
        ease: keyframe.ease
      }, startTime);

      // Rotation animation
      timelineRef.current!.to(targetRotationRef.current, {
        x: keyframe.rotation[0],
        y: keyframe.rotation[1],
        z: keyframe.rotation[2],
        duration: duration,
        ease: keyframe.ease
      }, startTime);

      // FOV animation for perspective cameras
      if (camera instanceof THREE.PerspectiveCamera) {
        timelineRef.current!.to(camera, {
          fov: keyframe.fov,
          duration: duration,
          ease: keyframe.ease
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

      // Shake effects
      if (keyframe.shake && options.enableShake) {
        timelineRef.current!.call(() => {
          triggerCameraShake(keyframe.shake!.intensity, keyframe.shake!.duration);
        }, [], startTime + duration * 0.8);
      }
    });
  }, [camera, cameraKeyframes, options.enableShake]);

  const triggerCameraShake = useCallback((intensity: number, duration: number) => {
    if (!options.enableShake || options.performanceMode === 'low') return;

    // Adjust intensity based on performance mode
    const adjustedIntensity = options.performanceMode === 'medium' ? intensity * 0.7 : intensity;

    shakeRef.current.intensity = adjustedIntensity;
    shakeRef.current.isActive = true;

    if (shakeTimelineRef.current) {
      shakeTimelineRef.current.kill();
    }

    shakeTimelineRef.current = gsap.timeline({
      onComplete: () => {
        shakeRef.current.isActive = false;
        shakeRef.current.intensity = 0;
      }
    });

    shakeTimelineRef.current.to(shakeRef.current, {
      intensity: 0,
      duration: duration,
      ease: 'power2.out'
    });
  }, [options.enableShake, options.performanceMode]);

  const updateShake = useCallback(() => {
    if (!shakeRef.current.isActive || !options.enableShake) return;

    const shake = shakeRef.current;
    const time = Date.now() * 0.001;
    
    shake.offset.x = Math.sin(time * shake.frequency) * shake.intensity;
    shake.offset.y = Math.cos(time * shake.frequency * 1.1) * shake.intensity;
    shake.offset.z = Math.sin(time * shake.frequency * 0.9) * shake.intensity * 0.5;
  }, [options.enableShake]);

  const updateDynamics = useCallback((deltaTime: number) => {
    if (!options.enableDynamics || options.performanceMode === 'low') return;

    const dynamics = dynamicsRef.current;
    const targetPos = targetPositionRef.current;
    const currentPos = camera.position;

    // Calculate force towards target
    const force = targetPos.clone().sub(currentPos).multiplyScalar(deltaTime * 10);
    
    // Apply velocity damping based on scroll velocity
    const velocityDamping = Math.max(0.8, 1 - scrollState.velocity * 0.1);
    dynamics.velocity.multiplyScalar(velocityDamping);
    
    // Add force to acceleration
    dynamics.acceleration.copy(force).divideScalar(dynamics.mass);
    
    // Update velocity
    dynamics.velocity.add(dynamics.acceleration.clone().multiplyScalar(deltaTime));
    
    // Apply dynamics to camera position (subtle effect)
    const dynamicsInfluence = options.performanceMode === 'high' ? 0.1 : 0.05;
    camera.position.add(dynamics.velocity.clone().multiplyScalar(dynamicsInfluence * deltaTime));
  }, [camera, options.enableDynamics, options.performanceMode, scrollState.velocity]);

  const updateLookAt = useCallback(() => {
    if (lookAtTargetRef.current) {
      camera.lookAt(lookAtTargetRef.current);
    }
  }, [camera]);

  const interpolateToTarget = useCallback((alpha: number) => {
    // Smooth interpolation to target position and rotation
    camera.position.lerp(targetPositionRef.current, alpha);
    camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, targetRotationRef.current.x, alpha);
    camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, targetRotationRef.current.y, alpha);
    camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, targetRotationRef.current.z, alpha);
  }, [camera]);

  // Initialize timeline when keyframes change
  useEffect(() => {
    initializeTimeline();
    
    // Store original camera state
    originalPositionRef.current.copy(camera.position);
    originalRotationRef.current.copy(camera.rotation);
    targetPositionRef.current.copy(camera.position);
    targetRotationRef.current.copy(camera.rotation);
    
  }, [initializeTimeline, camera]);

  // Performance monitoring
  useFrame((state, deltaTime) => {
    const now = performance.now();
    performanceRef.current.frameCount++;

    // Throttle updates based on performance mode
    const updateInterval = options.performanceMode === 'low' ? 33.33 : // 30 FPS
                          options.performanceMode === 'medium' ? 20 : // 50 FPS
                          16.67; // 60 FPS

    if (now - performanceRef.current.lastUpdateTime < updateInterval) {
      return;
    }

    performanceRef.current.lastUpdateTime = now;

    // Update timeline progress
    if (timelineRef.current) {
      const progress = Math.min(scrollState.progress, 0.999);
      timelineRef.current.progress(progress);
    }

    // Update camera shake
    updateShake();

    // Update dynamics
    updateDynamics(deltaTime);

    // Interpolate to target with velocity-based smoothing
    const interpolationSpeed = Math.max(0.05, Math.min(0.3, scrollState.velocity * 0.5 + 0.1));
    interpolateToTarget(interpolationSpeed);

    // Apply shake offset
    if (shakeRef.current.isActive) {
      camera.position.add(shakeRef.current.offset);
    }

    // Update look-at target
    updateLookAt();
  });

  // Cleanup
  useEffect(() => {
    return () => {
      timelineRef.current?.kill();
      shakeTimelineRef.current?.kill();
    };
  }, []);

  // Public API
  const setQuality = useCallback((quality: 'high' | 'medium' | 'low') => {
    options.performanceMode = quality;
  }, [options]);

  const manualShake = useCallback((intensity: number, duration: number = 0.3) => {
    triggerCameraShake(intensity, duration);
  }, [triggerCameraShake]);

  const resetToSection = useCallback((sectionIndex: number) => {
    if (cameraKeyframes[sectionIndex]) {
      const keyframe = cameraKeyframes[sectionIndex];
      gsap.to(camera.position, {
        x: keyframe.position[0],
        y: keyframe.position[1],
        z: keyframe.position[2],
        duration: 1,
        ease: 'power2.out'
      });
      gsap.to(camera.rotation, {
        x: keyframe.rotation[0],
        y: keyframe.rotation[1],
        z: keyframe.rotation[2],
        duration: 1,
        ease: 'power2.out'
      });
    }
  }, [camera, cameraKeyframes]);

  const enableDynamics = useCallback((enabled: boolean) => {
    options.enableDynamics = enabled;
  }, [options]);

  const enableShake = useCallback((enabled: boolean) => {
    options.enableShake = enabled;
    if (!enabled) {
      shakeRef.current.isActive = false;
      shakeRef.current.intensity = 0;
    }
  }, [options]);

  return {
    timeline: timelineRef.current,
    shakeTimeline: shakeTimelineRef.current,
    triggerShake: manualShake,
    resetToSection,
    setQuality,
    enableDynamics,
    enableShake,
    isShaking: shakeRef.current.isActive,
    currentVelocity: scrollState.velocity
  };
};