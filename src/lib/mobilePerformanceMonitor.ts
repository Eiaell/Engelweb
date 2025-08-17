'use client';

import { mobileDetection, MobileProfile } from './mobileDetection';
import { PerformanceManager } from './performance';

/**
 * Mobile-specific performance monitoring and adaptive quality system
 * Continuously monitors performance and adjusts settings for optimal mobile experience
 */

export interface MobilePerformanceMetrics {
  fps: number;
  frameTime: number;
  drawCalls: number;
  memoryUsage: number;
  batteryLevel?: number;
  thermalState?: 'nominal' | 'fair' | 'serious' | 'critical';
  networkSpeed?: 'slow-2g' | '2g' | '3g' | '4g' | 'fast';
  isCharging?: boolean;
  deviceOrientation: 'portrait' | 'landscape';
  visibilityState: 'visible' | 'hidden';
}

export interface AdaptiveQualitySettings {
  renderScale: number; // 0.5 to 1.0
  shadowQuality: 'none' | 'low' | 'medium';
  particleCount: number;
  animationSpeed: number; // 0.1 to 1.0
  textureQuality: number; // 128, 256, 512
  lodBias: number; // 1.0 to 3.0
  enablePostProcessing: boolean;
  frameRateTarget: 30 | 60;
}

export interface PerformanceThresholds {
  fpsWarning: number;
  fpsCritical: number;
  memoryWarning: number; // MB
  memoryCritical: number; // MB
  frameTimeWarning: number; // ms
  frameTimeCritical: number; // ms
}

export class MobilePerformanceMonitor {
  private static instance: MobilePerformanceMonitor;
  private isRunning = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private adaptationTimer: NodeJS.Timeout | null = null;
  
  private currentMetrics: MobilePerformanceMetrics;
  private currentSettings: AdaptiveQualitySettings;
  private thresholds: PerformanceThresholds;
  private mobileProfile: MobileProfile | null = null;
  private performanceHistory: number[] = [];
  private adaptationCooldown = 3000; // 3 seconds between adaptations
  private lastAdaptation = 0;
  
  // Event listeners
  private listeners: {
    onQualityChange?: (settings: AdaptiveQualitySettings) => void;
    onPerformanceIssue?: (issue: string, severity: 'warning' | 'critical') => void;
    onMetricsUpdate?: (metrics: MobilePerformanceMetrics) => void;
  } = {};

  static getInstance(): MobilePerformanceMonitor {
    if (!MobilePerformanceMonitor.instance) {
      MobilePerformanceMonitor.instance = new MobilePerformanceMonitor();
    }
    return MobilePerformanceMonitor.instance;
  }

  constructor() {
    this.currentMetrics = this.initializeMetrics();
    this.currentSettings = this.initializeSettings();
    this.thresholds = this.initializeThresholds();
    this.setupMobileDetection();
  }

  private initializeMetrics(): MobilePerformanceMetrics {
    return {
      fps: 60,
      frameTime: 16.67,
      drawCalls: 0,
      memoryUsage: 0,
      deviceOrientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
      visibilityState: document.visibilityState as 'visible' | 'hidden'
    };
  }

  private initializeSettings(): AdaptiveQualitySettings {
    return {
      renderScale: 1.0,
      shadowQuality: 'medium',
      particleCount: 500,
      animationSpeed: 1.0,
      textureQuality: 512,
      lodBias: 1.0,
      enablePostProcessing: false,
      frameRateTarget: 60
    };
  }

  private initializeThresholds(): PerformanceThresholds {
    return {
      fpsWarning: 45,
      fpsCritical: 30,
      memoryWarning: 200,
      memoryCritical: 300,
      frameTimeWarning: 20,
      frameTimeCritical: 33
    };
  }

  private setupMobileDetection() {
    this.mobileProfile = mobileDetection.getProfile();
    
    // Initialize settings based on mobile profile
    if (this.mobileProfile) {
      this.currentSettings = this.generateInitialSettings(this.mobileProfile);
      this.thresholds = this.adjustThresholdsForDevice(this.mobileProfile);
    }

    // Listen for profile changes
    mobileDetection.addProfileListener((profile) => {
      this.mobileProfile = profile;
      this.currentSettings = this.generateInitialSettings(profile);
      this.thresholds = this.adjustThresholdsForDevice(profile);
    });
  }

  private generateInitialSettings(profile: MobileProfile): AdaptiveQualitySettings {
    const { isMobile, performance, screenSize } = profile;
    
    let settings: AdaptiveQualitySettings = {
      renderScale: 1.0,
      shadowQuality: 'medium',
      particleCount: 500,
      animationSpeed: 1.0,
      textureQuality: 512,
      lodBias: 1.0,
      enablePostProcessing: false,
      frameRateTarget: 60
    };

    // Adjust based on performance tier
    switch (performance.tier) {
      case 'low':
        settings = {
          renderScale: 0.7,
          shadowQuality: 'none',
          particleCount: 100,
          animationSpeed: 0.5,
          textureQuality: 128,
          lodBias: 2.5,
          enablePostProcessing: false,
          frameRateTarget: 30
        };
        break;
        
      case 'medium':
        settings = {
          renderScale: 0.8,
          shadowQuality: 'low',
          particleCount: 300,
          animationSpeed: 0.8,
          textureQuality: 256,
          lodBias: 1.5,
          enablePostProcessing: false,
          frameRateTarget: isMobile ? 45 : 60
        };
        break;
        
      case 'high':
        settings = {
          renderScale: isMobile ? 0.9 : 1.0,
          shadowQuality: isMobile ? 'low' : 'medium',
          particleCount: isMobile ? 400 : 800,
          animationSpeed: 1.0,
          textureQuality: isMobile ? 256 : 512,
          lodBias: 1.0,
          enablePostProcessing: false, // Still disabled per constraints
          frameRateTarget: 60
        };
        break;
    }

    // Screen size adjustments
    if (screenSize === 'small') {
      settings.renderScale *= 0.8;
      settings.particleCount = Math.floor(settings.particleCount * 0.6);
      settings.textureQuality = Math.min(settings.textureQuality, 256);
    }

    return settings;
  }

  private adjustThresholdsForDevice(profile: MobileProfile): PerformanceThresholds {
    const base = this.initializeThresholds();
    
    if (profile.isMobile) {
      // More lenient thresholds for mobile devices
      return {
        fpsWarning: profile.performance.tier === 'low' ? 25 : 35,
        fpsCritical: profile.performance.tier === 'low' ? 20 : 25,
        memoryWarning: profile.performance.tier === 'low' ? 100 : 150,
        memoryCritical: profile.performance.tier === 'low' ? 150 : 200,
        frameTimeWarning: profile.performance.tier === 'low' ? 40 : 30,
        frameTimeCritical: profile.performance.tier === 'low' ? 50 : 40
      };
    }
    
    return base;
  }

  // Start performance monitoring
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.setupEventListeners();
    
    // Start monitoring loop
    this.monitoringInterval = setInterval(() => {
      this.updateMetrics();
      this.checkPerformance();
      this.adaptQualityIfNeeded();
    }, 1000); // Check every second
    
    console.log('📱 Mobile Performance Monitor started');
  }

  // Stop performance monitoring
  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    this.removeEventListeners();
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    if (this.adaptationTimer) {
      clearTimeout(this.adaptationTimer);
      this.adaptationTimer = null;
    }
    
    console.log('📱 Mobile Performance Monitor stopped');
  }

  private setupEventListeners() {
    // Visibility change
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Orientation change
    window.addEventListener('orientationchange', this.handleOrientationChange);
    window.addEventListener('resize', this.handleResize);
    
    // Battery API (if available)
    if ('getBattery' in navigator) {
      (navigator as { getBattery: () => Promise<unknown> }).getBattery().then((battery: unknown) => {
        battery.addEventListener('levelchange', this.handleBatteryChange);
        battery.addEventListener('chargingchange', this.handleBatteryChange);
        this.updateBatteryMetrics(battery);
      });
    }
    
    // Network information (if available)
    if ('connection' in navigator) {
      const connection = (navigator as { connection: unknown }).connection;
      connection.addEventListener('change', this.handleNetworkChange);
      this.updateNetworkMetrics(connection);
    }
  }

  private removeEventListeners() {
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('orientationchange', this.handleOrientationChange);
    window.removeEventListener('resize', this.handleResize);
  }

  private handleVisibilityChange = () => {
    this.currentMetrics.visibilityState = document.visibilityState as 'visible' | 'hidden';
    
    // Reduce quality when hidden to save battery
    if (document.visibilityState === 'hidden') {
      this.temporarilyReduceQuality();
    } else {
      this.restoreQuality();
    }
  };

  private handleOrientationChange = () => {
    setTimeout(() => {
      this.currentMetrics.deviceOrientation = 
        window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
      
      // Adjust settings based on orientation
      this.adaptToOrientation();
    }, 100);
  };

  private handleResize = () => {
    // Update device profile on resize
    if (this.mobileProfile) {
      const newProfile = mobileDetection.getProfile();
      if (newProfile) {
        this.mobileProfile = newProfile;
      }
    }
  };

  private handleBatteryChange = (event: Event) => {
    const battery = event.target as unknown;
    this.updateBatteryMetrics(battery);
    
    // Adapt quality based on battery level
    if (battery.level < 0.2 && !battery.charging) {
      this.enableBatterySavingMode();
    } else if (battery.level > 0.5 || battery.charging) {
      this.disableBatterySavingMode();
    }
  };

  private handleNetworkChange = (event: Event) => {
    const connection = event.target as unknown;
    this.updateNetworkMetrics(connection);
  };

  private updateBatteryMetrics(battery: unknown) {
    this.currentMetrics.batteryLevel = battery.level;
    this.currentMetrics.isCharging = battery.charging;
  }

  private updateNetworkMetrics(connection: unknown) {
    // Map connection effective type to our categories
    const effectiveType = connection.effectiveType;
    const speedMap: { [key: string]: number } = {
      'slow-2g': 'slow-2g',
      '2g': '2g',
      '3g': '3g',
      '4g': '4g'
    };
    
    this.currentMetrics.networkSpeed = speedMap[effectiveType] || 'fast';
  }

  private updateMetrics() {
    const performanceManager = PerformanceManager.getInstance();
    const metrics = performanceManager.getMetrics();
    
    // Update core metrics
    this.currentMetrics.fps = metrics.fps;
    this.currentMetrics.frameTime = metrics.frameTime;
    this.currentMetrics.drawCalls = metrics.drawCalls;
    this.currentMetrics.memoryUsage = metrics.memoryUsage;
    
    // Update performance history
    this.performanceHistory.push(metrics.fps);
    if (this.performanceHistory.length > 30) {
      this.performanceHistory.shift();
    }
    
    // Notify listeners
    this.listeners.onMetricsUpdate?.(this.currentMetrics);
  }

  private checkPerformance() {
    const { fps, frameTime, memoryUsage } = this.currentMetrics;
    const { fpsWarning, fpsCritical, memoryWarning, memoryCritical, frameTimeWarning, frameTimeCritical } = this.thresholds;
    
    // Check FPS issues
    if (fps < fpsCritical) {
      this.listeners.onPerformanceIssue?.(`FPS critical: ${fps.toFixed(1)}`, 'critical');
    } else if (fps < fpsWarning) {
      this.listeners.onPerformanceIssue?.(`FPS warning: ${fps.toFixed(1)}`, 'warning');
    }
    
    // Check frame time issues
    if (frameTime > frameTimeCritical) {
      this.listeners.onPerformanceIssue?.(`Frame time critical: ${frameTime.toFixed(1)}ms`, 'critical');
    } else if (frameTime > frameTimeWarning) {
      this.listeners.onPerformanceIssue?.(`Frame time warning: ${frameTime.toFixed(1)}ms`, 'warning');
    }
    
    // Check memory issues
    if (memoryUsage > memoryCritical) {
      this.listeners.onPerformanceIssue?.(`Memory critical: ${memoryUsage}MB`, 'critical');
    } else if (memoryUsage > memoryWarning) {
      this.listeners.onPerformanceIssue?.(`Memory warning: ${memoryUsage}MB`, 'warning');
    }
  }

  private adaptQualityIfNeeded() {
    const now = Date.now();
    if (now - this.lastAdaptation < this.adaptationCooldown) {
      return;
    }
    
    const avgFPS = this.getAverageFPS();
    const targetFPS = this.currentSettings.frameRateTarget;
    const fpsRatio = avgFPS / targetFPS;
    
    let needsAdaptation = false;
    let newSettings = { ...this.currentSettings };
    
    // Adapt based on performance
    if (fpsRatio < 0.8) {
      // Performance is poor, reduce quality
      newSettings = this.reduceQuality(newSettings);
      needsAdaptation = true;
    } else if (fpsRatio > 1.1 && this.canIncreaseQuality()) {
      // Performance is good, potentially increase quality
      newSettings = this.increaseQuality(newSettings);
      needsAdaptation = true;
    }
    
    // Adapt based on thermal state
    if (this.currentMetrics.thermalState === 'serious' || this.currentMetrics.thermalState === 'critical') {
      newSettings = this.applyThermalThrottling(newSettings);
      needsAdaptation = true;
    }
    
    if (needsAdaptation) {
      this.applyQualitySettings(newSettings);
      this.lastAdaptation = now;
    }
  }

  private getAverageFPS(): number {
    if (this.performanceHistory.length === 0) return 60;
    return this.performanceHistory.reduce((sum, fps) => sum + fps, 0) / this.performanceHistory.length;
  }

  private canIncreaseQuality(): boolean {
    // Only increase quality if we've been stable for a while
    return this.performanceHistory.length >= 10 && 
           this.performanceHistory.slice(-10).every(fps => fps > this.currentSettings.frameRateTarget * 0.9);
  }

  private reduceQuality(settings: AdaptiveQualitySettings): AdaptiveQualitySettings {
    const newSettings = { ...settings };
    
    // Progressive quality reduction
    if (newSettings.renderScale > 0.5) {
      newSettings.renderScale = Math.max(0.5, newSettings.renderScale - 0.1);
    }
    
    if (newSettings.particleCount > 50) {
      newSettings.particleCount = Math.max(50, Math.floor(newSettings.particleCount * 0.8));
    }
    
    if (newSettings.shadowQuality !== 'none') {
      const qualities = ['none', 'low', 'medium'];
      const currentIndex = qualities.indexOf(newSettings.shadowQuality);
      if (currentIndex > 0) {
        newSettings.shadowQuality = qualities[currentIndex - 1] as 'none' | 'low' | 'medium' | 'high';
      }
    }
    
    if (newSettings.textureQuality > 128) {
      newSettings.textureQuality = Math.max(128, newSettings.textureQuality / 2) as number;
    }
    
    newSettings.lodBias = Math.min(3.0, newSettings.lodBias + 0.2);
    newSettings.animationSpeed = Math.max(0.3, newSettings.animationSpeed - 0.1);
    
    return newSettings;
  }

  private increaseQuality(settings: AdaptiveQualitySettings): AdaptiveQualitySettings {
    const newSettings = { ...settings };
    
    // Conservative quality increase
    if (newSettings.renderScale < 1.0) {
      newSettings.renderScale = Math.min(1.0, newSettings.renderScale + 0.05);
    }
    
    if (newSettings.particleCount < 800) {
      newSettings.particleCount = Math.min(800, Math.floor(newSettings.particleCount * 1.1));
    }
    
    if (newSettings.shadowQuality !== 'medium') {
      const qualities = ['none', 'low', 'medium'];
      const currentIndex = qualities.indexOf(newSettings.shadowQuality);
      if (currentIndex < qualities.length - 1) {
        newSettings.shadowQuality = qualities[currentIndex + 1] as 'none' | 'low' | 'medium' | 'high';
      }
    }
    
    if (newSettings.textureQuality < 512) {
      newSettings.textureQuality = Math.min(512, newSettings.textureQuality * 2) as number;
    }
    
    newSettings.lodBias = Math.max(1.0, newSettings.lodBias - 0.1);
    newSettings.animationSpeed = Math.min(1.0, newSettings.animationSpeed + 0.05);
    
    return newSettings;
  }

  private applyThermalThrottling(settings: AdaptiveQualitySettings): AdaptiveQualitySettings {
    return {
      ...settings,
      renderScale: Math.min(settings.renderScale, 0.7),
      shadowQuality: 'none',
      particleCount: Math.min(settings.particleCount, 200),
      animationSpeed: Math.min(settings.animationSpeed, 0.5),
      frameRateTarget: 30
    };
  }

  private temporarilyReduceQuality() {
    const reducedSettings = this.reduceQuality(this.currentSettings);
    this.applyQualitySettings({
      ...reducedSettings,
      animationSpeed: 0.1 // Minimal animations when hidden
    });
  }

  private restoreQuality() {
    // Restore to baseline quality
    if (this.mobileProfile) {
      const baselineSettings = this.generateInitialSettings(this.mobileProfile);
      this.applyQualitySettings(baselineSettings);
    }
  }

  private adaptToOrientation() {
    if (this.currentMetrics.deviceOrientation === 'landscape' && this.mobileProfile?.isMobile) {
      // Potentially reduce quality in landscape mode due to higher resolution
      const landscapeSettings = { ...this.currentSettings };
      landscapeSettings.renderScale *= 0.9;
      this.applyQualitySettings(landscapeSettings);
    }
  }

  private enableBatterySavingMode() {
    const batterySavingSettings: AdaptiveQualitySettings = {
      renderScale: 0.6,
      shadowQuality: 'none',
      particleCount: 100,
      animationSpeed: 0.3,
      textureQuality: 128,
      lodBias: 2.0,
      enablePostProcessing: false,
      frameRateTarget: 30
    };
    
    this.applyQualitySettings(batterySavingSettings);
  }

  private disableBatterySavingMode() {
    if (this.mobileProfile) {
      const normalSettings = this.generateInitialSettings(this.mobileProfile);
      this.applyQualitySettings(normalSettings);
    }
  }

  private applyQualitySettings(settings: AdaptiveQualitySettings) {
    this.currentSettings = settings;
    this.listeners.onQualityChange?.(settings);
  }

  // Public API
  getCurrentMetrics(): MobilePerformanceMetrics {
    return { ...this.currentMetrics };
  }

  getCurrentSettings(): AdaptiveQualitySettings {
    return { ...this.currentSettings };
  }

  getThresholds(): PerformanceThresholds {
    return { ...this.thresholds };
  }

  setEventListeners(listeners: typeof this.listeners) {
    this.listeners = { ...this.listeners, ...listeners };
  }

  forceQualityReduction() {
    const reducedSettings = this.reduceQuality(this.currentSettings);
    this.applyQualitySettings(reducedSettings);
  }

  forceQualityIncrease() {
    if (this.canIncreaseQuality()) {
      const increasedSettings = this.increaseQuality(this.currentSettings);
      this.applyQualitySettings(increasedSettings);
    }
  }

  resetToBaseline() {
    if (this.mobileProfile) {
      const baselineSettings = this.generateInitialSettings(this.mobileProfile);
      this.applyQualitySettings(baselineSettings);
    }
  }
}

// Export singleton instance
export const mobilePerformanceMonitor = MobilePerformanceMonitor.getInstance();