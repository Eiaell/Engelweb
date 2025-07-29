'use client';

import { useState, useEffect } from 'react';
import { PerformanceManager } from '@/lib/performance';

interface PerformanceStats {
  fps: number;
  memory: number;
  triangles: number;
  draws: number;
}

export const PerformanceMonitor = ({ visible = false }: { visible?: boolean }) => {
  const [stats, setStats] = useState<PerformanceStats>({
    fps: 0,
    memory: 0,
    triangles: 0,
    draws: 0
  });
  const [isVisible, setIsVisible] = useState(visible);

  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      const performanceManager = PerformanceManager.getInstance();
      const memory = (performance as { memory?: { usedJSHeapSize: number } }).memory;
      
      setStats({
        fps: performanceManager.getFPS(),
        memory: memory ? Math.round(memory.usedJSHeapSize / 1024 / 1024) : 0,
        triangles: 0, // Will be updated from renderer info
        draws: 0 // Will be updated from renderer info
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isVisible]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'p' && e.ctrlKey && process.env.NODE_ENV === 'development') {
        setIsVisible(!isVisible);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isVisible]);

  if (!isVisible) return null;

  const getFPSColor = (fps: number) => {
    if (fps >= 55) return 'text-green-400';
    if (fps >= 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="fixed top-4 right-4 z-50 bg-black/80 backdrop-blur-sm border border-white/20 rounded-lg p-4 font-mono text-sm">
      <div className="space-y-2">
        <div className="text-white/60 text-xs mb-2">Performance Monitor</div>
        
        <div className="flex justify-between items-center">
          <span className="text-white/80">FPS:</span>
          <span className={`font-bold ${getFPSColor(stats.fps)}`}>
            {stats.fps}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-white/80">Memory:</span>
          <span className="text-white">
            {stats.memory}MB
          </span>
        </div>

        <div className="text-xs text-white/40 mt-3">
          Ctrl+P to toggle
        </div>
        
        {stats.fps < 50 && (
          <div className="text-xs text-red-400 mt-2 border-t border-red-400/20 pt-2">
            ⚠️ Performance below target
          </div>
        )}
      </div>
    </div>
  );
};