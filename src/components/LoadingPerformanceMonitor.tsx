'use client';

import { useEffect, useState } from 'react';
import { ProgressiveLoader } from '@/lib/progressiveLoader';
import { PerformanceManager } from '@/lib/performance';

interface LoadingStats {
  fps: number;
  memoryUsage: number;
  loadingProgress: number;
  concurrentLoads: number;
  queueLength: number;
  bandwidthEstimate: number;
  activeScenes: number;
}

interface LoadingPerformanceMonitorProps {
  progressiveLoader?: ProgressiveLoader;
  showDetailedStats?: boolean;
  className?: string;
}

export const LoadingPerformanceMonitor: React.FC<LoadingPerformanceMonitorProps> = ({
  progressiveLoader,
  showDetailedStats = false,
  className = ''
}) => {
  const [stats, setStats] = useState<LoadingStats>({
    fps: 60,
    memoryUsage: 0,
    loadingProgress: 0,
    concurrentLoads: 0,
    queueLength: 0,
    bandwidthEstimate: 0,
    activeScenes: 0
  });

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!progressiveLoader) return;

    const performanceManager = PerformanceManager.getInstance();
    
    const updateStats = () => {
      const loaderStats = progressiveLoader.getStats();
      const performanceMetrics = performanceManager.getMetrics();
      
      setStats({
        fps: Math.round(performanceMetrics.fps),
        memoryUsage: Math.round(performanceMetrics.memoryUsage),
        loadingProgress: Math.round(loaderStats.progress.progress * 100),
        concurrentLoads: loaderStats.activeLoads,
        queueLength: loaderStats.queueLength,
        bandwidthEstimate: Math.round(loaderStats.bandwidthEstimate * 100) / 100,
        activeScenes: loaderStats.registeredScenes
      });
    };

    const interval = setInterval(updateStats, 1000);
    updateStats(); // Initial update

    return () => clearInterval(interval);
  }, [progressiveLoader]);

  // Show monitor when loading or when explicitly requested
  useEffect(() => {
    setIsVisible(showDetailedStats || stats.loadingProgress < 100 || stats.queueLength > 0);
  }, [showDetailedStats, stats.loadingProgress, stats.queueLength]);

  // Performance warnings
  const getPerformanceStatus = () => {
    if (stats.fps < 30) return { status: 'critical', color: 'text-red-400', message: 'Critical FPS' };
    if (stats.fps < 45) return { status: 'warning', color: 'text-yellow-400', message: 'Low FPS' };
    if (stats.memoryUsage > 80) return { status: 'warning', color: 'text-yellow-400', message: 'High Memory' };
    return { status: 'good', color: 'text-green-400', message: 'Optimal' };
  };

  if (!isVisible || !progressiveLoader) return null;

  const performanceStatus = getPerformanceStatus();

  return (
    <div className={`fixed top-4 left-4 z-50 bg-black/80 backdrop-blur-sm border border-gray-700 rounded-lg p-4 text-xs font-mono ${className}`}>
      <div className="space-y-2 min-w-48">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-gray-300 font-medium">Loading Monitor</span>
          <div className={`${performanceStatus.color} text-xs`}>
            {performanceStatus.message}
          </div>
        </div>

        {/* Loading Progress */}
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-400">Progress:</span>
            <span className="text-white">{stats.loadingProgress}%</span>
          </div>
          <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-red-500 to-gold-500 transition-all duration-300"
              style={{ width: `${stats.loadingProgress}%` }}
            />
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400">FPS:</span>
            <span className={stats.fps < 45 ? 'text-yellow-400' : 'text-green-400'}>
              {stats.fps}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-400">Memory:</span>
            <span className={stats.memoryUsage > 70 ? 'text-yellow-400' : 'text-gray-300'}>
              {stats.memoryUsage}%
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-400">Queue:</span>
            <span className="text-gray-300">{stats.queueLength}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-400">Active:</span>
            <span className="text-gray-300">{stats.concurrentLoads}</span>
          </div>
        </div>

        {/* Detailed Stats */}
        {showDetailedStats && (
          <div className="pt-2 border-t border-gray-700 space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-400">Bandwidth:</span>
              <span className="text-gray-300">{stats.bandwidthEstimate} MB/s</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-400">Scenes:</span>
              <span className="text-gray-300">{stats.activeScenes}</span>
            </div>
          </div>
        )}

        {/* Performance Constraints Reminder */}
        {(stats.fps < 60 || stats.memoryUsage > 60) && (
          <div className="pt-2 border-t border-gray-700">
            <div className="text-yellow-400 text-xs">
              ⚠️ Performance constraints active
            </div>
            <div className="text-gray-400 text-xs mt-1">
              Target: 60fps, Max polygons: 30k
            </div>
          </div>
        )}
      </div>
    </div>
  );
};