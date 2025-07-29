'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useScrollControl } from './useScrollControl';
import { useCameraControl } from './useCameraControl';
import { useScrollTextReveal } from './useScrollTextReveal';
import { ScrollAnimationOrchestrator } from '@/lib/scrollAnimationOrchestrator';
import { SECTION_ANIMATIONS, getOptimizedAnimations, getMobileAnimations } from '@/lib/sectionAnimations';
import { 
  ScrollState, 
  ScrollAnimation, 
  PerformanceMetrics,
  AnimationQuality,
  CameraKeyframe
} from '@/types';

interface CinematicScrollOptions {
  totalSections?: number;
  enablePerformanceMonitoring?: boolean;
  adaptiveQuality?: boolean;
  mobileOptimized?: boolean;
  initialPerformanceMode?: 'high' | 'medium' | 'low';
}

export const useCinematicScroll = (
  options: CinematicScrollOptions = {}
) => {
  const {
    totalSections = 6,
    enablePerformanceMonitoring = true,
    adaptiveQuality = true,
    mobileOptimized = false,
    initialPerformanceMode = 'high'
  } = options;

  // Core hooks
  const {
    scrollState,
    scrollToSection,
    scrollToProgress,
    pause: pauseScroll,
    resume: resumeScroll,
    getCurrentVelocity,
    isScrolling,
    lenis
  } = useScrollControl(totalSections);

  // State management
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    frameTime: 16.67,
    memoryUsage: 0,
    animationComplexity: 'medium',
    shouldOptimize: false
  });

  const [currentQuality, setCurrentQuality] = useState<'high' | 'medium' | 'low'>(
    mobileOptimized ? 'low' : initialPerformanceMode
  );

  const [isInitialized, setIsInitialized] = useState(false);

  // Refs
  const orchestratorRef = useRef<ScrollAnimationOrchestrator | null>(null);
  const animationsRef = useRef<ScrollAnimation[]>([]);
  const cameraKeyframesRef = useRef<CameraKeyframe[]>([]);

  // Device detection
  const isMobile = useRef(false);
  const supportsReducedMotion = useRef(false);

  // Initialize device detection
  useEffect(() => {
    // Detect mobile device
    isMobile.current = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || window.innerWidth < 768;

    // Check for reduced motion preference
    supportsReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Adjust initial quality based on device capabilities
    if (isMobile.current || supportsReducedMotion.current) {
      setCurrentQuality('low');
    }
  }, []);

  // Initialize animations based on quality and device
  const initializeAnimations = useCallback(() => {
    let animations: ScrollAnimation[];

    if (supportsReducedMotion.current) {
      // Simplified animations for reduced motion
      animations = SECTION_ANIMATIONS.map(anim => ({
        ...anim,
        cameraKeyframes: anim.cameraKeyframes.map(keyframe => ({
          ...keyframe,
          shake: undefined // No shake for reduced motion
        })),
        sceneAnimations: anim.sceneAnimations.filter(
          sceneAnim => !sceneAnim.target.includes('particle')
        ),
        particleSystem: undefined
      }));
    } else if (mobileOptimized || isMobile.current) {
      animations = getMobileAnimations();
    } else {
      animations = getOptimizedAnimations(currentQuality);
    }

    animationsRef.current = animations;
    
    // Extract camera keyframes for the camera control hook
    cameraKeyframesRef.current = animations.flatMap(anim => anim.cameraKeyframes);

    return animations;
  }, [currentQuality, mobileOptimized]);

  // Performance monitoring callback
  const handlePerformanceUpdate = useCallback((metrics: PerformanceMetrics) => {
    setPerformanceMetrics(metrics);

    if (adaptiveQuality && metrics.shouldOptimize && currentQuality !== 'low') {
      const newQuality = currentQuality === 'high' ? 'medium' : 'low';
      setCurrentQuality(newQuality);
    }
  }, [adaptiveQuality, currentQuality]);

  // Section change callback
  const handleSectionChange = useCallback((newSection: number) => {
    // Trigger any section-specific effects
    console.log(`Transitioning to section ${newSection}`);
    
    // You can add custom section change logic here
    // For example, preloading next section assets, updating URL, etc.
  }, []);

  // Initialize orchestrator
  useEffect(() => {
    if (isInitialized) return;

    const animations = initializeAnimations();
    
    orchestratorRef.current = new ScrollAnimationOrchestrator(
      animations,
      handleSectionChange,
      enablePerformanceMonitoring ? handlePerformanceUpdate : undefined
    );

    setIsInitialized(true);

    return () => {
      orchestratorRef.current?.destroy();
    };
  }, [isInitialized, initializeAnimations, handleSectionChange, handlePerformanceUpdate, enablePerformanceMonitoring]);

  // Update orchestrator with scroll state
  useEffect(() => {
    if (orchestratorRef.current && isInitialized) {
      orchestratorRef.current.syncWithScroll(scrollState);
    }
  }, [scrollState, isInitialized]);

  // Camera control integration
  const cameraControl = useCameraControl(
    scrollState,
    cameraKeyframesRef.current,
    {
      enableShake: !supportsReducedMotion.current && currentQuality !== 'low',
      enableDynamics: currentQuality === 'high',
      performanceMode: currentQuality
    }
  );

  // Text reveal integration
  const textReveal = useScrollTextReveal(
    scrollState,
    animationsRef.current.flatMap(anim => anim.textRevealTiming),
    {
      enableStagger: currentQuality !== 'low',
      performance: currentQuality,
      enableMagnetic: !isMobile.current && currentQuality === 'high'
    }
  );

  // Quality adjustment
  const setQuality = useCallback((quality: 'high' | 'medium' | 'low') => {
    setCurrentQuality(quality);
    
    // Update camera control quality
    cameraControl.setQuality(quality);
    
    // Update text reveal performance
    textReveal.setPerformanceMode(quality);
    
    // Reinitialize animations with new quality
    const newAnimations = getOptimizedAnimations(quality);
    orchestratorRef.current?.destroy();
    
    orchestratorRef.current = new ScrollAnimationOrchestrator(
      newAnimations,
      handleSectionChange,
      enablePerformanceMonitoring ? handlePerformanceUpdate : undefined
    );
  }, [cameraControl, textReveal, handleSectionChange, handlePerformanceUpdate, enablePerformanceMonitoring]);

  // Manual control functions
  const triggerSectionAnimation = useCallback((sectionId: number, progress: number = 1) => {
    orchestratorRef.current?.triggerSectionAnimation(sectionId, progress);
  }, []);

  const resetToSection = useCallback((sectionId: number) => {
    cameraControl.resetToSection(sectionId);
    scrollToSection(sectionId, true);
  }, [cameraControl, scrollToSection]);

  const triggerCameraShake = useCallback((intensity: number = 0.1, duration: number = 0.3) => {
    if (!supportsReducedMotion.current) {
      cameraControl.triggerShake(intensity, duration);
    }
  }, [cameraControl]);

  const pause = useCallback(() => {
    pauseScroll();
    orchestratorRef.current?.pause();
  }, [pauseScroll]);

  const resume = useCallback(() => {
    resumeScroll();
    orchestratorRef.current?.resume();
  }, [resumeScroll]);

  // Accessibility helpers
  const enableAccessibilityMode = useCallback(() => {
    setCurrentQuality('low');
    cameraControl.enableShake(false);
    cameraControl.enableDynamics(false);
  }, [cameraControl]);

  const getAccessibilityState = useCallback(() => {
    return {
      reducedMotion: supportsReducedMotion.current,
      isMobile: isMobile.current,
      currentQuality,
      shakeEnabled: !supportsReducedMotion.current && currentQuality !== 'low',
      dynamicsEnabled: currentQuality === 'high'
    };
  }, [currentQuality]);

  // Debug information
  const getDebugInfo = useCallback(() => {
    return {
      scrollState,
      performanceMetrics,
      currentQuality,
      isInitialized,
      isMobile: isMobile.current,
      reducedMotion: supportsReducedMotion.current,
      orchestratorFPS: orchestratorRef.current?.getCurrentFPS() || 0,
      cameraVelocity: cameraControl.currentVelocity,
      isShaking: cameraControl.isShaking,
      animationStates: animationsRef.current.map(anim => 
        orchestratorRef.current?.getSectionAnimationState(anim.sectionId)
      )
    };
  }, [scrollState, performanceMetrics, currentQuality, isInitialized, cameraControl]);

  return {
    // Core state
    scrollState,
    performanceMetrics,
    currentQuality,
    isInitialized,

    // Scroll controls
    scrollToSection,
    scrollToProgress,
    getCurrentVelocity,
    isScrolling,

    // Animation controls
    triggerSectionAnimation,
    resetToSection,
    triggerCameraShake,
    pause,
    resume,

    // Quality controls
    setQuality,
    enableAccessibilityMode,

    // Text reveal controls
    registerTextElement: textReveal.registerElement,
    unregisterTextElement: textReveal.unregisterElement,
    triggerTextAnimation: textReveal.triggerAnimation,
    resetTextAnimation: textReveal.resetAnimation,

    // Camera controls
    cameraControl,

    // Accessibility
    getAccessibilityState,

    // Debug
    getDebugInfo,

    // Raw references (for advanced usage)
    lenis,
    orchestrator: orchestratorRef.current
  };
};