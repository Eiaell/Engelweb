'use client';

import { useRef, useEffect, useCallback, useMemo } from 'react';
import { gsap } from 'gsap';
import { ScrollState, TextRevealConfig } from '@/types';

interface TextRevealOptions {
  enableStagger: boolean;
  performance: 'high' | 'medium' | 'low';
  enableMagnetic: boolean;
}

export const useScrollTextReveal = (
  scrollState: ScrollState,
  textConfigs: TextRevealConfig[],
  options: TextRevealOptions = {
    enableStagger: true,
    performance: 'high',
    enableMagnetic: true
  }
) => {
  const timelineRef = useRef<gsap.core.Timeline>();
  const elementRefs = useRef<Map<string, HTMLElement>>(new Map());
  const animationStatesRef = useRef<Map<string, {
    isAnimating: boolean;
    progress: number;
    hasTriggered: boolean;
  }>>(new Map());
  
  // Performance monitoring
  const performanceRef = useRef({
    lastUpdateTime: 0,
    frameCount: 0,
    adaptiveQuality: true
  });

  // Text splitting utilities
  const splitTextIntoElements = useCallback((
    element: HTMLElement, 
    variant: TextRevealConfig['variant']
  ): HTMLElement[] => {
    const originalText = element.textContent || '';
    const elements: HTMLElement[] = [];

    switch (variant) {
      case 'splitWords':
        const words = originalText.split(' ');
        element.innerHTML = '';
        
        words.forEach((word, index) => {
          const span = document.createElement('span');
          span.textContent = word + (index < words.length - 1 ? ' ' : '');
          span.style.display = 'inline-block';
          span.style.overflow = 'hidden';
          span.style.position = 'relative';
          
          // Create inner span for animation
          const inner = document.createElement('span');
          inner.textContent = span.textContent;
          inner.style.display = 'inline-block';
          inner.style.transform = 'translateY(100%)';
          
          span.textContent = '';
          span.appendChild(inner);
          element.appendChild(span);
          elements.push(inner);
        });
        break;

      case 'typewriter':
        // For typewriter, we'll animate character by character
        const chars = originalText.split('');
        element.innerHTML = '';
        
        chars.forEach((char) => {
          const span = document.createElement('span');
          span.textContent = char === ' ' ? '\u00A0' : char; // Non-breaking space
          span.style.opacity = '0';
          element.appendChild(span);
          elements.push(span);
        });
        break;

      default:
        // For fade and slideUp, use the element itself
        elements.push(element);
        break;
    }

    return elements;
  }, []);

  // Magnetic hover effect
  const addMagneticEffect = useCallback((element: HTMLElement) => {
    if (!options.enableMagnetic || options.performance === 'low') return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      
      const strength = options.performance === 'high' ? 0.3 : 0.15;
      
      gsap.to(element, {
        x: x * strength,
        y: y * strength,
        duration: 0.3,
        ease: 'power2.out'
      });
    };

    const handleMouseLeave = () => {
      gsap.to(element, {
        x: 0,
        y: 0,
        duration: 0.5,
        ease: 'elastic.out(1, 0.5)'
      });
    };

    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [options.enableMagnetic, options.performance]);

  // Animation variants
  const animateElement = useCallback((
    config: TextRevealConfig,
    element: HTMLElement,
    sectionProgress: number
  ) => {
    const state = animationStatesRef.current.get(config.id);
    if (!state) return;

    // Check if we should trigger the animation
    const shouldAnimate = sectionProgress >= config.progress && !state.hasTriggered;
    const shouldReverse = sectionProgress < config.progress && state.hasTriggered;

    if (!shouldAnimate && !shouldReverse) return;

    state.isAnimating = true;
    animationStatesRef.current.set(config.id, state);

    const elements = splitTextIntoElements(element, config.variant);
    let timeline: gsap.core.Timeline;

    switch (config.variant) {
      case 'fade':
        timeline = gsap.timeline({
          onComplete: () => {
            state.isAnimating = false;
            state.hasTriggered = shouldAnimate;
            animationStatesRef.current.set(config.id, state);
          }
        });

        if (shouldAnimate) {
          gsap.set(element, { opacity: 0 });
          timeline.to(element, {
            opacity: 1,
            duration: config.duration,
            delay: config.delay,
            ease: 'power2.out'
          });
        } else {
          timeline.to(element, {
            opacity: 0,
            duration: config.duration * 0.5,
            ease: 'power2.in'
          });
        }
        break;

      case 'slideUp':
        timeline = gsap.timeline({
          onComplete: () => {
            state.isAnimating = false;
            state.hasTriggered = shouldAnimate;
            animationStatesRef.current.set(config.id, state);
          }
        });

        if (shouldAnimate) {
          gsap.set(element, { y: 50, opacity: 0 });
          timeline.to(element, {
            y: 0,
            opacity: 1,
            duration: config.duration,
            delay: config.delay,
            ease: 'power3.out'
          });
        } else {
          timeline.to(element, {
            y: 30,
            opacity: 0,
            duration: config.duration * 0.5,
            ease: 'power2.in'
          });
        }
        break;

      case 'splitWords':
        timeline = gsap.timeline({
          onComplete: () => {
            state.isAnimating = false;
            state.hasTriggered = shouldAnimate;
            animationStatesRef.current.set(config.id, state);
          }
        });

        if (shouldAnimate) {
          timeline.to(elements, {
            y: 0,
            duration: config.duration,
            delay: config.delay,
            ease: 'power3.out',
            stagger: options.enableStagger ? (config.stagger || 0.1) : 0
          });
        } else {
          timeline.to(elements, {
            y: '100%',
            duration: config.duration * 0.5,
            ease: 'power2.in',
            stagger: options.enableStagger ? (config.stagger || 0.05) : 0
          });
        }
        break;

      case 'typewriter':
        timeline = gsap.timeline({
          onComplete: () => {
            state.isAnimating = false;
            state.hasTriggered = shouldAnimate;
            animationStatesRef.current.set(config.id, state);
          }
        });

        if (shouldAnimate) {
          // Add cursor effect
          const cursor = document.createElement('span');
          cursor.textContent = '|';
          cursor.className = 'animate-pulse';
          cursor.style.color = '#ff6b6b';
          element.appendChild(cursor);

          timeline.to(elements, {
            opacity: 1,
            duration: 0.03,
            delay: config.delay,
            stagger: 0.03,
            onComplete: () => cursor.remove()
          });
        } else {
          timeline.to(elements, {
            opacity: 0,
            duration: 0.01,
            stagger: 0.01
          });
        }
        break;

      case 'magneticHover':
        timeline = gsap.timeline({
          onComplete: () => {
            state.isAnimating = false;
            state.hasTriggered = shouldAnimate;
            animationStatesRef.current.set(config.id, state);
            
            // Add magnetic effect after animation
            if (shouldAnimate) {
              addMagneticEffect(element);
            }
          }
        });

        if (shouldAnimate) {
          gsap.set(element, { opacity: 0, scale: 0.8 });
          timeline.to(element, {
            opacity: 1,
            scale: 1,
            duration: config.duration,
            delay: config.delay,
            ease: 'elastic.out(1, 0.5)'
          });
        } else {
          timeline.to(element, {
            opacity: 0,
            scale: 0.8,
            duration: config.duration * 0.5,
            ease: 'power2.in'
          });
        }
        break;
    }
  }, [addMagneticEffect, options.enableStagger, splitTextIntoElements]);

  // Register text element
  const registerElement = useCallback((id: string, element: HTMLElement) => {
    elementRefs.current.set(id, element);
    animationStatesRef.current.set(id, {
      isAnimating: false,
      progress: 0,
      hasTriggered: false
    });
  }, []);

  // Unregister text element
  const unregisterElement = useCallback((id: string) => {
    elementRefs.current.delete(id);
    animationStatesRef.current.delete(id);
  }, []);

  // Update animations based on scroll
  const updateAnimations = useCallback(() => {
    const now = performance.now();
    
    // Throttle updates based on performance mode
    const updateInterval = options.performance === 'low' ? 33.33 : // 30 FPS
                          options.performance === 'medium' ? 20 : // 50 FPS
                          16.67; // 60 FPS

    if (now - performanceRef.current.lastUpdateTime < updateInterval) {
      return;
    }

    performanceRef.current.lastUpdateTime = now;
    performanceRef.current.frameCount++;

    textConfigs.forEach((config) => {
      const element = elementRefs.current.get(config.id);
      if (!element) return;

      animateElement(config, element, scrollState.sectionProgress);
    });
  }, [textConfigs, scrollState.sectionProgress, animateElement, options.performance]);

  // Update on scroll changes
  useEffect(() => {
    updateAnimations();
  }, [updateAnimations]);

  // Cleanup
  useEffect(() => {
    return () => {
      timelineRef.current?.kill();
      elementRefs.current.clear();
      animationStatesRef.current.clear();
    };
  }, []);

  // Public API
  const triggerAnimation = useCallback((id: string, force: boolean = false) => {
    const config = textConfigs.find(c => c.id === id);
    const element = elementRefs.current.get(id);
    const state = animationStatesRef.current.get(id);
    
    if (!config || !element || !state) return;

    if (force) {
      state.hasTriggered = false;
      animationStatesRef.current.set(id, state);
    }

    animateElement(config, element, 1); // Force trigger
  }, [textConfigs, animateElement]);

  const resetAnimation = useCallback((id: string) => {
    const element = elementRefs.current.get(id);
    const state = animationStatesRef.current.get(id);
    
    if (!element || !state) return;

    // Reset element state
    gsap.set(element, { clearProps: 'all' });
    
    // Reset animation state
    state.hasTriggered = false;
    state.isAnimating = false;
    state.progress = 0;
    animationStatesRef.current.set(id, state);
  }, []);

  const setPerformanceMode = useCallback((mode: 'high' | 'medium' | 'low') => {
    options.performance = mode;
  }, [options]);

  const getAnimationState = useCallback((id: string) => {
    return animationStatesRef.current.get(id) || {
      isAnimating: false,
      progress: 0,
      hasTriggered: false
    };
  }, []);

  return {
    registerElement,
    unregisterElement,
    triggerAnimation,
    resetAnimation,
    setPerformanceMode,
    getAnimationState,
    currentFPS: performanceRef.current.frameCount
  };
};

/**
 * React component wrapper for text reveal animations
 */
export interface ScrollTextRevealProps {
  children: React.ReactNode;
  config: TextRevealConfig;
  className?: string;
  style?: React.CSSProperties;
}

export const ScrollTextReveal: React.FC<ScrollTextRevealProps> = ({
  children,
  config,
  className = '',
  style = {}
}) => {
  const elementRef = useRef<HTMLDivElement>(null);
  
  // This would need to be provided by a context provider
  // const { registerElement, unregisterElement } = useScrollTextReveal(...);

  useEffect(() => {
    if (elementRef.current) {
      // registerElement(config.id, elementRef.current);
      
      return () => {
        // unregisterElement(config.id);
      };
    }
  }, [config.id]);

  return (
    <div
      ref={elementRef}
      data-text-reveal={config.id}
      className={className}
      style={style}
    >
      {children}
    </div>
  );
};