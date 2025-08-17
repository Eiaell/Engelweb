'use client';

import { useEffect, useCallback, useState } from 'react';

export interface LoadingScrollOptions {
  enableDuringLoading?: boolean;
  smoothTransition?: boolean;
  transitionDuration?: number;
}

export const useLoadingScroll = (
  isLoading: boolean,
  options: LoadingScrollOptions = {}
) => {
  const {
    enableDuringLoading = false,
    smoothTransition = true,
    transitionDuration = 800
  } = options;

  const [scrollLocked, setScrollLocked] = useState(false);
  const [lenisInstance, setLenisInstance] = useState<any>(null);

  // Initialize Lenis if available
  useEffect(() => {
    // Check if Lenis is available globally (if already initialized)
    if (typeof window !== 'undefined' && (window as any).lenis) {
      setLenisInstance((window as any).lenis);
    }
  }, []);

  // Lock/unlock scroll based on loading state
  const toggleScrollLock = useCallback((lock: boolean) => {
    if (typeof window === 'undefined') return;

    const body = document.body;
    const html = document.documentElement;

    if (lock) {
      // Store current scroll position
      const scrollY = window.scrollY;
      
      // Lock scroll
      body.style.position = 'fixed';
      body.style.top = `-${scrollY}px`;
      body.style.width = '100%';
      body.style.overflow = 'hidden';
      
      // Disable Lenis if available
      if (lenisInstance && typeof lenisInstance.stop === 'function') {
        lenisInstance.stop();
      }
      
      setScrollLocked(true);
      console.log('🔒 Scroll locked during loading');
    } else {
      // Get the stored scroll position
      const scrollY = Math.abs(parseInt(body.style.top || '0'));
      
      // Unlock scroll
      body.style.position = '';
      body.style.top = '';
      body.style.width = '';
      body.style.overflow = '';
      
      // Restore scroll position
      if (smoothTransition) {
        // Smooth scroll to previous position
        window.scrollTo({
          top: scrollY,
          behavior: 'smooth'
        });
      } else {
        window.scrollTo(0, scrollY);
      }
      
      // Re-enable Lenis if available
      if (lenisInstance && typeof lenisInstance.start === 'function') {
        setTimeout(() => {
          lenisInstance.start();
          console.log('🚀 Lenis scroll re-enabled');
        }, smoothTransition ? transitionDuration : 0);
      }
      
      setScrollLocked(false);
      console.log('🔓 Scroll unlocked after loading');
    }
  }, [lenisInstance, smoothTransition, transitionDuration]);

  // Handle loading state changes
  useEffect(() => {
    if (!enableDuringLoading) {
      if (isLoading && !scrollLocked) {
        toggleScrollLock(true);
      } else if (!isLoading && scrollLocked) {
        // Delay unlock to allow for loading animations to complete
        setTimeout(() => {
          toggleScrollLock(false);
        }, smoothTransition ? transitionDuration / 2 : 0);
      }
    }
  }, [isLoading, scrollLocked, enableDuringLoading, toggleScrollLock, transitionDuration, smoothTransition]);

  // Progressive scroll enable for cinematic experience
  const enableProgressiveScroll = useCallback((progress: number) => {
    if (typeof window === 'undefined' || !lenisInstance) return;

    // Gradually enable scroll based on loading progress
    if (progress > 0.8 && scrollLocked) {
      // Start allowing limited scroll when 80% loaded
      const body = document.body;
      body.style.overflow = 'hidden auto';
      
      if (typeof lenisInstance.start === 'function') {
        lenisInstance.start();
        // Reduce scroll sensitivity during transition
        if (typeof lenisInstance.setOptions === 'function') {
          lenisInstance.setOptions({ 
            lerp: 0.05, // Slower scroll interpolation
            multiplier: 0.5 // Reduced scroll speed
          });
        }
      }
    } else if (progress >= 1 && scrollLocked) {
      // Full scroll restore when completely loaded
      setTimeout(() => {
        toggleScrollLock(false);
        
        // Restore normal scroll settings
        if (lenisInstance && typeof lenisInstance.setOptions === 'function') {
          lenisInstance.setOptions({ 
            lerp: 0.1, // Normal scroll interpolation
            multiplier: 1 // Normal scroll speed
          });
        }
      }, transitionDuration);
    }
  }, [lenisInstance, scrollLocked, toggleScrollLock, transitionDuration]);

  // Manual scroll control
  const manualScrollTo = useCallback((target: number | string | Element, options?: unknown) => {
    if (scrollLocked) {
      console.warn('Scroll is locked - cannot scroll to target');
      return;
    }

    if (lenisInstance && typeof lenisInstance.scrollTo === 'function') {
      lenisInstance.scrollTo(target, options);
    } else {
      // Fallback to native scroll
      if (typeof target === 'number') {
        window.scrollTo({
          top: target,
          behavior: 'smooth',
          ...options
        });
      }
    }
  }, [lenisInstance, scrollLocked]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrollLocked) {
        toggleScrollLock(false);
      }
    };
  }, [scrollLocked, toggleScrollLock]);

  return {
    scrollLocked,
    lenisInstance,
    enableProgressiveScroll,
    manualScrollTo,
    toggleScrollLock
  };
};