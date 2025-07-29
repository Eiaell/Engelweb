'use client';

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { useCinematicScroll } from '@/hooks/useCinematicScroll';
import { usePerformance, PerformanceMonitor } from '@/contexts/PerformanceContext';
import { useAccessibility, AccessibilityControls } from '@/contexts/AccessibilityContext';
import { ScrollTextReveal } from '@/hooks/useScrollTextReveal';

/**
 * Example implementation of the cinematic scroll system
 * Demonstrates integration of all animation systems
 */
export const CinematicScrollExample: React.FC = () => {
  const {
    scrollState,
    performanceMetrics,
    currentQuality,
    isInitialized,
    scrollToSection,
    triggerCameraShake,
    registerTextElement,
    getDebugInfo
  } = useCinematicScroll({
    totalSections: 6,
    enablePerformanceMonitoring: true,
    adaptiveQuality: true,
    mobileOptimized: false // Set to true for mobile builds
  });

  const { state: accessibilityState } = useAccessibility();
  const { metrics } = usePerformance();

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg">Initializing cinematic experience...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cinematic-scroll-container">
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 0, 8], fov: 75 }}
        className="fixed inset-0 z-0"
        dpr={currentQuality === 'high' ? 2 : 1}
        performance={{ min: 0.5 }}
      >
        <Suspense fallback={null}>
          {/* Your 3D scenes will be rendered here */}
          <ambientLight intensity={0.4} />
          <pointLight position={[10, 10, 10]} />
          
          {/* Example 3D objects for each section */}
          <SectionObjects 
            currentSection={scrollState.currentSection}
            sectionProgress={scrollState.sectionProgress}
            quality={currentQuality}
          />
        </Suspense>
      </Canvas>

      {/* Scroll Content */}
      <div className="relative z-10">
        {/* Section 1: Identity */}
        <Section
          id="identity"
          sectionIndex={0}
          currentSection={scrollState.currentSection}
          sectionProgress={scrollState.sectionProgress}
        >
          <div className="container mx-auto px-6 h-screen flex items-center justify-center">
            <div className="text-center max-w-4xl">
              <ScrollTextReveal
                config={{
                  id: 'identity-title',
                  progress: 0.1,
                  duration: 0.8,
                  delay: 0,
                  variant: 'splitWords',
                  stagger: 0.15
                }}
                className="text-6xl font-bold mb-6"
              >
                <h1>No soy programador...</h1>
              </ScrollTextReveal>
              
              <ScrollTextReveal
                config={{
                  id: 'identity-subtitle',
                  progress: 0.3,
                  duration: 0.6,
                  delay: 0.2,
                  variant: 'fade'
                }}
                className="text-2xl mb-8 text-gray-600"
              >
                <p>Soy un orquestador de agentes digitales</p>
              </ScrollTextReveal>
              
              <ScrollTextReveal
                config={{
                  id: 'identity-description',
                  progress: 0.5,
                  duration: 1.2,
                  delay: 0.4,
                  variant: 'typewriter'
                }}
                className="text-lg max-w-2xl mx-auto"
              >
                <p>
                  Diseño sistemas invisibles que respetan lo humano, 
                  orquestando tecnología que amplifica capacidades sin 
                  reemplazar la esencia de quien eres.
                </p>
              </ScrollTextReveal>
            </div>
          </div>
        </Section>

        {/* Section 2: Origin */}
        <Section
          id="origin"
          sectionIndex={1}
          currentSection={scrollState.currentSection}
          sectionProgress={scrollState.sectionProgress}
        >
          <div className="container mx-auto px-6 h-screen flex items-center">
            <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
              <div>
                <ScrollTextReveal
                  config={{
                    id: 'origin-title',
                    progress: 0.1,
                    duration: 0.8,
                    delay: 0,
                    variant: 'slideUp'
                  }}
                  className="text-5xl font-bold mb-8"
                >
                  <h2>Dos mundos, una visión</h2>
                </ScrollTextReveal>
                
                <ScrollTextReveal
                  config={{
                    id: 'origin-narrative',
                    progress: 0.4,
                    duration: 1,
                    delay: 0.3,
                    variant: 'splitWords',
                    stagger: 0.1
                  }}
                  className="text-lg space-y-4"
                >
                  <div>
                    <p className="mb-4">
                      Desde las alturas de <strong>Puno, Perú</strong> hasta 
                      la precisión de <strong>Appenweier, Alemania</strong>, 
                      mi perspectiva se forjó entre extremos.
                    </p>
                    <p>
                      Esta dualidad me enseñó que la tecnología más poderosa 
                      es aquella que se adapta al contexto humano, no al revés.
                    </p>
                  </div>
                </ScrollTextReveal>
              </div>
              
              <div 
                data-animation-target="map-container"
                className="relative h-96 opacity-0"
              >
                {/* Interactive map would go here */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-green-500 rounded-lg"></div>
              </div>
            </div>
          </div>
        </Section>

        {/* Section 3: Mission */}
        <Section
          id="mission"
          sectionIndex={2}
          currentSection={scrollState.currentSection}
          sectionProgress={scrollState.sectionProgress}
        >
          <div className="container mx-auto px-6 h-screen flex items-center justify-center">
            <div className="text-center max-w-4xl">
              <ScrollTextReveal
                config={{
                  id: 'mission-title',
                  progress: 0.1,
                  duration: 0.8,
                  delay: 0,
                  variant: 'magneticHover'
                }}
                className="text-5xl font-bold mb-12"
              >
                <h2>Sistemas invisibles</h2>
              </ScrollTextReveal>
              
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  'Respeto por lo humano',
                  'Tecnología que amplifica',
                  'Diseño invisible'
                ].map((principle, index) => (
                  <ScrollTextReveal
                    key={principle}
                    config={{
                      id: `mission-principle-${index + 1}`,
                      progress: 0.25 + (index * 0.25),
                      duration: 0.6,
                      delay: 0.1 + (index * 0.1),
                      variant: 'slideUp'
                    }}
                    className="p-6 bg-white/10 backdrop-blur-sm rounded-lg"
                  >
                    <h3 className="text-xl font-semibold">{principle}</h3>
                  </ScrollTextReveal>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Continue with more sections... */}
        
        {/* Section 6: CTA */}
        <Section
          id="cta"
          sectionIndex={5}
          currentSection={scrollState.currentSection}
          sectionProgress={scrollState.sectionProgress}
        >
          <div className="container mx-auto px-6 h-screen flex items-center justify-center">
            <div className="text-center max-w-2xl">
              <ScrollTextReveal
                config={{
                  id: 'cta-title',
                  progress: 0.2,
                  duration: 0.8,
                  delay: 0,
                  variant: 'magneticHover'
                }}
                className="text-4xl font-bold mb-8"
              >
                <h2>Inicia la conversación</h2>
              </ScrollTextReveal>
              
              <ScrollTextReveal
                config={{
                  id: 'cta-message',
                  progress: 0.4,
                  duration: 1,
                  delay: 0.2,
                  variant: 'fade'
                }}
                className="text-lg mb-8"
              >
                <p>
                  ¿Tienes un desafío que requiere pensar diferente? 
                  Conversemos sobre cómo la orquestación digital 
                  puede transformar tu visión en realidad.
                </p>
              </ScrollTextReveal>
              
              <ScrollTextReveal
                config={{
                  id: 'cta-button',
                  progress: 0.7,
                  duration: 0.6,
                  delay: 0.3,
                  variant: 'slideUp'
                }}
                className="inline-block"
              >
                <button
                  onClick={() => triggerCameraShake(0.1, 0.5)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg transition-colors duration-200"
                >
                  Conectemos
                </button>
              </ScrollTextReveal>
            </div>
          </div>
        </Section>
      </div>

      {/* Navigation */}
      <Navigation
        currentSection={scrollState.currentSection}
        totalSections={6}
        onSectionClick={scrollToSection}
      />

      {/* Performance Monitor (Development) */}
      <PerformanceMonitor visible={process.env.NODE_ENV === 'development'} />
      
      {/* Accessibility Controls */}
      <AccessibilityControls visible={true} />
      
      {/* Debug Panel (Development) */}
      {process.env.NODE_ENV === 'development' && (
        <DebugPanel
          scrollState={scrollState}
          performanceMetrics={performanceMetrics}
          currentQuality={currentQuality}
          debugInfo={getDebugInfo()}
        />
      )}
    </div>
  );
};

// Section wrapper component
const Section: React.FC<{
  id: string;
  sectionIndex: number;
  currentSection: number;
  sectionProgress: number;
  children: React.ReactNode;
}> = ({ id, sectionIndex, currentSection, sectionProgress, children }) => {
  const isActive = currentSection === sectionIndex;
  
  return (
    <section
      id={id}
      className={`section-wrapper ${isActive ? 'active' : ''}`}
      data-section={sectionIndex}
      aria-label={`Section ${sectionIndex + 1}: ${id}`}
    >
      {children}
    </section>
  );
};

// 3D Scene objects component
const SectionObjects: React.FC<{
  currentSection: number;
  sectionProgress: number;
  quality: string;
}> = ({ currentSection, sectionProgress, quality }) => {
  // Render different 3D objects based on current section
  switch (currentSection) {
    case 0: // Identity
      return (
        <mesh data-animation-target="identity-circle">
          <torusGeometry args={[1, 0.3, 16, 32]} />
          <meshStandardMaterial color="#ff6b6b" />
        </mesh>
      );
    
    case 1: // Origin
      return (
        <>
          <mesh data-animation-target="map-puno" position={[-2, 0, 0]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#3b82f6" />
          </mesh>
          <mesh data-animation-target="map-appenweier" position={[2, 0, 0]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#10b981" />
          </mesh>
        </>
      );
    
    // Add more sections as needed
    default:
      return null;
  }
};

// Navigation component
const Navigation: React.FC<{
  currentSection: number;
  totalSections: number;
  onSectionClick: (section: number) => void;
}> = ({ currentSection, totalSections, onSectionClick }) => {
  return (
    <nav 
      id="section-navigation"
      className="fixed right-6 top-1/2 transform -translate-y-1/2 z-50"
      aria-label="Section navigation"
    >
      <ul className="space-y-4">
        {Array.from({ length: totalSections }, (_, i) => (
          <li key={i}>
            <button
              onClick={() => onSectionClick(i)}
              className={`w-3 h-3 rounded-full transition-colors duration-200 ${
                currentSection === i 
                  ? 'bg-blue-600' 
                  : 'bg-gray-400 hover:bg-gray-600'
              }`}
              aria-label={`Go to section ${i + 1}`}
              aria-current={currentSection === i ? 'true' : 'false'}
            />
          </li>
        ))}
      </ul>
    </nav>
  );
};

// Debug panel for development
const DebugPanel: React.FC<{
  scrollState: any;
  performanceMetrics: any;
  currentQuality: string;
  debugInfo: any;
}> = ({ scrollState, performanceMetrics, currentQuality, debugInfo }) => {
  return (
    <div className="fixed bottom-4 left-4 z-50 bg-black/80 text-white p-4 rounded-lg text-xs font-mono max-w-md">
      <h3 className="font-bold mb-2">Debug Info</h3>
      <div className="space-y-1">
        <div>Section: {scrollState.currentSection}</div>
        <div>Progress: {(scrollState.progress * 100).toFixed(1)}%</div>
        <div>Section Progress: {(scrollState.sectionProgress * 100).toFixed(1)}%</div>
        <div>Velocity: {scrollState.velocity.toFixed(3)}</div>
        <div>FPS: {performanceMetrics.fps}</div>
        <div>Quality: {currentQuality}</div>
        <div>Frame Time: {performanceMetrics.frameTime.toFixed(1)}ms</div>
      </div>
    </div>
  );
};

export default CinematicScrollExample;