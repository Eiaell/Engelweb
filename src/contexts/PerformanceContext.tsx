'use client';

import React, { createContext, useContext, useRef, useEffect, useState, useCallback } from 'react';
import { PerformanceMetrics, AnimationQuality } from '@/types';

interface PerformanceContextType {
  metrics: PerformanceMetrics;
  quality: AnimationQuality;
  adaptiveMode: boolean;
  setAdaptiveMode: (enabled: boolean) => void;
  setQuality: (quality: AnimationQuality) => void;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  getRecommendedQuality: () => AnimationQuality;
  isMonitoring: boolean;
}

const PerformanceContext = createContext<PerformanceContextType | null>(null);

interface PerformanceProviderProps {
  children: React.ReactNode;
  targetFPS?: number;
  adaptiveThreshold?: number;
  monitoringInterval?: number;
}

export const PerformanceProvider: React.FC<PerformanceProviderProps> = ({
  children,
  targetFPS = 60,
  adaptiveThreshold = 45,
  monitoringInterval = 1000
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    frameTime: 16.67,
    memoryUsage: 0,
    animationComplexity: 'medium',
    shouldOptimize: false
  });

  const [quality, setQualityState] = useState<AnimationQuality>({
    particles: true,
    shadows: true,
    postProcessing: true,
    lodLevel: 0,
    textureResolution: 1024
  });

  const [adaptiveMode, setAdaptiveMode] = useState(true);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Performance monitoring refs
  const rafIdRef = useRef<number | null>(null);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(0);
  const lastFPSUpdateRef = useRef(0);
  const frameTimesRef = useRef<number[]>([]);
  const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Hardware detection cache
  const hardwareInfoRef = useRef<{
    gpu: string;
    tier: 'high' | 'medium' | 'low';
    memory: number;
    cores: number;
  } | null>(null);

  // Detect hardware capabilities
  const detectHardware = useCallback(() => {
    if (hardwareInfoRef.current) return hardwareInfoRef.current;

    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    let gpu = 'Unknown';
    let tier: 'high' | 'medium' | 'low' = 'medium';
    
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        gpu = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'Unknown';
      }

      // Simple GPU tier detection based on common patterns
      const gpuLower = gpu.toLowerCase();
      if (gpuLower.includes('rtx') || gpuLower.includes('rx 6') || gpuLower.includes('rx 7')) {
        tier = 'high';
      } else if (gpuLower.includes('gtx') || gpuLower.includes('rx 5') || gpuLower.includes('intel iris')) {
        tier = 'medium';
      } else {
        tier = 'low';
      }
    }

    const memory = (navigator as any).deviceMemory || 4; // GB
    const cores = navigator.hardwareConcurrency || 4;

    hardwareInfoRef.current = { gpu, tier, memory, cores };
    return hardwareInfoRef.current;
  }, []);

  // Get recommended quality based on hardware
  const getRecommendedQuality = useCallback((): AnimationQuality => {
    const hardware = detectHardware();
    const currentFPS = metrics.fps;
    
    // Base quality on hardware tier and current performance
    if (hardware.tier === 'high' && currentFPS >= 55) {
      return {
        particles: true,
        shadows: true,
        postProcessing: true,
        lodLevel: 0,
        textureResolution: 1024
      };
    } else if (hardware.tier === 'medium' || (hardware.tier === 'high' && currentFPS >= 40)) {
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
  }, [metrics.fps, detectHardware]);

  // Performance monitoring loop
  const performanceLoop = useCallback((timestamp: number) => {
    frameCountRef.current++;
    
    if (lastTimeRef.current === 0) {
      lastTimeRef.current = timestamp;
      lastFPSUpdateRef.current = timestamp;
    }

    const deltaTime = timestamp - lastTimeRef.current;
    frameTimesRef.current.push(deltaTime);
    
    // Keep only last 60 frame times for accurate averaging
    if (frameTimesRef.current.length > 60) {
      frameTimesRef.current.shift();
    }

    lastTimeRef.current = timestamp;

    // Update FPS every monitoring interval
    if (timestamp - lastFPSUpdateRef.current >= monitoringInterval) {
      const fps = (frameCountRef.current * 1000) / (timestamp - lastFPSUpdateRef.current);
      const avgFrameTime = frameTimesRef.current.reduce((sum, time) => sum + time, 0) / frameTimesRef.current.length;
      
      const newMetrics: PerformanceMetrics = {
        fps: Math.round(fps),
        frameTime: avgFrameTime,
        memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
        animationComplexity: getAnimationComplexity(fps),
        shouldOptimize: fps < adaptiveThreshold
      };

      setMetrics(newMetrics);

      // Auto-adjust quality in adaptive mode
      if (adaptiveMode && newMetrics.shouldOptimize) {
        const recommendedQuality = getRecommendedQuality();
        setQualityState(recommendedQuality);
      }

      frameCountRef.current = 0;
      lastFPSUpdateRef.current = timestamp;
    }

    if (isMonitoring) {
      rafIdRef.current = requestAnimationFrame(performanceLoop);
    }
  }, [adaptiveMode, adaptiveThreshold, monitoringInterval, getRecommendedQuality]);

  const getAnimationComplexity = (fps: number): 'low' | 'medium' | 'high' => {
    if (fps >= 55) return 'high';
    if (fps >= 35) return 'medium';
    return 'low';
  };

  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;
    
    setIsMonitoring(true);
    frameCountRef.current = 0;
    lastTimeRef.current = 0;
    lastFPSUpdateRef.current = 0;
    frameTimesRef.current = [];
    
    rafIdRef.current = requestAnimationFrame(performanceLoop);
  }, [isMonitoring, performanceLoop]);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
      monitoringIntervalRef.current = null;
    }
  }, []);

  const setQuality = useCallback((newQuality: AnimationQuality) => {
    setQualityState(newQuality);
  }, []);

  // Auto-start monitoring on mount
  useEffect(() => {
    startMonitoring();
    
    return () => {
      stopMonitoring();
    };
  }, [startMonitoring, stopMonitoring]);

  // Handle visibility change to pause/resume monitoring
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopMonitoring();
      } else {
        startMonitoring();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [startMonitoring, stopMonitoring]);

  // Performance budget warnings
  useEffect(() => {
    if (metrics.fps < 30) {
      console.warn(`Performance: FPS dropped to ${metrics.fps}. Consider reducing animation complexity.`);
    }
    
    if (metrics.memoryUsage > 100 * 1024 * 1024) { // 100MB
      console.warn(`Performance: Memory usage is ${(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB. Consider optimizing.`);
    }
  }, [metrics.fps, metrics.memoryUsage]);

  const contextValue: PerformanceContextType = {
    metrics,
    quality,
    adaptiveMode,
    setAdaptiveMode,
    setQuality,
    startMonitoring,
    stopMonitoring,
    getRecommendedQuality,
    isMonitoring
  };

  return (
    <PerformanceContext.Provider value={contextValue}>
      {children}
    </PerformanceContext.Provider>
  );
};

export const usePerformance = (): PerformanceContextType => {
  const context = useContext(PerformanceContext);
  if (!context) {
    throw new Error('usePerformance must be used within a PerformanceProvider');
  }
  return context;
};

// Performance monitoring component for debugging
export const PerformanceMonitor: React.FC<{ 
  visible?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}> = ({ 
  visible = false,
  position = 'top-right'
}) => {
  const { metrics, quality, adaptiveMode } = usePerformance();

  if (!visible) return null;

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  const getFPSColor = (fps: number) => {
    if (fps >= 55) return 'text-green-400';
    if (fps >= 35) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50 bg-black/80 text-white p-3 rounded-lg text-xs font-mono backdrop-blur-sm`}>
      <div className="space-y-1">
        <div className={`${getFPSColor(metrics.fps)} font-bold`}>
          FPS: {metrics.fps}
        </div>
        <div>Frame: {metrics.frameTime.toFixed(1)}ms</div>
        <div>Memory: {(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB</div>
        <div>Complexity: {metrics.animationComplexity}</div>
        <div>LOD: {quality.lodLevel}</div>
        <div>Particles: {quality.particles ? 'ON' : 'OFF'}</div>
        <div>Adaptive: {adaptiveMode ? 'ON' : 'OFF'}</div>
        {metrics.shouldOptimize && (
          <div className="text-orange-400">⚠ OPTIMIZE</div>
        )}
      </div>
    </div>
  );
};