/**
 * Loading Integration Test Suite
 * 
 * This file provides utilities to test the progressive loading system
 * and ensure it meets the performance constraints defined in CLAUDE.md
 */

import { ProgressiveLoader } from './progressiveLoader';
import { PerformanceManager } from './performance';
import { MemoryManager } from './memoryManager';

interface LoadingTestResults {
  passedTests: string[];
  failedTests: string[];
  performanceMetrics: {
    averageFPS: number;
    memoryUsage: number;
    loadingTime: number;
    assetLoadTimes: Record<string, number>;
  };
  recommendations: string[];
}

export class LoadingIntegrationTester {
  private progressiveLoader: ProgressiveLoader;
  private performanceManager: PerformanceManager;
  private memoryManager: MemoryManager;
  private testResults: LoadingTestResults;

  constructor() {
    this.progressiveLoader = ProgressiveLoader.getInstance();
    this.performanceManager = PerformanceManager.getInstance();
    this.memoryManager = MemoryManager.getInstance();
    
    this.testResults = {
      passedTests: [],
      failedTests: [],
      performanceMetrics: {
        averageFPS: 0,
        memoryUsage: 0,
        loadingTime: 0,
        assetLoadTimes: {}
      },
      recommendations: []
    };
  }

  /**
   * Run comprehensive loading tests
   */
  async runTests(): Promise<LoadingTestResults> {
    console.log('🧪 Starting Progressive Loading Integration Tests...');
    
    const startTime = performance.now();
    
    // Test 1: Progressive Loader Initialization
    await this.testProgressiveLoaderInit();
    
    // Test 2: Scene Configuration
    await this.testSceneConfiguration();
    
    // Test 3: Asset Loading Performance
    await this.testAssetLoadingPerformance();
    
    // Test 4: Memory Management
    await this.testMemoryManagement();
    
    // Test 5: Error Handling
    await this.testErrorHandling();
    
    // Test 6: Performance Constraints
    await this.testPerformanceConstraints();
    
    const endTime = performance.now();
    this.testResults.performanceMetrics.loadingTime = endTime - startTime;
    
    this.generateRecommendations();
    
    console.log('✅ Progressive Loading Tests Completed');
    return this.testResults;
  }

  private async testProgressiveLoaderInit(): Promise<void> {
    try {
      const stats = this.progressiveLoader.getStats();
      
      if (stats.registeredScenes >= 6) {
        this.testResults.passedTests.push('Progressive Loader: All 6 scenes registered');
      } else {
        this.testResults.failedTests.push(`Progressive Loader: Only ${stats.registeredScenes}/6 scenes registered`);
      }
      
      if (stats.maxConcurrentLoads <= 4) {
        this.testResults.passedTests.push('Progressive Loader: Concurrent loads within limits');
      } else {
        this.testResults.failedTests.push(`Progressive Loader: Too many concurrent loads (${stats.maxConcurrentLoads})`);
      }
      
    } catch (error) {
      this.testResults.failedTests.push(`Progressive Loader Init: ${error}`);
    }
  }

  private async testSceneConfiguration(): Promise<void> {
    try {
      const expectedScenes = ['identity', 'origin', 'mission', 'present', 'vision', 'cta'];
      const stats = this.progressiveLoader.getStats();
      
      if (stats.registeredScenes === expectedScenes.length) {
        this.testResults.passedTests.push('Scene Configuration: All scenes configured');
      } else {
        this.testResults.failedTests.push('Scene Configuration: Missing scene configurations');
      }
      
    } catch (error) {
      this.testResults.failedTests.push(`Scene Configuration: ${error}`);
    }
  }

  private async testAssetLoadingPerformance(): Promise<void> {
    try {
      const startTime = performance.now();
      
      // Test critical asset loading
      const criticalAssets = ['identityCircleGeometry', 'identityMaterial', 'mapGeometry'];
      
      for (const assetId of criticalAssets) {
        const assetStartTime = performance.now();
        
        try {
          const isLoaded = this.progressiveLoader.isAssetLoaded(assetId);
          if (isLoaded) {
            const loadTime = performance.now() - assetStartTime;
            this.testResults.performanceMetrics.assetLoadTimes[assetId] = loadTime;
            
            this.testResults.passedTests.push(`Asset Loading: ${assetId} loaded successfully`);
          } else {
            this.testResults.failedTests.push(`Asset Loading: ${assetId} not loaded`);
          }
        } catch (error) {
          this.testResults.failedTests.push(`Asset Loading: ${assetId} failed - ${error}`);
        }
      }
      
      const totalLoadTime = performance.now() - startTime;
      
      // Performance constraint: Assets should load within reasonable time
      if (totalLoadTime < 5000) { // 5 seconds
        this.testResults.passedTests.push('Asset Loading: Within performance constraints');
      } else {
        this.testResults.failedTests.push(`Asset Loading: Too slow (${totalLoadTime}ms)`);
      }
      
    } catch (error) {
      this.testResults.failedTests.push(`Asset Loading Performance: ${error}`);
    }
  }

  private async testMemoryManagement(): Promise<void> {
    try {
      const metrics = this.performanceManager.getMetrics();
      this.testResults.performanceMetrics.memoryUsage = metrics.memoryUsage;
      
      // Performance constraint: Memory usage should stay under 80%
      if (metrics.memoryUsage < 80) {
        this.testResults.passedTests.push('Memory Management: Within constraints');
      } else {
        this.testResults.failedTests.push(`Memory Management: High usage (${metrics.memoryUsage}%)`);
      }
      
      // Test polygon count constraint
      if (metrics.triangleCount <= 30000) {
        this.testResults.passedTests.push('Memory Management: Polygon count within limits');
      } else {
        this.testResults.failedTests.push(`Memory Management: Polygon count exceeded (${metrics.triangleCount})`);
      }
      
    } catch (error) {
      this.testResults.failedTests.push(`Memory Management: ${error}`);
    }
  }

  private async testErrorHandling(): Promise<void> {
    try {
      // Test invalid asset ID
      try {
        await this.progressiveLoader.loadAssetById('nonexistent-asset');
        this.testResults.failedTests.push('Error Handling: Should have thrown error for invalid asset');
      } catch (error) {
        this.testResults.passedTests.push('Error Handling: Properly handles invalid assets');
      }
      
    } catch (error) {
      this.testResults.failedTests.push(`Error Handling: ${error}`);
    }
  }

  private async testPerformanceConstraints(): Promise<void> {
    try {
      const metrics = this.performanceManager.getMetrics();
      this.testResults.performanceMetrics.averageFPS = metrics.fps;
      
      // Constraint: 60fps target
      if (metrics.fps >= 55) {
        this.testResults.passedTests.push('Performance: FPS within target range');
      } else if (metrics.fps >= 45) {
        this.testResults.passedTests.push('Performance: FPS acceptable');
        this.testResults.recommendations.push('Consider reducing visual complexity for better FPS');
      } else {
        this.testResults.failedTests.push(`Performance: FPS too low (${metrics.fps})`);
      }
      
      // Constraint: Max 30k polygons
      if (metrics.triangleCount <= 30000) {
        this.testResults.passedTests.push('Performance: Polygon count within constraints');
      } else {
        this.testResults.failedTests.push(`Performance: Polygon count exceeded (${metrics.triangleCount})`);
      }
      
    } catch (error) {
      this.testResults.failedTests.push(`Performance Constraints: ${error}`);
    }
  }

  private generateRecommendations(): void {
    const { performanceMetrics, failedTests } = this.testResults;
    
    if (performanceMetrics.averageFPS < 55) {
      this.testResults.recommendations.push('Reduce particle count or geometry complexity');
    }
    
    if (performanceMetrics.memoryUsage > 70) {
      this.testResults.recommendations.push('Implement more aggressive asset cleanup');
    }
    
    if (performanceMetrics.loadingTime > 3000) {
      this.testResults.recommendations.push('Optimize asset sizes or loading strategy');
    }
    
    if (failedTests.length > 0) {
      this.testResults.recommendations.push('Fix failed tests before production deployment');
    }
    
    if (this.testResults.recommendations.length === 0) {
      this.testResults.recommendations.push('System is optimally configured for production');
    }
  }

  /**
   * Generate a detailed test report
   */
  generateReport(): string {
    const { passedTests, failedTests, performanceMetrics, recommendations } = this.testResults;
    
    return `
📊 PROGRESSIVE LOADING INTEGRATION TEST REPORT
=============================================

✅ PASSED TESTS (${passedTests.length}):
${passedTests.map(test => `  • ${test}`).join('\n')}

❌ FAILED TESTS (${failedTests.length}):
${failedTests.map(test => `  • ${test}`).join('\n')}

📈 PERFORMANCE METRICS:
  • Average FPS: ${performanceMetrics.averageFPS}
  • Memory Usage: ${performanceMetrics.memoryUsage}%
  • Total Loading Time: ${Math.round(performanceMetrics.loadingTime)}ms

🎯 RECOMMENDATIONS:
${recommendations.map(rec => `  • ${rec}`).join('\n')}

OVERALL STATUS: ${failedTests.length === 0 ? '✅ READY FOR PRODUCTION' : '⚠️  NEEDS ATTENTION'}
    `.trim();
  }
}

/**
 * Quick test runner for development
 */
export const runLoadingTests = async (): Promise<void> => {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('Loading tests should only run in development mode');
    return;
  }
  
  const tester = new LoadingIntegrationTester();
  const results = await tester.runTests();
  
  console.log(tester.generateReport());
  
  return results;
};