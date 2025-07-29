'use client';

import { ScrollAnimation, SectionName } from '@/types';

/**
 * Enterprise-grade section animation configurations
 * Based on Daryaft's award-winning scroll-controlled experience
 * Optimized for 60fps on mid-range hardware (i5-11400F, 16GB RAM)
 */

export const SECTION_ANIMATIONS: ScrollAnimation[] = [
  // Section 1: Identity (0-16.67% scroll)
  {
    sectionId: 0,
    name: 'identity' as SectionName,
    scrollRange: [0, 0.1667],
    transitionDuration: 1000,
    cameraKeyframes: [
      {
        progress: 0,
        position: [0, 0, 8],
        rotation: [0, 0, 0],
        fov: 75,
        duration: 2,
        ease: 'power2.inOut'
      },
      {
        progress: 0.5,
        position: [0, 0, 6],
        rotation: [0, 0, 0],
        fov: 65,
        duration: 1.5,
        ease: 'power2.out'
      },
      {
        progress: 1,
        position: [0, 0, 5],
        rotation: [0, 0, 0],
        fov: 60,
        duration: 1,
        ease: 'power2.inOut',
        shake: {
          intensity: 0.02,
          duration: 0.3
        }
      }
    ],
    sceneAnimations: [
      {
        target: 'identity-circle',
        property: 'rotation.z',
        from: 0,
        to: Math.PI * 2,
        progress: [0, 1],
        duration: 3,
        ease: 'none'
      },
      {
        target: 'identity-particles',
        property: 'opacity',
        from: 0,
        to: 0.6,
        progress: [0.3, 0.8],
        duration: 1.5,
        ease: 'power2.out'
      },
      {
        target: 'identity-glow',
        property: 'intensity',
        from: 0,
        to: 1.2,
        progress: [0.4, 1],
        duration: 2,
        ease: 'power2.out'
      }
    ],
    textRevealTiming: [
      {
        id: 'identity-title',
        progress: 0.1,
        duration: 0.8,
        delay: 0,
        variant: 'splitWords',
        stagger: 0.15
      },
      {
        id: 'identity-subtitle',
        progress: 0.3,
        duration: 0.6,
        delay: 0.2,
        variant: 'fade'
      },
      {
        id: 'identity-description',
        progress: 0.5,
        duration: 1.2,
        delay: 0.4,
        variant: 'typewriter'
      }
    ],
    particleSystem: {
      count: 800,
      size: [0.01, 0.03],
      speed: [0.5, 1.5],
      opacity: [0.2, 0.8],
      color: '#ff6b6b',
      activationProgress: [0.2, 0.9]
    }
  },

  // Section 2: Origin (16.67-33.33% scroll)
  {
    sectionId: 1,
    name: 'origin' as SectionName,
    scrollRange: [0.1667, 0.3333],
    transitionDuration: 1200,
    cameraKeyframes: [
      {
        progress: 0,
        position: [-3, 2, 7],
        rotation: [-0.2, -0.3, 0],
        fov: 70,
        duration: 1.5,
        ease: 'power2.inOut'
      },
      {
        progress: 0.5,
        position: [0, 4, 8],
        rotation: [-0.4, 0, 0],
        fov: 80,
        duration: 2,
        ease: 'power2.out',
        lookAt: [0, 0, 0]
      },
      {
        progress: 1,
        position: [3, 2, 7],
        rotation: [-0.2, 0.3, 0],
        fov: 70,
        duration: 1.5,
        ease: 'power2.inOut'
      }
    ],
    sceneAnimations: [
      {
        target: 'map-puno',
        property: 'position.x',
        from: -5,
        to: -1.5,
        progress: [0, 0.6],
        duration: 2,
        ease: 'power3.out'
      },
      {
        target: 'map-appenweier',
        property: 'position.x',
        from: 5,
        to: 1.5,
        progress: [0, 0.6],
        duration: 2,
        ease: 'power3.out'
      },
      {
        target: 'map-connection-line',
        property: 'scale.x',
        from: 0,
        to: 1,
        progress: [0.4, 0.8],
        duration: 1.5,
        ease: 'power2.out'
      },
      {
        target: 'heritage-symbols',
        property: 'opacity',
        from: 0,
        to: 1,
        progress: [0.6, 1],
        duration: 1,
        ease: 'power2.out',
        stagger: 0.2
      }
    ],
    textRevealTiming: [
      {
        id: 'origin-title',
        progress: 0.1,
        duration: 0.8,
        delay: 0,
        variant: 'slideUp'
      },
      {
        id: 'origin-puno',
        progress: 0.3,
        duration: 0.6,
        delay: 0.1,
        variant: 'fade'
      },
      {
        id: 'origin-appenweier',
        progress: 0.5,
        duration: 0.6,
        delay: 0.2,
        variant: 'fade'
      },
      {
        id: 'origin-narrative',
        progress: 0.7,
        duration: 1,
        delay: 0.3,
        variant: 'splitWords',
        stagger: 0.1
      }
    ]
  },

  // Section 3: Mission (33.33-50% scroll)
  {
    sectionId: 2,
    name: 'mission' as SectionName,
    scrollRange: [0.3333, 0.5],
    transitionDuration: 1000,
    cameraKeyframes: [
      {
        progress: 0,
        position: [0, 0, 10],
        rotation: [0, 0, 0],
        fov: 60,
        duration: 2,
        ease: 'power2.inOut'
      },
      {
        progress: 0.5,
        position: [6, 3, 8],
        rotation: [-0.3, 0.8, 0.1],
        fov: 50,
        duration: 2,
        ease: 'power2.out'
      },
      {
        progress: 1,
        position: [-6, 3, 8],
        rotation: [-0.3, -0.8, -0.1],
        fov: 50,
        duration: 2,
        ease: 'power2.inOut'
      }
    ],
    sceneAnimations: [
      {
        target: 'gear-main',
        property: 'rotation.z',
        from: 0,
        to: Math.PI * 4,
        progress: [0, 1],
        duration: 4,
        ease: 'none'
      },
      {
        target: 'gear-secondary',
        property: 'rotation.z',
        from: 0,
        to: -Math.PI * 6,
        progress: [0, 1],
        duration: 4,
        ease: 'none'
      },
      {
        target: 'invisible-mechanisms',
        property: 'opacity',
        from: 0,
        to: 0.3,
        progress: [0.2, 0.8],
        duration: 2,
        ease: 'power2.out',
        stagger: 0.15
      },
      {
        target: 'system-wireframe',
        property: 'strokeDashoffset',
        from: 1000,
        to: 0,
        progress: [0.4, 1],
        duration: 2.5,
        ease: 'power2.out'
      }
    ],
    textRevealTiming: [
      {
        id: 'mission-title',
        progress: 0.1,
        duration: 0.8,
        delay: 0,
        variant: 'magneticHover'
      },
      {
        id: 'mission-principle-1',
        progress: 0.25,
        duration: 0.6,
        delay: 0.1,
        variant: 'slideUp'
      },
      {
        id: 'mission-principle-2',
        progress: 0.5,
        duration: 0.6,
        delay: 0.2,
        variant: 'slideUp'
      },
      {
        id: 'mission-principle-3',
        progress: 0.75,
        duration: 0.6,
        delay: 0.3,
        variant: 'slideUp'
      }
    ]
  },

  // Section 4: Present (50-66.67% scroll)
  {
    sectionId: 3,
    name: 'present' as SectionName,
    scrollRange: [0.5, 0.6667],
    transitionDuration: 1100,
    cameraKeyframes: [
      {
        progress: 0,
        position: [0, 2, 12],
        rotation: [-0.15, 0, 0],
        fov: 75,
        duration: 1.5,
        ease: 'power2.inOut'
      },
      {
        progress: 0.5,
        position: [4, 1, 8],
        rotation: [-0.1, 0.4, 0],
        fov: 65,
        duration: 2,
        ease: 'power2.out'
      },
      {
        progress: 1,
        position: [-2, 3, 10],
        rotation: [-0.2, -0.2, 0],
        fov: 70,
        duration: 1.5,
        ease: 'power2.inOut'
      }
    ],
    sceneAnimations: [
      {
        target: 'data-river-main',
        property: 'position.z',
        from: -10,
        to: 10,
        progress: [0, 1],
        duration: 6,
        ease: 'none'
      },
      {
        target: 'data-river-secondary',
        property: 'position.z',
        from: -15,
        to: 15,
        progress: [0.1, 1],
        duration: 7,
        ease: 'none'
      },
      {
        target: 'tool-icons',
        property: 'scale',
        from: 0,
        to: 1,
        progress: [0.3, 0.8],
        duration: 1.5,
        ease: 'back.out(1.7)',
        stagger: 0.1
      },
      {
        target: 'capability-nodes',
        property: 'opacity',
        from: 0,
        to: 1,
        progress: [0.5, 1],
        duration: 2,
        ease: 'power2.out',
        stagger: 0.2
      }
    ],
    textRevealTiming: [
      {
        id: 'present-title',
        progress: 0.1,
        duration: 0.8,
        delay: 0,
        variant: 'splitWords'
      },
      {
        id: 'present-tools-list',
        progress: 0.3,
        duration: 1.2,
        delay: 0.2,
        variant: 'slideUp',
        stagger: 0.1
      },
      {
        id: 'present-capabilities',
        progress: 0.6,
        duration: 1,
        delay: 0.3,
        variant: 'fade'
      }
    ],
    particleSystem: {
      count: 1200,
      size: [0.005, 0.02],
      speed: [1, 3],
      opacity: [0.3, 0.7],
      color: '#4ecdc4',
      activationProgress: [0.2, 1]
    }
  },

  // Section 5: Vision (66.67-83.33% scroll)
  {
    sectionId: 4,
    name: 'vision' as SectionName,
    scrollRange: [0.6667, 0.8333],
    transitionDuration: 1300,
    cameraKeyframes: [
      {
        progress: 0,
        position: [0, 8, 15],
        rotation: [-0.5, 0, 0],
        fov: 90,
        duration: 2,
        ease: 'power2.inOut'
      },
      {
        progress: 0.5,
        position: [10, 12, 20],
        rotation: [-0.6, 0.3, 0],
        fov: 100,
        duration: 2.5,
        ease: 'power2.out'
      },
      {
        progress: 1,
        position: [0, 15, 25],
        rotation: [-0.7, 0, 0],
        fov: 110,
        duration: 2,
        ease: 'power2.inOut'
      }
    ],
    sceneAnimations: [
      {
        target: 'city-modules',
        property: 'scale',
        from: 0.1,
        to: 1,
        progress: [0, 0.7],
        duration: 3,
        ease: 'power3.out',
        stagger: 0.1
      },
      {
        target: 'connection-lines',
        property: 'strokeDashoffset',
        from: 500,
        to: 0,
        progress: [0.3, 0.9],
        duration: 2.5,
        ease: 'power2.out',
        stagger: 0.05
      },
      {
        target: 'expansion-waves',
        property: 'scale',
        from: 0,
        to: 3,
        progress: [0.5, 1],
        duration: 2,
        ease: 'power2.out'
      },
      {
        target: 'future-elements',
        property: 'opacity',
        from: 0,
        to: 0.8,
        progress: [0.6, 1],
        duration: 1.5,
        ease: 'power2.out',
        stagger: 0.1
      }
    ],
    textRevealTiming: [
      {
        id: 'vision-title',
        progress: 0.1,
        duration: 1,
        delay: 0,
        variant: 'magneticHover'
      },
      {
        id: 'vision-description',
        progress: 0.3,
        duration: 1.5,
        delay: 0.2,
        variant: 'typewriter'
      },
      {
        id: 'vision-future-points',
        progress: 0.6,
        duration: 1.2,
        delay: 0.3,
        variant: 'splitWords',
        stagger: 0.15
      }
    ]
  },

  // Section 6: CTA (83.33-100% scroll)
  {
    sectionId: 5,
    name: 'cta' as SectionName,
    scrollRange: [0.8333, 1],
    transitionDuration: 800,
    cameraKeyframes: [
      {
        progress: 0,
        position: [0, 0, 8],
        rotation: [0, 0, 0],
        fov: 60,
        duration: 1.5,
        ease: 'power2.inOut'
      },
      {
        progress: 0.5,
        position: [0, 0, 6],
        rotation: [0, 0, 0],
        fov: 50,
        duration: 1,
        ease: 'power2.out'
      },
      {
        progress: 1,
        position: [0, 0, 5],
        rotation: [0, 0, 0],
        fov: 45,
        duration: 1,
        ease: 'power2.inOut'
      }
    ],
    sceneAnimations: [
      {
        target: 'cta-ambient',
        property: 'opacity',
        from: 0,
        to: 0.4,
        progress: [0, 0.5],
        duration: 2,
        ease: 'power2.out'
      },
      {
        target: 'conversation-bubble',
        property: 'scale',
        from: 0,
        to: 1,
        progress: [0.3, 0.7],
        duration: 1.5,
        ease: 'elastic.out(1, 0.5)'
      },
      {
        target: 'breathing-animation',
        property: 'scale',
        from: 0.98,
        to: 1.02,
        progress: [0.5, 1],
        duration: 3,
        ease: 'power1.inOut'
      }
    ],
    textRevealTiming: [
      {
        id: 'cta-title',
        progress: 0.2,
        duration: 0.8,
        delay: 0,
        variant: 'magneticHover'
      },
      {
        id: 'cta-message',
        progress: 0.4,
        duration: 1,
        delay: 0.2,
        variant: 'fade'
      },
      {
        id: 'cta-button',
        progress: 0.7,
        duration: 0.6,
        delay: 0.3,
        variant: 'slideUp'
      }
    ]
  }
];

/**
 * Performance-optimized animation configurations
 * Automatically adjusts based on hardware capabilities
 */
export const getOptimizedAnimations = (performanceLevel: 'high' | 'medium' | 'low'): ScrollAnimation[] => {
  return SECTION_ANIMATIONS.map(animation => {
    const optimized = { ...animation };
    
    switch (performanceLevel) {
      case 'low':
        // Reduce particle counts and simplify animations
        if (optimized.particleSystem) {
          optimized.particleSystem.count = Math.floor(optimized.particleSystem.count * 0.3);
        }
        optimized.sceneAnimations = optimized.sceneAnimations.filter(
          anim => !anim.target.includes('particle') && !anim.target.includes('glow')
        );
        break;
        
      case 'medium':
        // Moderate optimization
        if (optimized.particleSystem) {
          optimized.particleSystem.count = Math.floor(optimized.particleSystem.count * 0.6);
        }
        break;
        
      case 'high':
      default:
        // No optimization needed
        break;
    }
    
    return optimized;
  });
};

/**
 * Mobile-specific animation configurations
 * Simplified for touch devices and lower performance
 */
export const getMobileAnimations = (): ScrollAnimation[] => {
  return getOptimizedAnimations('low').map(animation => ({
    ...animation,
    transitionDuration: animation.transitionDuration * 0.7, // Faster transitions
    cameraKeyframes: animation.cameraKeyframes.map(keyframe => ({
      ...keyframe,
      shake: undefined // Remove camera shake on mobile
    })),
    particleSystem: undefined // No particles on mobile
  }));
};