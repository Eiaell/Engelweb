import { MemoryManager } from './memoryManager';
import { CleanupManager } from './cleanupManager';
import { PerformanceManager } from './performance';

export interface MemoryReport {
  timestamp: number;
  jsHeapUsed: number; // MB
  jsHeapTotal: number; // MB
  memoryManagerStats: ReturnType<MemoryManager['getMemoryStats']>;
  cleanupStats: ReturnType<CleanupManager['getStats']>;
  performanceMetrics: ReturnType<PerformanceManager['getMetrics']>;
  activeScenes: string[];
}

export class MemoryMonitor {
  private static instance: MemoryMonitor;
  private reports: MemoryReport[] = [];
  private maxReports = 100; // Keep last 100 reports
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;

  static getInstance(): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor();
    }
    return MemoryMonitor.instance;
  }

  /**
   * Start monitoring memory usage
   */
  startMonitoring(intervalMs: number = 5000): void {
    if (this.isMonitoring) {
      console.warn('MemoryMonitor: Already monitoring');
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.captureReport();
    }, intervalMs);

    console.log(`📊 MemoryMonitor: Started monitoring (interval: ${intervalMs}ms)`);
  }

  /**
   * Stop monitoring memory usage
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('📊 MemoryMonitor: Stopped monitoring');
  }

  /**
   * Capture a memory report
   */
  captureReport(): MemoryReport {
    const memoryManager = MemoryManager.getInstance();
    const cleanupManager = CleanupManager.getInstance();
    const performanceManager = PerformanceManager.getInstance();

    // Get JS heap info if available
    const memory = (performance as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
    const jsHeapUsed = memory ? Math.round(memory.usedJSHeapSize / 1024 / 1024) : 0;
    const jsHeapTotal = memory ? Math.round(memory.totalJSHeapSize / 1024 / 1024) : 0;

    const report: MemoryReport = {
      timestamp: Date.now(),
      jsHeapUsed,
      jsHeapTotal,
      memoryManagerStats: memoryManager.getMemoryStats(),
      cleanupStats: cleanupManager.getStats(),
      performanceMetrics: performanceManager.getMetrics(),
      activeScenes: [] // Would need to track this separately
    };

    // Add to reports array, keeping only the last maxReports
    this.reports.push(report);
    if (this.reports.length > this.maxReports) {
      this.reports.shift();
    }

    return report;
  }

  /**
   * Get memory report for section transition
   */
  reportSectionTransition(fromSection: string, toSection: string): void {
    const report = this.captureReport();
    
    console.log(`📊 MemoryMonitor: Section transition ${fromSection} → ${toSection}`, {
      jsHeap: `${report.jsHeapUsed}MB / ${report.jsHeapTotal}MB`,
      gpuMemory: `${report.memoryManagerStats.currentUsage}MB / ${report.memoryManagerStats.budget}MB`,
      fps: report.performanceMetrics.fps,
      cleanedUp: {
        geometries: report.cleanupStats.geometriesDisposed,
        materials: report.cleanupStats.materialsDisposed,
        textures: report.cleanupStats.texturesDisposed,
        memoryFreed: `${report.cleanupStats.memoryFreed.toFixed(2)}MB`
      }
    });
  }

  /**
   * Get all memory reports
   */
  getReports(): MemoryReport[] {
    return [...this.reports];
  }

  /**
   * Get latest memory report
   */
  getLatestReport(): MemoryReport | null {
    return this.reports.length > 0 ? this.reports[this.reports.length - 1] : null;
  }

  /**
   * Analyze memory trends
   */
  analyzeMemoryTrends(): {
    memoryGrowth: number; // MB/minute
    averageFPS: number;
    memoryLeakSuspected: boolean;
  } {
    if (this.reports.length < 2) {
      return {
        memoryGrowth: 0,
        averageFPS: 60,
        memoryLeakSuspected: false
      };
    }

    const firstReport = this.reports[0];
    const lastReport = this.reports[this.reports.length - 1];
    const timeDiff = (lastReport.timestamp - firstReport.timestamp) / 1000 / 60; // minutes

    const memoryGrowth = (lastReport.jsHeapUsed - firstReport.jsHeapUsed) / timeDiff;
    const averageFPS = this.reports.reduce((sum, report) => sum + report.performanceMetrics.fps, 0) / this.reports.length;
    
    // Suspect memory leak if memory grows consistently > 1MB/minute
    const memoryLeakSuspected = memoryGrowth > 1;

    return {
      memoryGrowth,
      averageFPS,
      memoryLeakSuspected
    };
  }

  /**
   * Export memory reports as JSON
   */
  exportReports(): string {
    return JSON.stringify({
      exportTime: new Date().toISOString(),
      reports: this.reports,
      analysis: this.analyzeMemoryTrends()
    }, null, 2);
  }

  /**
   * Clear all reports
   */
  clearReports(): void {
    this.reports = [];
    console.log('📊 MemoryMonitor: Cleared all reports');
  }

  /**
   * Log memory summary
   */
  logSummary(): void {
    const latest = this.getLatestReport();
    if (!latest) {
      console.log('📊 MemoryMonitor: No data available');
      return;
    }

    const analysis = this.analyzeMemoryTrends();
    
    console.log('📊 MemoryMonitor Summary:', {
      currentMemory: `${latest.jsHeapUsed}MB JS heap, ${latest.memoryManagerStats.currentUsage}MB GPU`,
      performance: `${latest.performanceMetrics.fps} FPS, ${latest.performanceMetrics.frameTime.toFixed(2)}ms frame time`,
      cleanup: `${latest.cleanupStats.geometriesDisposed} geometries, ${latest.cleanupStats.materialsDisposed} materials disposed`,
      trends: {
        memoryGrowth: `${analysis.memoryGrowth.toFixed(2)}MB/min`,
        averageFPS: `${analysis.averageFPS.toFixed(1)} FPS`,
        leakSuspected: analysis.memoryLeakSuspected
      }
    });
  }
}

// Export singleton instance
export const memoryMonitor = MemoryMonitor.getInstance();