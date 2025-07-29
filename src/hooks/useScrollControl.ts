'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Lenis from 'lenis';
import { ScrollState } from '@/types';

export const useScrollControl = (totalSections: number = 6) => {
  const lenisRef = useRef<Lenis | null>(null);
  const velocityRef = useRef<number>(0);
  const lastScrollTimeRef = useRef<number>(0);
  const lastScrollYRef = useRef<number>(0);
  const velocityHistoryRef = useRef<number[]>([]);
  const rafIdRef = useRef<number | null>(null);

  const [scrollState, setScrollState] = useState<ScrollState>({
    scrollY: 0,
    progress: 0,
    currentSection: 0,
    direction: 'down',
    velocity: 0,
    sectionProgress: 0,
    previousSection: 0
  });

  // Velocity smoothing parameters
  const VELOCITY_HISTORY_SIZE = 5;
  const VELOCITY_SMOOTHING_FACTOR = 0.8;

  const calculateVelocity = useCallback((currentScroll: number, timestamp: number): number => {
    if (lastScrollTimeRef.current === 0) {
      lastScrollTimeRef.current = timestamp;
      lastScrollYRef.current = currentScroll;
      return 0;
    }

    const deltaTime = timestamp - lastScrollTimeRef.current;
    const deltaScroll = currentScroll - lastScrollYRef.current;
    
    if (deltaTime === 0) return velocityRef.current;

    const instantVelocity = Math.abs(deltaScroll) / deltaTime;
    
    // Add to velocity history for smoothing
    velocityHistoryRef.current.push(instantVelocity);
    if (velocityHistoryRef.current.length > VELOCITY_HISTORY_SIZE) {
      velocityHistoryRef.current.shift();
    }

    // Calculate smoothed velocity
    const avgVelocity = velocityHistoryRef.current.reduce((sum, v) => sum + v, 0) / velocityHistoryRef.current.length;
    const smoothedVelocity = velocityRef.current * VELOCITY_SMOOTHING_FACTOR + avgVelocity * (1 - VELOCITY_SMOOTHING_FACTOR);

    lastScrollTimeRef.current = timestamp;
    lastScrollYRef.current = currentScroll;
    velocityRef.current = smoothedVelocity;

    return smoothedVelocity;
  }, []);

  const calculateSectionProgress = useCallback((globalProgress: number, currentSection: number, totalSections: number): number => {
    const sectionSize = 1 / totalSections;
    const sectionStart = currentSection * sectionSize;
    const progressWithinSection = (globalProgress - sectionStart) / sectionSize;
    return Math.max(0, Math.min(1, progressWithinSection));
  }, []);

  useEffect(() => {
    // Enhanced Lenis configuration for cinematic scrolling
    const lenis = new Lenis({
      duration: 1.4,
      easing: (t) => {
        // Custom easing for more cinematic feel
        return t < 0.5 
          ? 4 * t * t * t 
          : 1 - Math.pow(-2 * t + 2, 3) / 2;
      },
      direction: 'vertical',
      gestureDirection: 'vertical',
      smooth: true,
      mouseMultiplier: 1.2,
      smoothTouch: false,
      touchMultiplier: 1.8,
      infinite: false,
      wheelMultiplier: 1.1,
    });

    lenisRef.current = lenis;

    let previousScrollY = 0;
    let previousSection = 0;

    const onScroll = (e: { scroll: number; velocity: number }) => {
      const timestamp = performance.now();
      const { scroll } = e;
      
      const direction = scroll > previousScrollY ? 'down' : 'up';
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progress = Math.min(scroll / maxScroll, 1);
      const currentSection = Math.floor(progress * totalSections);
      const clampedSection = Math.min(currentSection, totalSections - 1);
      
      // Calculate velocity with smoothing
      const velocity = calculateVelocity(scroll, timestamp);
      
      // Calculate section-specific progress
      const sectionProgress = calculateSectionProgress(progress, clampedSection, totalSections);

      setScrollState(prevState => ({
        scrollY: scroll,
        progress,
        currentSection: clampedSection,
        direction,
        velocity,
        sectionProgress,
        previousSection: prevState.currentSection !== clampedSection ? prevState.currentSection : previousSection
      }));

      previousScrollY = scroll;
      if (previousSection !== clampedSection) {
        previousSection = clampedSection;
      }
    };

    lenis.on('scroll', onScroll);

    // Enhanced RAF loop with performance monitoring
    const raf = (time: number) => {
      lenis.raf(time);
      rafIdRef.current = requestAnimationFrame(raf);
    };

    rafIdRef.current = requestAnimationFrame(raf);

    // Handle resize events
    const handleResize = () => {
      lenis.resize();
    };

    window.addEventListener('resize', handleResize);

    // Handle visibility change for performance
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
        }
        lenis.stop();
      } else {
        rafIdRef.current = requestAnimationFrame(raf);
        lenis.start();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      lenis.destroy();
    };
  }, [totalSections, calculateVelocity, calculateSectionProgress]);

  const scrollToSection = useCallback((section: number, immediate: boolean = false) => {
    if (lenisRef.current) {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const sectionProgress = section / totalSections;
      const targetScroll = sectionProgress * maxScroll;
      
      if (immediate) {
        lenisRef.current.scrollTo(targetScroll, { immediate: true });
      } else {
        lenisRef.current.scrollTo(targetScroll, {
          duration: 2,
          easing: (t: number) => 1 - Math.pow(1 - t, 4)
        });
      }
    }
  }, [totalSections]);

  const scrollToProgress = useCallback((targetProgress: number, immediate: boolean = false) => {
    if (lenisRef.current) {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const targetScroll = targetProgress * maxScroll;
      
      if (immediate) {
        lenisRef.current.scrollTo(targetScroll, { immediate: true });
      } else {
        lenisRef.current.scrollTo(targetScroll, {
          duration: 1.5,
          easing: (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
        });
      }
    }
  }, []);

  const pause = useCallback(() => {
    lenisRef.current?.stop();
  }, []);

  const resume = useCallback(() => {
    lenisRef.current?.start();
  }, []);

  const getCurrentVelocity = useCallback((): number => {
    return velocityRef.current;
  }, []);

  const isScrolling = useCallback((): boolean => {
    return velocityRef.current > 0.01;
  }, []);

  return {
    scrollState,
    scrollToSection,
    scrollToProgress,
    pause,
    resume,
    getCurrentVelocity,
    isScrolling,
    lenis: lenisRef.current
  };
};