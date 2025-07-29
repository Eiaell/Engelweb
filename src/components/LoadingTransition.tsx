'use client';

import { useEffect, useState, useRef } from 'react';
import { gsap } from 'gsap';

interface LoadingTransitionProps {
  isVisible: boolean;
  progress: number;
  onComplete?: () => void;
  className?: string;
}

export const LoadingTransition: React.FC<LoadingTransitionProps> = ({
  isVisible,
  progress,
  onComplete,
  className = ''
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!overlayRef.current || !progressBarRef.current) return;

    // Create timeline for smooth transitions
    timelineRef.current = gsap.timeline({
      onComplete: () => {
        setIsAnimating(false);
        if (onComplete && progress >= 1) {
          onComplete();
        }
      }
    });

    return () => {
      if (timelineRef.current) {
        timelineRef.current.kill();
      }
    };
  }, []);

  // Handle visibility changes
  useEffect(() => {
    if (!overlayRef.current || !timelineRef.current) return;

    if (isVisible && !isAnimating) {
      setIsAnimating(true);
      
      // Animate in
      timelineRef.current.clear()
        .set(overlayRef.current, { 
          opacity: 0, 
          scale: 1.1,
          display: 'flex'
        })
        .to(overlayRef.current, {
          opacity: 1,
          scale: 1,
          duration: 0.6,
          ease: 'power2.out'
        });
    } else if (!isVisible && progress >= 1) {
      // Animate out
      timelineRef.current.clear()
        .to(overlayRef.current, {
          opacity: 0,
          scale: 0.95,
          duration: 0.8,
          ease: 'power2.in'
        })
        .set(overlayRef.current, { display: 'none' });
    }
  }, [isVisible, progress, isAnimating]);

  // Handle progress updates
  useEffect(() => {
    if (!progressBarRef.current || !timelineRef.current) return;

    // Smooth progress bar animation
    gsap.to(progressBarRef.current, {
      scaleX: progress,
      duration: 0.3,
      ease: 'power2.out'
    });
  }, [progress]);

  return (
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-40 bg-gradient-to-br from-black/90 to-gray-900/95 backdrop-blur-md ${className}`}
      style={{ display: 'none' }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center space-y-8 max-w-md px-8">
          {/* Cinematic loading indicator */}
          <div className="relative">
            <div className="w-16 h-16 mx-auto mb-6">
              <div className="absolute inset-0 border-2 border-red-500/30 rounded-full animate-spin" />
              <div className="absolute inset-2 border-2 border-gold-500/50 rounded-full animate-spin" 
                   style={{ animationDirection: 'reverse', animationDuration: '2s' }} />
              <div className="absolute inset-4 bg-gradient-to-r from-red-500 to-gold-500 rounded-full opacity-60 animate-pulse" />
            </div>
          </div>

          {/* Progress text */}
          <div className="text-white/90 text-lg font-light">
            Calibrating Experience
          </div>

          {/* Cinematic progress bar */}
          <div className="w-full space-y-2">
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <div 
                ref={progressBarRef}
                className="h-full bg-gradient-to-r from-red-500 to-gold-500 rounded-full origin-left"
                style={{ transform: 'scaleX(0)' }}
              />
            </div>
            <div className="text-white/60 text-sm">
              {Math.round(progress * 100)}%
            </div>
          </div>

          {/* Floating elements for cinematic effect */}
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 12 }, (_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-white/20 rounded-full animate-float"
                style={{
                  left: `${15 + (i * 6)}%`,
                  top: `${30 + Math.sin(i * 0.5) * 40}%`,
                  animationDelay: `${i * 0.3}s`,
                  animationDuration: `${4 + (i % 3)}s`
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};