'use client';

import { useEffect, useState, ReactNode } from 'react';
import { mobileDetection, MobileProfile } from '@/lib/mobileDetection';

interface FallbackRendererProps {
  children: ReactNode;
  fallback2D?: ReactNode;
  fallbackMinimal?: ReactNode;
  forceMode?: 'auto' | '3d' | '2d' | 'minimal';
}

interface FallbackSettings {
  renderMode: '3d' | '2d' | 'minimal';
  enableAnimations: boolean;
  enableParticles: boolean;
  enableTransitions: boolean;
  imageQuality: 'high' | 'medium' | 'low';
  textAnimations: boolean;
}

export const FallbackRenderer: React.FC<FallbackRendererProps> = ({
  children,
  fallback2D,
  fallbackMinimal,
  forceMode = 'auto'
}) => {
  const [mobileProfile, setMobileProfile] = useState<MobileProfile | null>(null);
  const [fallbackSettings, setFallbackSettings] = useState<FallbackSettings | null>(null);
  const [performanceScore, setPerformanceScore] = useState<number>(0);

  // Initialize mobile detection and performance assessment
  useEffect(() => {
    const profile = mobileDetection.getProfile() || mobileDetection.initialize();
    setMobileProfile(profile);

    // Assess device performance
    const score = calculatePerformanceScore(profile);
    setPerformanceScore(score);

    // Determine fallback settings
    const settings = determineFallbackSettings(profile, score, forceMode);
    setFallbackSettings(settings);

    // Listen for profile changes
    const handleProfileChange = (newProfile: MobileProfile) => {
      setMobileProfile(newProfile);
      const newScore = calculatePerformanceScore(newProfile);
      setPerformanceScore(newScore);
      const newSettings = determineFallbackSettings(newProfile, newScore, forceMode);
      setFallbackSettings(newSettings);
    };

    mobileDetection.addProfileListener(handleProfileChange);

    return () => {
      mobileDetection.removeProfileListener(handleProfileChange);
    };
  }, [forceMode]);

  // Calculate performance score based on device capabilities
  const calculatePerformanceScore = (profile: MobileProfile): number => {
    let score = 0;

    // Base score from performance tier
    switch (profile.performance.tier) {
      case 'high':
        score += 60;
        break;
      case 'medium':
        score += 40;
        break;
      case 'low':
        score += 20;
        break;
    }

    // GPU type bonus
    if (profile.performance.estimatedGPU === 'discrete') {
      score += 20;
    }

    // Memory bonus
    const memoryGB = profile.performance.memoryLimit / 1024;
    if (memoryGB >= 0.5) score += 10;
    if (memoryGB >= 1) score += 10;

    // WebGL2 support bonus
    if (profile.capabilities.supportsWebGL2) {
      score += 10;
    }

    // Screen size penalty for very small screens
    if (profile.screenSize === 'small') {
      score -= 15;
    }

    // Mobile penalty for complex 3D
    if (profile.isMobile) {
      score -= 20;
    }

    // Reduced motion penalty
    if (profile.capabilities.prefersReducedMotion) {
      score -= 15;
    }

    return Math.max(0, Math.min(100, score));
  };

  // Determine appropriate fallback settings
  const determineFallbackSettings = (
    profile: MobileProfile, 
    score: number, 
    mode: string
  ): FallbackSettings => {
    // Force mode override
    if (mode !== 'auto') {
      return createSettingsForMode(mode as '3d' | '2d' | 'minimal', profile);
    }

    // Auto-determine based on performance score
    if (score >= 70) {
      return createSettingsForMode('3d', profile);
    } else if (score >= 40) {
      return createSettingsForMode('2d', profile);
    } else {
      return createSettingsForMode('minimal', profile);
    }
  };

  const createSettingsForMode = (mode: '3d' | '2d' | 'minimal', profile: MobileProfile): FallbackSettings => {
    const isLowEnd = profile.performance.tier === 'low';
    const isMobile = profile.isMobile;
    const prefersReducedMotion = profile.capabilities.prefersReducedMotion;

    switch (mode) {
      case '3d':
        return {
          renderMode: '3d',
          enableAnimations: !prefersReducedMotion && !isLowEnd,
          enableParticles: !isMobile && !isLowEnd,
          enableTransitions: !prefersReducedMotion,
          imageQuality: isLowEnd ? 'low' : isMobile ? 'medium' : 'high',
          textAnimations: !prefersReducedMotion && !isLowEnd
        };

      case '2d':
        return {
          renderMode: '2d',
          enableAnimations: !prefersReducedMotion,
          enableParticles: false,
          enableTransitions: !prefersReducedMotion,
          imageQuality: isLowEnd ? 'low' : 'medium',
          textAnimations: !prefersReducedMotion
        };

      case 'minimal':
        return {
          renderMode: 'minimal',
          enableAnimations: false,
          enableParticles: false,
          enableTransitions: false,
          imageQuality: 'low',
          textAnimations: false
        };

      default:
        return createSettingsForMode('2d', profile);
    }
  };

  // Generate CSS classes based on fallback settings
  const getFallbackClasses = (): string => {
    if (!fallbackSettings || !mobileProfile) return '';

    const classes = [];
    
    classes.push(`fallback-${fallbackSettings.renderMode}`);
    
    if (!fallbackSettings.enableAnimations) classes.push('fallback-no-animations');
    if (!fallbackSettings.enableParticles) classes.push('fallback-no-particles');
    if (!fallbackSettings.enableTransitions) classes.push('fallback-no-transitions');
    if (!fallbackSettings.textAnimations) classes.push('fallback-no-text-animations');
    
    classes.push(`fallback-quality-${fallbackSettings.imageQuality}`);
    classes.push(`fallback-performance-${mobileProfile.performance.tier}`);
    
    return classes.join(' ');
  };

  // Create 2D fallback content
  const create2DFallback = () => {
    if (fallback2D) return fallback2D;

    return (
      <div className="fallback-2d-content">
        <div className="fallback-sections">
          {/* Section 1: Identity */}
          <section className="fallback-section fallback-identity">
            <div className="fallback-visual">
              <div className="fallback-circle-abstract"></div>
            </div>
            <div className="fallback-text">
              <h1>No soy programador...</h1>
              <p>AI Engineering.</p>
            </div>
          </section>

          {/* Section 2: Origin */}
          <section className="fallback-section fallback-origin">
            <div className="fallback-visual">
              <div className="fallback-maps">
                <div className="fallback-map fallback-puno"></div>
                <div className="fallback-connection"></div>
                <div className="fallback-map fallback-appenweier"></div>
              </div>
            </div>
            <div className="fallback-text">
              <h2>Entre Puno y Appenweier</h2>
              <p>Dos mundos, una perspectiva única.</p>
            </div>
          </section>

          {/* Section 3: Mission */}
          <section className="fallback-section fallback-mission">
            <div className="fallback-visual">
              <div className="fallback-gears">
                <div className="fallback-gear"></div>
                <div className="fallback-gear"></div>
                <div className="fallback-gear"></div>
              </div>
            </div>
            <div className="fallback-text">
              <h2>Sistemas Invisibles</h2>
              <p>Diseño soluciones que respetan lo humano.</p>
            </div>
          </section>

          {/* Section 4: Present */}
          <section className="fallback-section fallback-present">
            <div className="fallback-visual">
              <div className="fallback-data-flow"></div>
            </div>
            <div className="fallback-text">
              <h2>Ríos de datos</h2>
              <p>Herramientas que fluyen con propósito.</p>
            </div>
          </section>

          {/* Section 5: Vision */}
          <section className="fallback-section fallback-vision">
            <div className="fallback-visual">
              <div className="fallback-city"></div>
            </div>
            <div className="fallback-text">
              <h2>Ciudad Modular</h2>
              <p>El futuro se construye pieza a pieza.</p>
            </div>
          </section>

          {/* Section 6: CTA */}
          <section className="fallback-section fallback-cta">
            <div className="fallback-text">
              <h2>Inicia la conversación</h2>
              <p>Construyamos algo extraordinario juntos.</p>
            </div>
          </section>
        </div>
      </div>
    );
  };

  // Create minimal fallback content
  const createMinimalFallback = () => {
    if (fallbackMinimal) return fallbackMinimal;

    return (
      <div className="fallback-minimal-content">
        <header className="fallback-header">
          <h1>Engelbert Huber</h1>
          <p>AI Engineering</p>
        </header>

        <main className="fallback-main">
          <section>
            <h2>Identidad</h2>
            <p>AI Engineering.</p>
          </section>

          <section>
            <h2>Origen</h2>
            <p>Entre Puno (Perú) y Appenweier (Alemania). Dos mundos, una perspectiva única.</p>
          </section>

          <section>
            <h2>Misión</h2>
            <p>Diseño sistemas invisibles que respetan lo humano.</p>
          </section>

          <section>
            <h2>Presente</h2>
            <p>Ríos de datos fluyendo, herramientas con propósito.</p>
          </section>

          <section>
            <h2>Visión</h2>
            <p>Una ciudad modular que se construye pieza a pieza.</p>
          </section>

          <section>
            <h2>Contacto</h2>
            <p>Inicia la conversación. Construyamos algo extraordinario juntos.</p>
          </section>
        </main>
      </div>
    );
  };

  // Don't render until we have settings
  if (!fallbackSettings || !mobileProfile) {
    return null;
  }

  return (
    <div className={`fallback-renderer ${getFallbackClasses()}`}>
      {fallbackSettings.renderMode === '3d' && children}
      {fallbackSettings.renderMode === '2d' && create2DFallback()}
      {fallbackSettings.renderMode === 'minimal' && createMinimalFallback()}

      {/* Performance indicator for development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fallback-debug">
          <div>Mode: {fallbackSettings.renderMode}</div>
          <div>Score: {performanceScore}</div>
          <div>Tier: {mobileProfile.performance.tier}</div>
        </div>
      )}

      {/* Fallback-specific styles */}
      <style jsx global>{`
        /* 2D Fallback Styles */
        .fallback-2d-content {
          min-height: 100vh;
          background: linear-gradient(135deg, #0A0A0F 0%, #1A1A2E 100%);
          color: #F8F9FA;
          font-family: system-ui, -apple-system, sans-serif;
        }

        .fallback-section {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          position: relative;
        }

        .fallback-visual {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 2rem;
        }

        .fallback-text {
          flex: 1;
          max-width: 600px;
        }

        .fallback-text h1 {
          font-size: 3rem;
          color: #E94560;
          margin-bottom: 1rem;
          line-height: 1.2;
        }

        .fallback-text h2 {
          font-size: 2.5rem;
          color: #F7B801;
          margin-bottom: 1rem;
          line-height: 1.2;
        }

        .fallback-text p {
          font-size: 1.25rem;
          line-height: 1.6;
          opacity: 0.9;
        }

        /* 2D Visual Elements */
        .fallback-circle-abstract {
          width: 300px;
          height: 300px;
          border: 3px solid #E94560;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(233, 69, 96, 0.1) 0%, transparent 70%);
          position: relative;
          animation: ${fallbackSettings.enableAnimations ? 'float 6s ease-in-out infinite' : 'none'};
        }

        .fallback-maps {
          display: flex;
          align-items: center;
          gap: 2rem;
        }

        .fallback-map {
          width: 120px;
          height: 80px;
          border-radius: 8px;
          position: relative;
        }

        .fallback-puno {
          background: linear-gradient(45deg, #8B4513, #D2691E);
        }

        .fallback-appenweier {
          background: linear-gradient(45deg, #228B22, #32CD32);
        }

        .fallback-connection {
          width: 80px;
          height: 2px;
          background: #F7B801;
          position: relative;
        }

        .fallback-gears {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .fallback-gear {
          width: 60px;
          height: 60px;
          border: 2px solid #F7B801;
          border-radius: 50%;
          position: relative;
        }

        .fallback-gear::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 20px;
          height: 20px;
          background: #F7B801;
          border-radius: 50%;
        }

        .fallback-data-flow {
          width: 250px;
          height: 150px;
          background: linear-gradient(90deg, transparent 0%, #E94560 50%, transparent 100%);
          opacity: 0.6;
          border-radius: 4px;
        }

        .fallback-city {
          width: 200px;
          height: 120px;
          background: linear-gradient(to top, #1A1A2E, #F7B801);
          clip-path: polygon(20% 100%, 80% 100%, 70% 0%, 30% 0%);
        }

        /* Minimal Fallback Styles */
        .fallback-minimal-content {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
          background: #FFFFFF;
          color: #333333;
          font-family: Georgia, serif;
          line-height: 1.6;
        }

        .fallback-header {
          text-align: center;
          margin-bottom: 3rem;
          padding-bottom: 2rem;
          border-bottom: 1px solid #E0E0E0;
        }

        .fallback-header h1 {
          font-size: 2.5rem;
          color: #E94560;
          margin-bottom: 0.5rem;
        }

        .fallback-main section {
          margin-bottom: 2rem;
        }

        .fallback-main h2 {
          font-size: 1.5rem;
          color: #F7B801;
          margin-bottom: 0.5rem;
        }

        /* Animations */
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .fallback-section {
            flex-direction: column;
            text-align: center;
            padding: 1rem;
          }

          .fallback-visual {
            margin-right: 0;
            margin-bottom: 2rem;
          }

          .fallback-text h1 {
            font-size: 2rem;
          }

          .fallback-text h2 {
            font-size: 1.75rem;
          }

          .fallback-maps {
            flex-direction: column;
            gap: 1rem;
          }

          .fallback-connection {
            width: 2px;
            height: 40px;
          }
        }

        /* No animations fallback */
        .fallback-no-animations * {
          animation: none !important;
          transition: none !important;
        }

        /* Debug info */
        .fallback-debug {
          position: fixed;
          top: 10px;
          right: 10px;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 10px;
          border-radius: 4px;
          font-size: 12px;
          z-index: 1000;
        }
      `}</style>
    </div>
  );
};