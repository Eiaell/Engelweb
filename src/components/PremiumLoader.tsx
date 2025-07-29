'use client';

import { useEffect, useState, useCallback } from 'react';
import { ProgressiveLoader, LoadingProgress } from '@/lib/progressiveLoader';

interface PremiumLoaderProps {
  onLoadComplete: () => void;
  progressiveLoader?: ProgressiveLoader;
}

export const PremiumLoader: React.FC<PremiumLoaderProps> = ({ 
  onLoadComplete, 
  progressiveLoader 
}) => {
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [loadingState, setLoadingState] = useState<string>('Initializing quantum systems...');
  const [currentAsset, setCurrentAsset] = useState<string>('');
  const [estimatedTime, setEstimatedTime] = useState<number>(0);
  const [isClient, setIsClient] = useState(false);

  const updateLoadingState = useCallback((progress: number, asset?: string) => {
    if (progress < 20) {
      setLoadingState('Initializing quantum systems...');
    } else if (progress < 40) {
      setLoadingState('Calibrating dual heritage...');
    } else if (progress < 60) {
      setLoadingState('Loading 3D environments...');
    } else if (progress < 80) {
      setLoadingState('Orchestrating digital agents...');
    } else if (progress < 95) {
      setLoadingState('Finalizing cinematic experience...');
    } else {
      setLoadingState('Ready to begin...');
    }

    if (asset) {
      setCurrentAsset(asset);
    }
  }, []);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    let animationId: number;
    let lastTime = performance.now();

    const animate = () => {
      if (progressiveLoader) {
        const loaderProgress = progressiveLoader.getLoadingProgress();
        const targetProgress = Math.min(loaderProgress.progress * 100, 100);
        
        setProgress(prev => {
          const diff = targetProgress - prev;
          const smoothedProgress = prev + diff * 0.1; // Smooth interpolation
          
          updateLoadingState(smoothedProgress, loaderProgress.currentAsset);
          setEstimatedTime(loaderProgress.estimatedTimeRemaining);
          
          if (smoothedProgress >= 99.5 && !isComplete) {
            setTimeout(() => {
              setIsComplete(true);
              setTimeout(onLoadComplete, 800);
            }, 500);
          }
          
          return smoothedProgress;
        });
      } else {
        // Fallback to simulated progress
        setProgress(prev => {
          if (prev >= 100) {
            if (!isComplete) {
              setTimeout(() => {
                setIsComplete(true);
                setTimeout(onLoadComplete, 800);
              }, 500);
            }
            return 100;
          }
          
          // Accelerating progress with some randomness
          const currentTime = performance.now();
          const deltaTime = currentTime - lastTime;
          const increment = (Math.random() * 10 + 5) * (deltaTime / 200);
          lastTime = currentTime;
          
          const newProgress = Math.min(prev + increment, 100);
          updateLoadingState(newProgress);
          
          return newProgress;
        });
      }

      if (!isComplete) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [onLoadComplete, progressiveLoader, isComplete, updateLoadingState]);

  return (
    <div className={`fixed inset-0 z-50 gradient-primary flex items-center justify-center transition-all duration-800 ${isComplete ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      <div className="text-center space-y-12 max-w-4xl px-8">
        {/* Enhanced EH Logo Animation */}
        <div className="relative">
          <div className="text-display tracking-wider">
            Orquestador
          </div>
          
          {/* Enhanced animated underline with glow */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 gradient-aurora transition-all duration-1000 ease-out"
               style={{ 
                 width: `${progress * 0.9}%`,
                 boxShadow: `0 0 20px rgba(255, 71, 87, ${progress * 0.01}), 0 0 40px rgba(255, 165, 2, ${progress * 0.008})`
               }}
          />
        </div>
        
        {/* Enhanced Subtitle */}
        <div className="text-hero">
          Engelbert Huber
        </div>
        
        {/* Enhanced Progress Bar */}
        <div className="w-96 mx-auto">
          <div className="flex justify-between text-micro mb-4">
            <span>Cinematic Experience</span>
            <span>{Math.round(progress)}%</span>
          </div>
          
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden backdrop-blur-sm">
            <div 
              className="h-full gradient-aurora transition-all duration-500 ease-out rounded-full relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full"></div>
            </div>
          </div>
        </div>
        
        {/* Enhanced Loading States */}
        <div className="space-y-4">
          <div className="text-body-large text-center">{loadingState}</div>
          {currentAsset && (
            <div className="text-caption text-center opacity-60">
              {currentAsset.replace(/([A-Z])/g, ' $1').trim()}
            </div>
          )}
          {estimatedTime > 0 && estimatedTime < 30 && (
            <div className="text-micro text-center opacity-40">
              {Math.ceil(estimatedTime)}s remaining
            </div>
          )}
        </div>
        
        {/* Enhanced Floating Particles */}
        {isClient && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 24 }, (_, i) => {
              const colors = ['bg-[var(--eh-crimson)]', 'bg-[var(--eh-gold)]', 'bg-[var(--eh-purple)]', 'bg-[var(--eh-teal)]'];
              const sizes = ['w-0.5 h-0.5', 'w-1 h-1', 'w-1.5 h-1.5'];
              return (
                <div
                  key={i}
                  className={`absolute ${colors[i % colors.length]} ${sizes[i % sizes.length]} rounded-full animate-float opacity-40`}
                  style={{
                    left: `${5 + (i * 3.8)}%`,
                    top: `${15 + Math.sin(i * 0.8) * 70}%`,
                    animationDelay: `${i * 0.15}s`,
                    animationDuration: `${4 + (i % 4)}s`,
                    filter: `blur(${0.5 + (i % 3) * 0.25}px)`,
                    boxShadow: `0 0 ${4 + (i % 3) * 2}px currentColor`
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};