'use client';

/**
 * Comprehensive mobile device detection and optimization system
 * Handles device capabilities, screen sizes, touch support, and performance profiling
 */

export interface MobileProfile {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  hasTouch: boolean;
  screenSize: 'small' | 'medium' | 'large' | 'xlarge';
  devicePixelRatio: number;
  viewport: {
    width: number;
    height: number;
    aspectRatio: number;
  };
  performance: {
    tier: 'low' | 'medium' | 'high';
    estimatedGPU: 'integrated' | 'discrete';
    memoryLimit: number;
    recommendedQuality: 'low' | 'medium' | 'high';
  };
  capabilities: {
    supportsWebGL2: boolean;
    maxTextureSize: number;
    supportsHardwareAcceleration: boolean;
    supportsPointerEvents: boolean;
    prefersReducedMotion: boolean;
  };
  browser: {
    name: string;
    version: string;
    engine: string;
  };
}

export interface MobileOptimizations {
  maxPolygons: number;
  textureResolution: number;
  particleCount: number;
  shadowQuality: 'none' | 'low' | 'medium' | 'high';
  enablePostProcessing: boolean;
  pixelRatio: number;
  frameRate: number;
  enableParticles: boolean;
  enableShake: boolean;
  enableDynamicLighting: boolean;
  lodBias: number;
}

class MobileDetectionManager {
  private static instance: MobileDetectionManager;
  private profile: MobileProfile | null = null;
  private optimizations: MobileOptimizations | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private listeners: Array<(profile: MobileProfile) => void> = [];

  static getInstance(): MobileDetectionManager {
    if (!MobileDetectionManager.instance) {
      MobileDetectionManager.instance = new MobileDetectionManager();
    }
    return MobileDetectionManager.instance;
  }

  initialize(): MobileProfile {
    if (this.profile) return this.profile;

    this.profile = this.detectDevice();
    this.optimizations = this.calculateOptimizations(this.profile);
    this.setupViewportListener();
    
    console.log('📱 Mobile Detection initialized:', this.profile);
    return this.profile;
  }

  private detectDevice(): MobileProfile {
    const userAgent = navigator.userAgent;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const devicePixelRatio = window.devicePixelRatio || 1;

    // Device type detection
    const isMobile = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) || width < 768;
    const isTablet = /iPad|Android/i.test(userAgent) && width >= 768 && width < 1024;
    const isDesktop = !isMobile && !isTablet;

    // Touch support
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Screen size categorization
    let screenSize: 'small' | 'medium' | 'large' | 'xlarge';
    if (width < 640) screenSize = 'small';
    else if (width < 1024) screenSize = 'medium';
    else if (width < 1440) screenSize = 'large';
    else screenSize = 'xlarge';

    // Browser detection
    const browser = this.detectBrowser(userAgent);

    // Capabilities detection
    const capabilities = this.detectCapabilities();

    // Performance profiling
    const performance = this.profilePerformance(isMobile, isTablet, capabilities);

    return {
      isMobile,
      isTablet,
      isDesktop,
      hasTouch,
      screenSize,
      devicePixelRatio,
      viewport: {
        width,
        height,
        aspectRatio: width / height
      },
      performance,
      capabilities,
      browser
    };
  }

  private detectBrowser(userAgent: string) {
    let name = 'Unknown';
    let version = '0';
    let engine = 'Unknown';

    if (userAgent.includes('Chrome')) {
      name = 'Chrome';
      engine = 'Blink';
      version = userAgent.match(/Chrome\/(\d+)/)?.[1] || '0';
    } else if (userAgent.includes('Firefox')) {
      name = 'Firefox';
      engine = 'Gecko';
      version = userAgent.match(/Firefox\/(\d+)/)?.[1] || '0';
    } else if (userAgent.includes('Safari')) {
      name = 'Safari';
      engine = 'WebKit';
      version = userAgent.match(/Version\/(\d+)/)?.[1] || '0';
    } else if (userAgent.includes('Edge')) {
      name = 'Edge';
      engine = 'Blink';
      version = userAgent.match(/Edge\/(\d+)/)?.[1] || '0';
    }

    return { name, version, engine };
  }

  private detectCapabilities() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    
    let maxTextureSize = 1024;
    let supportsWebGL2 = false;
    
    if (gl) {
      supportsWebGL2 = gl instanceof WebGL2RenderingContext;
      maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    }

    return {
      supportsWebGL2,
      maxTextureSize,
      supportsHardwareAcceleration: !!gl,
      supportsPointerEvents: 'PointerEvent' in window,
      prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
    };
  }

  private profilePerformance(isMobile: boolean, isTablet: boolean, _capabilities: unknown) {
    let tier: 'low' | 'medium' | 'high' = 'medium';
    let estimatedGPU: 'integrated' | 'discrete' = 'integrated';
    let memoryLimit = 256; // MB
    let recommendedQuality: 'low' | 'medium' | 'high' = 'medium';

    // Enhanced mobile device detection with specific models
    if (isMobile) {
      tier = this.profileMobilePerformance();
      recommendedQuality = tier === 'high' ? 'medium' : 'low'; // Conservative on mobile
      memoryLimit = this.estimateMobileMemory();
    } else if (isTablet) {
      tier = this.profileTabletPerformance();
      recommendedQuality = tier === 'high' ? 'medium' : 'low';
      memoryLimit = Math.max(256, this.estimateMobileMemory());
    } else {
      // Enhanced desktop GPU detection
      const gpuInfo = this.detectGPUInfo();
      estimatedGPU = gpuInfo.type;
      tier = gpuInfo.tier;
      recommendedQuality = gpuInfo.recommendedQuality;
      memoryLimit = gpuInfo.memoryEstimate;

      // Consider device pixel ratio and screen size for desktop
      if (window.devicePixelRatio > 2 && window.innerWidth > 1440) {
        // High-res display needs more conservative settings
        if (tier === 'high') tier = 'medium';
        if (recommendedQuality === 'high') recommendedQuality = 'medium';
      }
    }

    // Enhanced memory estimation
    const deviceMemory = this.getDeviceMemory();
    if (deviceMemory.available) {
      memoryLimit = this.calculateOptimalMemoryLimit(deviceMemory.amount, tier, isMobile);
      
      // Adjust tier based on memory constraints
      if (deviceMemory.amount < 4 && tier === 'high') {
        tier = 'medium';
        recommendedQuality = 'medium';
      } else if (deviceMemory.amount < 2 && tier === 'medium') {
        tier = 'low';
        recommendedQuality = 'low';
      }
    }

    return {
      tier,
      estimatedGPU,
      memoryLimit,
      recommendedQuality
    };
  }

  private profileMobilePerformance(): 'low' | 'medium' | 'high' {
    const userAgent = navigator.userAgent;
    // const platform = navigator.platform;
    
    // iOS device detection - generally higher performance
    if (/iPhone|iPad|iPod/i.test(userAgent)) {
      // Check for newer iOS devices
      if (/iPhone1[2-9]|iPhone[2-9][0-9]|iPad[7-9]|iPadPro/i.test(userAgent)) {
        return 'high'; // Recent iPhones and iPads
      } else if (/iPhone[8-9]|iPhone1[01]|iPad[4-6]/i.test(userAgent)) {
        return 'medium'; // Mid-range iOS devices
      }
      return 'low'; // Older iOS devices
    }
    
    // Android device detection
    if (/Android/i.test(userAgent)) {
      // Check Android version
      const androidVersion = userAgent.match(/Android (\d+(?:\.\d+)?)/)?.[1];
      const version = androidVersion ? parseFloat(androidVersion) : 0;
      
      // High-end Android detection
      if (/Pixel [4-9]|Galaxy S[1-2][0-9]|Galaxy Note[1-2][0-9]|OnePlus [7-9]/i.test(userAgent)) {
        return version >= 10 ? 'high' : 'medium';
      }
      
      // Mid-range Android
      if (version >= 9 && /Pixel [2-3]|Galaxy S[8-9]|Galaxy Note[8-9]/i.test(userAgent)) {
        return 'medium';
      }
      
      // Check for known low-end indicators
      if (version < 8 || /Go|Lite|Mini/i.test(userAgent)) {
        return 'low';
      }
      
      return version >= 10 ? 'medium' : 'low';
    }
    
    // Default for unknown mobile devices
    return 'low';
  }

  private profileTabletPerformance(): 'low' | 'medium' | 'high' {
    const userAgent = navigator.userAgent;
    
    // iPad detection
    if (/iPad/i.test(userAgent)) {
      if (/iPadPro|iPad.*Air.*[4-9]|iPad.*[1-2][0-9]/i.test(userAgent)) {
        return 'high'; // iPad Pro and recent Air models
      } else if (/iPad.*Air|iPad.*[7-9]/i.test(userAgent)) {
        return 'medium'; // iPad Air and mid-range iPads
      }
      return 'medium'; // Default for iPads is medium
    }
    
    // Android tablets
    if (/Android.*Tablet|Android.*Tab/i.test(userAgent)) {
      const androidVersion = userAgent.match(/Android (\d+(?:\.\d+)?)/)?.[1];
      const version = androidVersion ? parseFloat(androidVersion) : 0;
      
      return version >= 10 ? 'medium' : 'low';
    }
    
    return 'medium';
  }

  private detectGPUInfo(): {
    type: 'integrated' | 'discrete';
    tier: 'low' | 'medium' | 'high';
    recommendedQuality: 'low' | 'medium' | 'high';
    memoryEstimate: number;
  } {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    let type: 'integrated' | 'discrete' = 'integrated';
    let tier: 'low' | 'medium' | 'high' = 'medium';
    let recommendedQuality: 'low' | 'medium' | 'high' = 'medium';
    let memoryEstimate = 256;
    
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();
        // const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL).toLowerCase();
        
        // Enhanced GPU detection patterns
        const discretePatterns = [
          // NVIDIA
          /geforce rtx [3-4][0-9][0-9][0-9]/i, // RTX 3000/4000 series - high end
          /geforce rtx [2][0-9][0-9][0-9]/i,   // RTX 2000 series - high end
          /geforce gtx 1[6-9][0-9][0-9]/i,     // GTX 1600+ series - medium-high
          /geforce gtx [9][0-9][0-9]|geforce gtx 1[0-5][0-9][0-9]/i, // GTX 900-1500 series - medium
          /quadro|tesla|titan/i,               // Professional cards - high
          
          // AMD
          /radeon rx [6-7][0-9][0-9][0-9]/i,   // RX 6000/7000 series - high
          /radeon rx [5][0-9][0-9][0-9]/i,     // RX 5000 series - medium-high
          /radeon rx [4][0-9][0-9]/i,          // RX 400 series - medium
          /radeon pro|firepro/i,               // Professional cards - high
          
          // Intel Arc
          /arc a[0-9][0-9][0-9]/i              // Intel Arc series - medium
        ];
        
        const integratedPatterns = [
          // Intel integrated
          /intel.*uhd.*[6-7][0-9][0-9]/i,      // Recent UHD - medium
          /intel.*iris.*xe/i,                  // Iris Xe - medium
          /intel.*iris.*[5-6][0-9][0-9]/i,     // Iris 500/600 - low-medium
          /intel.*hd.*[4-6][0-9][0-9]/i,       // HD 400-600 - low
          
          // AMD integrated
          /amd.*vega.*[1-8][0-9]/i,            // Vega 8+ - medium
          /amd.*vega.*[1-7]/i,                 // Vega 1-7 - low
          /amd.*radeon.*graphics/i,            // Generic AMD integrated - low
          
          // Apple Silicon
          /apple.*m[1-2]/i                     // M1/M2 - high (for integrated)
        ];
        
        // Check for discrete GPU
        for (const pattern of discretePatterns) {
          if (pattern.test(renderer)) {
            type = 'discrete';
            
            // Determine tier based on specific GPU
            if (/rtx [3-4][0-9][0-9][0-9]|radeon rx [6-7][0-9][0-9][0-9]|quadro|tesla|titan/i.test(renderer)) {
              tier = 'high';
              recommendedQuality = 'high';
              memoryEstimate = 512;
            } else if (/rtx [2][0-9][0-9][0-9]|gtx 1[6-9][0-9][0-9]|radeon rx [5][0-9][0-9][0-9]/i.test(renderer)) {
              tier = 'high';
              recommendedQuality = 'medium';
              memoryEstimate = 384;
            } else {
              tier = 'medium';
              recommendedQuality = 'medium';
              memoryEstimate = 256;
            }
            break;
          }
        }
        
        // Check for integrated GPU if not discrete
        if (type === 'integrated') {
          for (const pattern of integratedPatterns) {
            if (pattern.test(renderer)) {
              if (/apple.*m[1-2]|intel.*iris.*xe|amd.*vega.*[1-8][0-9]/i.test(renderer)) {
                tier = 'medium';
                recommendedQuality = 'medium';
                memoryEstimate = 256;
              } else if (/intel.*uhd.*[6-7][0-9][0-9]|intel.*iris.*[5-6][0-9][0-9]/i.test(renderer)) {
                tier = 'low';
                recommendedQuality = 'low';
                memoryEstimate = 128;
              } else {
                tier = 'low';
                recommendedQuality = 'low';
                memoryEstimate = 64;
              }
              break;
            }
          }
        }
      }
    }
    
    return { type, tier, recommendedQuality, memoryEstimate };
  }

  private getDeviceMemory(): { available: boolean; amount: number } {
    const memory = (navigator as { deviceMemory?: number }).deviceMemory;
    if (typeof memory === 'number') {
      return { available: true, amount: memory };
    }
    
    // Fallback estimation based on other factors
    const estimate = this.estimateMemoryFromPlatform();
    return { available: false, amount: estimate };
  }

  private estimateMemoryFromPlatform(): number {
    const userAgent = navigator.userAgent;
    const cores = navigator.hardwareConcurrency || 4;
    
    // Mobile estimation
    if (/iPhone|iPad|iPod/i.test(userAgent)) {
      if (/iPhone1[2-9]|iPadPro/i.test(userAgent)) return 6; // Recent devices
      if (/iPhone[1-8][0-1]|iPad/i.test(userAgent)) return 4; // Mid-range
      return 2; // Older devices
    }
    
    if (/Android/i.test(userAgent)) {
      const version = userAgent.match(/Android (\d+)/)?.[1];
      if (version && parseInt(version) >= 10) return 4;
      return 2;
    }
    
    // Desktop estimation based on cores
    if (cores >= 8) return 16;
    if (cores >= 6) return 8;
    if (cores >= 4) return 4;
    return 2;
  }

  private estimateMobileMemory(): number {
    const memory = this.getDeviceMemory();
    if (memory.available) {
      // Reserve more memory for system on mobile
      return Math.max(64, Math.floor(memory.amount * 1024 * 0.3)); // 30% of system memory
    }
    
    // Conservative fallback for mobile
    return 128;
  }

  private calculateOptimalMemoryLimit(systemMemory: number, tier: 'low' | 'medium' | 'high', isMobile: boolean): number {
    const totalMemoryMB = systemMemory * 1024;
    const reserveRatio = isMobile ? 0.7 : 0.5; // Reserve more on mobile
    const availableMemory = totalMemoryMB * (1 - reserveRatio);
    
    // Limit based on performance tier
    let maxMemory: number;
    switch (tier) {
      case 'high':
        maxMemory = isMobile ? 512 : 1024;
        break;
      case 'medium':
        maxMemory = isMobile ? 256 : 512;
        break;
      case 'low':
        maxMemory = isMobile ? 128 : 256;
        break;
    }
    
    return Math.min(availableMemory, maxMemory);
  }

  private calculateOptimizations(profile: MobileProfile): MobileOptimizations {
    const { performance, capabilities, screenSize, devicePixelRatio } = profile;

    // Base optimizations based on performance tier
    let optimizations: MobileOptimizations;
    
    switch (performance.tier) {
      case 'low':
        optimizations = {
          maxPolygons: 5000,
          textureResolution: 128,
          particleCount: 100,
          shadowQuality: 'none',
          enablePostProcessing: false,
          pixelRatio: Math.min(devicePixelRatio, 1),
          frameRate: 30,
          enableParticles: false,
          enableShake: false,
          enableDynamicLighting: false,
          lodBias: 2.0
        };
        break;
        
      case 'medium':
        optimizations = {
          maxPolygons: 15000,
          textureResolution: 256,
          particleCount: 300,
          shadowQuality: 'low',
          enablePostProcessing: false,
          pixelRatio: Math.min(devicePixelRatio, 1.5),
          frameRate: 60,
          enableParticles: true,
          enableShake: false,
          enableDynamicLighting: true,
          lodBias: 1.5
        };
        break;
        
      case 'high':
      default:
        optimizations = {
          maxPolygons: 30000,
          textureResolution: 512,
          particleCount: 800,
          shadowQuality: 'medium',
          enablePostProcessing: false, // Still disabled per constraints
          pixelRatio: Math.min(devicePixelRatio, 2),
          frameRate: 60,
          enableParticles: true,
          enableShake: true,
          enableDynamicLighting: true,
          lodBias: 1.0
        };
    }

    // Screen size adjustments
    if (screenSize === 'small') {
      optimizations.maxPolygons *= 0.5;
      optimizations.particleCount *= 0.3;
      optimizations.textureResolution = Math.min(optimizations.textureResolution, 128);
    }

    // Capability adjustments
    if (capabilities.prefersReducedMotion) {
      optimizations.enableShake = false;
      optimizations.enableParticles = false;
      optimizations.frameRate = 30;
    }

    if (!capabilities.supportsWebGL2) {
      optimizations.maxPolygons *= 0.7;
      optimizations.shadowQuality = 'none';
    }

    return optimizations;
  }

  private setupViewportListener() {
    // Handle orientation changes and window resizes
    const updateViewport = () => {
      if (!this.profile) return;

      const width = window.innerWidth;
      const height = window.innerHeight;
      
      this.profile.viewport = {
        width,
        height,
        aspectRatio: width / height
      };

      // Update screen size category
      if (width < 640) this.profile.screenSize = 'small';
      else if (width < 1024) this.profile.screenSize = 'medium';
      else if (width < 1440) this.profile.screenSize = 'large';
      else this.profile.screenSize = 'xlarge';

      // Recalculate optimizations
      this.optimizations = this.calculateOptimizations(this.profile);

      // Notify listeners
      this.listeners.forEach(listener => listener(this.profile!));
    };

    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);

    // Use ResizeObserver if available for more responsive updates
    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(updateViewport);
      this.resizeObserver.observe(document.documentElement);
    }
  }

  getProfile(): MobileProfile | null {
    return this.profile;
  }

  getOptimizations(): MobileOptimizations | null {
    return this.optimizations;
  }

  isMobileDevice(): boolean {
    return this.profile?.isMobile || false;
  }

  isTabletDevice(): boolean {
    return this.profile?.isTablet || false;
  }

  hasTouch(): boolean {
    return this.profile?.hasTouch || false;
  }

  getRecommendedQuality(): 'low' | 'medium' | 'high' {
    return this.profile?.performance.recommendedQuality || 'medium';
  }

  shouldUseMobileOptimizations(): boolean {
    return this.profile?.isMobile || this.profile?.performance.tier === 'low' || false;
  }

  addProfileListener(listener: (profile: MobileProfile) => void) {
    this.listeners.push(listener);
  }

  removeProfileListener(listener: (profile: MobileProfile) => void) {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  // Touch gesture detection helpers
  detectTouchGesture(touches: TouchList, lastTouches: TouchList | null) {
    if (!touches || touches.length === 0) return null;

    if (touches.length === 1) {
      // Single touch - scroll/pan
      return 'pan';
    } else if (touches.length === 2 && lastTouches && lastTouches.length === 2) {
      // Two finger - pinch/zoom
      const currentDistance = this.getTouchDistance(touches);
      const lastDistance = this.getTouchDistance(lastTouches);
      
      if (Math.abs(currentDistance - lastDistance) > 10) {
        return currentDistance > lastDistance ? 'pinch-out' : 'pinch-in';
      }
    }

    return null;
  }

  private getTouchDistance(touches: TouchList): number {
    if (touches.length < 2) return 0;
    
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  destroy() {
    window.removeEventListener('resize', () => {});
    window.removeEventListener('orientationchange', () => {});
    
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    
    this.listeners = [];
  }
}

// Export singleton instance
export const mobileDetection = MobileDetectionManager.getInstance();

// Export utility functions
export const isMobile = () => mobileDetection.isMobileDevice();
export const isTablet = () => mobileDetection.isTabletDevice();
export const hasTouch = () => mobileDetection.hasTouch();
export const shouldOptimizeForMobile = () => mobileDetection.shouldUseMobileOptimizations();
export const getMobileOptimizations = () => mobileDetection.getOptimizations();
export const getMobileProfile = () => mobileDetection.getProfile();