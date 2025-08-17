'use client';

import { gsap } from 'gsap';
import { 
  ScrollAnimation, 
  ScrollState, 
  PerformanceMetrics,
  AnimationQuality,
  CameraKeyframe,
  SceneAnimation,
  TextRevealConfig
} from '@/types';

export class ScrollAnimationOrchestrator {
  private masterTimeline: gsap.core.Timeline;
  private sectionTimelines: Map<number, gsap.core.Timeline>;
  private currentSection: number = 0;
  private isAnimating: boolean = false;
  private performanceMode: AnimationQuality;
  private rafId: number | null = null;
  private velocity: number = 0;
  private lastScrollTime: number = 0;
  private lastScrollY: number = 0;

  // Animation frame rate limiting
  private targetFPS: number = 60;
  private frameInterval: number = 1000 / this.targetFPS;
  private lastFrameTime: number = 0;

  // Performance monitoring
  private frameCount: number = 0;
  private fpsUpdateInterval: number = 1000; // Update FPS every second
  private lastFpsUpdate: number = 0;
  private currentFPS: number = 60;

  constructor(
    private animations: ScrollAnimation[],
    private onSectionChange?: (section: number) => void,
    private onPerformanceUpdate?: (metrics: PerformanceMetrics) => void
  ) {
    this.masterTimeline = gsap.timeline({ paused: true });
    this.sectionTimelines = new Map();
    this.performanceMode = this.getOptimalQuality();
    
    this.initializeTimelines();
    this.startPerformanceMonitoring();
  }

  private getOptimalQuality(): AnimationQuality {
    // Detect hardware capabilities and set appropriate quality
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
      return {
        particles: false,
        shadows: false,
        postProcessing: false,
        lodLevel: 2,
        textureResolution: 256
      };
    }

    // Basic GPU detection
    const renderer = gl.getParameter(gl.RENDERER);
    const isHighEnd = renderer.includes('RTX') || renderer.includes('RX 6') || renderer.includes('RX 7');
    const isMidRange = renderer.includes('GTX') || renderer.includes('RX 5');

    if (isHighEnd) {
      return {
        particles: true,
        shadows: true,
        postProcessing: true,
        lodLevel: 0,
        textureResolution: 1024
      };
    } else if (isMidRange) {
      return {
        particles: true,
        shadows: false,
        postProcessing: false,
        lodLevel: 1,
        textureResolution: 512
      };
    } else {
      return {
        particles: false,
        shadows: false,
        postProcessing: false,
        lodLevel: 2,
        textureResolution: 256
      };
    }
  }

  private initializeTimelines(): void {
    this.animations.forEach((animation, index) => {
      const sectionTimeline = gsap.timeline({ paused: true });
      
      // Add camera animations
      this.addCameraAnimations(sectionTimeline, animation.cameraKeyframes);
      
      // Add scene animations
      this.addSceneAnimations(sectionTimeline, animation.sceneAnimations);
      
      // Add text reveal animations
      this.addTextAnimations(sectionTimeline, animation.textRevealTiming);
      
      this.sectionTimelines.set(index, sectionTimeline);
      
      // Add to master timeline
      const sectionProgress = index / (this.animations.length - 1);
      this.masterTimeline.add(sectionTimeline, sectionProgress);
    });
  }

  private addCameraAnimations(timeline: gsap.core.Timeline, keyframes: CameraKeyframe[]): void {
    keyframes.forEach((keyframe) => {
      // Camera animation logic can be implemented here
      console.log('Camera keyframe:', keyframe);

      timeline.to({}, {
        duration: keyframe.duration,
        ease: keyframe.ease,
        onUpdate: () => {
          // Camera update will be handled by the hook
        },
        onComplete: () => {
          if (keyframe.shake) {
            this.addCameraShake(keyframe.shake.intensity, keyframe.shake.duration);
          }
        }
      }, keyframe.progress);
    });
  }

  private addSceneAnimations(timeline: gsap.core.Timeline, animations: SceneAnimation[]): void {
    animations.forEach((anim) => {
      const startProgress = anim.progress[0];
      const endProgress = anim.progress[1];
      const duration = (endProgress - startProgress) * anim.duration;

      timeline.fromTo(
        `[data-animation-target="${anim.target}"]`,
        { [anim.property]: anim.from },
        {
          [anim.property]: anim.to,
          duration: duration,
          ease: anim.ease,
          stagger: anim.stagger || 0
        },
        startProgress
      );
    });
  }

  private addTextAnimations(timeline: gsap.core.Timeline, textConfigs: TextRevealConfig[]): void {
    textConfigs.forEach((config) => {
      const element = document.querySelector(`[data-text-reveal="${config.id}"]`);
      if (!element) return;

      timeline.to(element, {
        opacity: 1,
        duration: config.duration,
        delay: config.delay,
        ease: 'power2.out'
      }, config.progress);
    });
  }

  private addCameraShake(intensity: number, duration: number): void {
    const shakeTimeline = gsap.timeline();
    // Shake intensity based on performance mode
    console.log('Shake intensity:', intensity * (this.performanceMode.lodLevel === 0 ? 1 : 0.5));
    
    shakeTimeline.to({}, {
      duration: duration,
      ease: 'power2.out',
      onUpdate: () => {
        // Camera shake will be applied in the camera hook
      }
    });
  }

  private startPerformanceMonitoring(): void {
    const monitor = () => {
      const now = performance.now();
      
      if (this.lastFpsUpdate === 0) {
        this.lastFpsUpdate = now;
      }

      this.frameCount++;

      if (now - this.lastFpsUpdate >= this.fpsUpdateInterval) {
        this.currentFPS = (this.frameCount * 1000) / (now - this.lastFpsUpdate);
        this.frameCount = 0;
        this.lastFpsUpdate = now;

        // Update performance metrics
        const metrics: PerformanceMetrics = {
          fps: this.currentFPS,
          frameTime: now - this.lastFrameTime,
          memoryUsage: ('memory' in performance ? (performance as { memory: { usedJSHeapSize: number } }).memory?.usedJSHeapSize : 0) || 0,
          animationComplexity: this.getAnimationComplexity(),
          shouldOptimize: this.currentFPS < 45
        };

        this.onPerformanceUpdate?.(metrics);

        // Auto-adjust quality if needed
        if (this.currentFPS < 30) {
          this.adjustQualityDown();
        } else if (this.currentFPS > 55 && this.performanceMode.lodLevel > 0) {
          this.adjustQualityUp();
        }
      }

      this.lastFrameTime = now;
      this.rafId = requestAnimationFrame(monitor);
    };

    this.rafId = requestAnimationFrame(monitor);
  }

  private getAnimationComplexity(): 'low' | 'medium' | 'high' {
    const activeAnimations = Array.from(this.sectionTimelines.values())
      .filter(timeline => timeline.isActive());
    
    if (activeAnimations.length === 0) return 'low';
    if (activeAnimations.length <= 2) return 'medium';
    return 'high';
  }

  private adjustQualityDown(): void {
    if (this.performanceMode.lodLevel < 2) {
      this.performanceMode.lodLevel++;
      this.performanceMode.particles = false;
      this.performanceMode.shadows = false;
      this.performanceMode.textureResolution = Math.max(256, this.performanceMode.textureResolution / 2);
    }
  }

  private adjustQualityUp(): void {
    if (this.performanceMode.lodLevel > 0) {
      this.performanceMode.lodLevel--;
      if (this.performanceMode.lodLevel === 0) {
        this.performanceMode.particles = true;
        this.performanceMode.shadows = true;
        this.performanceMode.textureResolution = Math.min(1024, this.performanceMode.textureResolution * 2);
      }
    }
  }

  public syncWithScroll(scrollState: ScrollState): void {
    const now = performance.now();
    
    // Throttle animation updates to target FPS
    if (now - this.lastFrameTime < this.frameInterval) {
      return;
    }

    // Calculate velocity
    if (this.lastScrollTime > 0) {
      const deltaTime = now - this.lastScrollTime;
      const deltaScroll = scrollState.scrollY - this.lastScrollY;
      this.velocity = Math.abs(deltaScroll) / deltaTime;
    }

    this.lastScrollTime = now;
    this.lastScrollY = scrollState.scrollY;

    // Update master timeline progress
    const progress = Math.min(scrollState.progress, 0.999);
    this.masterTimeline.progress(progress);

    // Handle section changes
    if (scrollState.currentSection !== this.currentSection) {
      this.handleSectionChange(scrollState.currentSection, scrollState.direction);
    }

    // Update section-specific progress
    const sectionTimeline = this.sectionTimelines.get(scrollState.currentSection);
    if (sectionTimeline) {
      sectionTimeline.progress(scrollState.sectionProgress);
    }
  }

  private handleSectionChange(newSection: number, direction: 'up' | 'down'): void {
    if (this.isAnimating) return;

    this.isAnimating = true;
    this.currentSection = newSection;

    // Trigger section change callback
    this.onSectionChange?.(newSection);

    // Add transition effects based on direction
    const transitionDuration = this.animations[newSection]?.transitionDuration || 1000;
    
    gsap.to({}, {
      duration: transitionDuration / 1000,
      onComplete: () => {
        this.isAnimating = false;
      }
    });
  }

  public getVelocity(): number {
    return this.velocity;
  }

  public getCurrentFPS(): number {
    return this.currentFPS;
  }

  public getPerformanceMode(): AnimationQuality {
    return { ...this.performanceMode };
  }

  public pause(): void {
    this.masterTimeline.pause();
    this.sectionTimelines.forEach(timeline => timeline.pause());
  }

  public resume(): void {
    this.masterTimeline.resume();
    this.sectionTimelines.forEach(timeline => timeline.resume());
  }

  public destroy(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    
    this.masterTimeline.kill();
    this.sectionTimelines.forEach(timeline => timeline.kill());
    this.sectionTimelines.clear();
  }

  // Public method to manually trigger animations for testing
  public triggerSectionAnimation(sectionId: number, progress: number): void {
    const timeline = this.sectionTimelines.get(sectionId);
    if (timeline) {
      timeline.progress(progress);
    }
  }

  // Method to get current section animation state
  public getSectionAnimationState(sectionId: number): {
    isActive: boolean;
    progress: number;
    velocity: number;
  } {
    const timeline = this.sectionTimelines.get(sectionId);
    return {
      isActive: timeline?.isActive() || false,
      progress: timeline?.progress() || 0,
      velocity: this.velocity
    };
  }
}