'use client';

import { useEffect, useState, useRef, ReactNode } from 'react';
import { mobileDetection, MobileProfile } from '@/lib/mobileDetection';

interface ResponsiveLayoutProps {
  children: ReactNode;
  className?: string;
}

interface ViewportDimensions {
  width: number;
  height: number;
  aspectRatio: number;
  orientation: 'portrait' | 'landscape';
  safeArea: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

interface ResponsiveSettings {
  fontSize: {
    base: string;
    heading: string;
    small: string;
  };
  spacing: {
    section: string;
    padding: string;
    margin: string;
  };
  layout: {
    containerMaxWidth: string;
    sectionHeight: string;
    textWidth: string;
  };
  animation: {
    duration: string;
    easing: string;
    reduceMotion: boolean;
  };
}

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({ 
  children, 
  className = '' 
}) => {
  const [mobileProfile, setMobileProfile] = useState<MobileProfile | null>(null);
  const [viewport, setViewport] = useState<ViewportDimensions>({
    width: 0,
    height: 0,
    aspectRatio: 1,
    orientation: 'portrait',
    safeArea: { top: 0, bottom: 0, left: 0, right: 0 }
  });
  const [responsiveSettings, setResponsiveSettings] = useState<ResponsiveSettings | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize mobile detection and viewport
  useEffect(() => {
    const profile = mobileDetection.getProfile() || mobileDetection.initialize();
    setMobileProfile(profile);
    updateViewportDimensions();

    // Listen for profile and viewport changes
    const handleProfileChange = (newProfile: MobileProfile) => {
      setMobileProfile(newProfile);
    };

    const handleResize = () => {
      updateViewportDimensions();
    };

    const handleOrientationChange = () => {
      // Delay to allow for accurate measurements after orientation change
      setTimeout(updateViewportDimensions, 100);
    };

    mobileDetection.addProfileListener(handleProfileChange);
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      mobileDetection.removeProfileListener(handleProfileChange);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  // Update viewport dimensions
  const updateViewportDimensions = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspectRatio = width / height;
    const orientation = aspectRatio > 1 ? 'landscape' : 'portrait';

    // Calculate safe area (for devices with notches, etc.)
    const safeArea = calculateSafeArea();

    setViewport({
      width,
      height,
      aspectRatio,
      orientation,
      safeArea
    });
  };

  // Calculate safe area insets for modern mobile devices
  const calculateSafeArea = () => {
    const style = getComputedStyle(document.documentElement);
    
    return {
      top: parseInt(style.getPropertyValue('--safe-area-inset-top') || '0', 10),
      bottom: parseInt(style.getPropertyValue('--safe-area-inset-bottom') || '0', 10),
      left: parseInt(style.getPropertyValue('--safe-area-inset-left') || '0', 10),
      right: parseInt(style.getPropertyValue('--safe-area-inset-right') || '0', 10)
    };
  };

  // Generate responsive settings based on profile and viewport
  useEffect(() => {
    if (!mobileProfile || !viewport.width) return;

    const settings = generateResponsiveSettings(mobileProfile, viewport);
    setResponsiveSettings(settings);
    applyResponsiveStyles(settings);
  }, [mobileProfile, viewport]);

  const generateResponsiveSettings = (
    profile: MobileProfile, 
    viewport: ViewportDimensions
  ): ResponsiveSettings => {
    const { isMobile, isTablet, screenSize, capabilities } = profile;
    const { width, height, orientation } = viewport;

    // Base font size calculation
    const baseFontSize = calculateBaseFontSize(width, isMobile, isTablet);
    
    // Typography settings
    const fontSize = {
      base: `${baseFontSize}px`,
      heading: `${baseFontSize * (isMobile ? 1.8 : 2.2)}px`,
      small: `${baseFontSize * 0.85}px`
    };

    // Spacing calculations
    const baseSpacing = isMobile ? 16 : 24;
    const spacing = {
      section: `${baseSpacing * (isMobile ? 3 : 4)}px`,
      padding: `${baseSpacing}px`,
      margin: `${baseSpacing * 0.75}px`
    };

    // Layout settings
    const layout = {
      containerMaxWidth: isMobile ? '100%' : isTablet ? '90%' : '1200px',
      sectionHeight: '100vh',
      textWidth: isMobile ? '90%' : isTablet ? '80%' : '60%'
    };

    // Animation settings based on device capabilities
    const animation = {
      duration: capabilities.prefersReducedMotion ? '0s' : 
                isMobile ? '0.3s' : '0.5s',
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      reduceMotion: capabilities.prefersReducedMotion || profile.performance.tier === 'low'
    };

    return { fontSize, spacing, layout, animation };
  };

  const calculateBaseFontSize = (width: number, isMobile: boolean, isTablet: boolean): number => {
    if (isMobile) {
      // Mobile font scaling
      if (width < 375) return 14; // Small phones
      if (width < 414) return 16; // Standard phones
      return 18; // Large phones
    } else if (isTablet) {
      // Tablet font scaling
      if (width < 768) return 16;
      if (width < 1024) return 18;
      return 20;
    } else {
      // Desktop font scaling
      if (width < 1440) return 16;
      if (width < 1920) return 18;
      return 20; // Large desktop displays
    }
  };

  const applyResponsiveStyles = (settings: ResponsiveSettings) => {
    const root = document.documentElement;
    
    // Apply CSS custom properties for responsive design
    root.style.setProperty('--responsive-font-base', settings.fontSize.base);
    root.style.setProperty('--responsive-font-heading', settings.fontSize.heading);
    root.style.setProperty('--responsive-font-small', settings.fontSize.small);
    
    root.style.setProperty('--responsive-spacing-section', settings.spacing.section);
    root.style.setProperty('--responsive-spacing-padding', settings.spacing.padding);
    root.style.setProperty('--responsive-spacing-margin', settings.spacing.margin);
    
    root.style.setProperty('--responsive-layout-max-width', settings.layout.containerMaxWidth);
    root.style.setProperty('--responsive-layout-section-height', settings.layout.sectionHeight);
    root.style.setProperty('--responsive-layout-text-width', settings.layout.textWidth);
    
    root.style.setProperty('--responsive-animation-duration', settings.animation.duration);
    root.style.setProperty('--responsive-animation-easing', settings.animation.easing);
    
    // Safe area properties
    root.style.setProperty('--safe-area-top', `${viewport.safeArea.top}px`);
    root.style.setProperty('--safe-area-bottom', `${viewport.safeArea.bottom}px`);
    root.style.setProperty('--safe-area-left', `${viewport.safeArea.left}px`);
    root.style.setProperty('--safe-area-right', `${viewport.safeArea.right}px`);
    
    // Viewport properties
    root.style.setProperty('--viewport-width', `${viewport.width}px`);
    root.style.setProperty('--viewport-height', `${viewport.height}px`);
    root.style.setProperty('--viewport-aspect-ratio', viewport.aspectRatio.toString());
  };

  // Generate responsive classes
  const getResponsiveClasses = (): string => {
    if (!mobileProfile || !responsiveSettings) return '';

    const classes = [];
    
    // Device type classes
    if (mobileProfile.isMobile) classes.push('responsive-mobile');
    if (mobileProfile.isTablet) classes.push('responsive-tablet');
    if (mobileProfile.isDesktop) classes.push('responsive-desktop');
    
    // Screen size classes
    classes.push(`responsive-${mobileProfile.screenSize}`);
    
    // Orientation classes
    classes.push(`responsive-${viewport.orientation}`);
    
    // Performance tier classes
    classes.push(`responsive-performance-${mobileProfile.performance.tier}`);
    
    // Touch capability
    if (mobileProfile.hasTouch) classes.push('responsive-touch');
    
    // Reduced motion
    if (responsiveSettings.animation.reduceMotion) classes.push('responsive-reduced-motion');
    
    // High DPI
    if (mobileProfile.devicePixelRatio > 1.5) classes.push('responsive-high-dpi');
    
    return classes.join(' ');
  };

  // Don't render until we have responsive settings
  if (!responsiveSettings || !mobileProfile) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`responsive-layout ${getResponsiveClasses()} ${className}`}
      style={{
        // Ensure proper viewport handling
        width: '100%',
        minHeight: '100vh',
        paddingTop: `max(${viewport.safeArea.top}px, 0px)`,
        paddingBottom: `max(${viewport.safeArea.bottom}px, 0px)`,
        paddingLeft: `max(${viewport.safeArea.left}px, 0px)`,
        paddingRight: `max(${viewport.safeArea.right}px, 0px)`,
        
        // Responsive font and spacing
        fontSize: responsiveSettings.fontSize.base,
        
        // Prevent horizontal scroll on mobile
        overflowX: mobileProfile.isMobile ? 'hidden' : 'auto',
        
        // Smooth scrolling behavior
        scrollBehavior: responsiveSettings.animation.reduceMotion ? 'auto' : 'smooth',
        
        // Optimize for touch
        ...(mobileProfile.hasTouch && {
          touchAction: 'manipulation',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none'
        })
      }}
    >
      {children}
      
      {/* Responsive CSS injection */}
      <style jsx global>{`
        /* Responsive typography */
        .responsive-layout h1 {
          font-size: var(--responsive-font-heading);
          line-height: 1.2;
          margin-bottom: var(--responsive-spacing-margin);
        }
        
        .responsive-layout p {
          font-size: var(--responsive-font-base);
          line-height: 1.6;
          margin-bottom: var(--responsive-spacing-margin);
          max-width: var(--responsive-layout-text-width);
        }
        
        .responsive-layout small {
          font-size: var(--responsive-font-small);
        }
        
        /* Responsive spacing */
        .responsive-layout section {
          padding: var(--responsive-spacing-section) var(--responsive-spacing-padding);
          min-height: var(--responsive-layout-section-height);
        }
        
        /* Mobile-specific optimizations */
        .responsive-mobile {
          -webkit-text-size-adjust: 100%;
          -webkit-font-smoothing: antialiased;
        }
        
        .responsive-mobile * {
          -webkit-tap-highlight-color: transparent;
        }
        
        /* Touch-friendly elements */
        .responsive-touch button,
        .responsive-touch [role="button"] {
          min-height: 44px;
          min-width: 44px;
        }
        
        /* High DPI optimizations */
        .responsive-high-dpi {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        /* Reduced motion preferences */
        .responsive-reduced-motion *,
        .responsive-reduced-motion *::before,
        .responsive-reduced-motion *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
        
        /* Performance tier optimizations */
        .responsive-performance-low {
          transform: translateZ(0);
          backface-visibility: hidden;
        }
        
        /* Orientation-specific styles */
        .responsive-landscape.responsive-mobile {
          /* Landscape mobile optimizations */
        }
        
        .responsive-portrait.responsive-mobile {
          /* Portrait mobile optimizations */
        }
        
        /* Screen size breakpoints */
        .responsive-small {
          --responsive-max-content-width: 100%;
        }
        
        .responsive-medium {
          --responsive-max-content-width: 90%;
        }
        
        .responsive-large {
          --responsive-max-content-width: 80%;
        }
        
        .responsive-xlarge {
          --responsive-max-content-width: 70%;
        }
      `}</style>
    </div>
  );
};