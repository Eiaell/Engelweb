'use client';

import { useState, useEffect } from 'react';
import * as THREE from 'three';
import { Scene3D } from '@/components/Scene3D';
import { SectionsManager } from '@/components/SectionsManager';
import { PremiumLoader } from '@/components/PremiumLoader';
import { LoadingTransition } from '@/components/LoadingTransition';
import { useScrollControl } from '@/hooks/useScrollControl';
import { useProgressiveLoading } from '@/hooks/useProgressiveLoading';
import { useLoadingScroll } from '@/hooks/useLoadingScroll';
import { PerformanceMonitor } from '@/components/PerformanceMonitor';
import { LoadingPerformanceMonitor } from '@/components/LoadingPerformanceMonitor';
import { AccessibilityProvider } from '@/components/AccessibilityProvider';
import { TextReveal } from '@/components/TextReveal';

// Section content data
const sectionContent = {
  identity: {
    title: "No soy programador",
    subtitle: "No soy marketero",
    description: "No soy otro más hablando de IA",
    emphasis: "Soy Engelbert Huber Quequejana"
  },
  origin: {
    title: "Hijo del altiplano y del ingenio europeo",
    subtitle: "Puno, Perú + Appenweier, Alemania",
    description: "Dos mundos, una visión"
  },
  mission: {
    title: "Operador de sistemas humanos",
    subtitle: "Diseño engranajes invisibles",
    description: "Que respetan lo humano mientras amplifican lo digital"
  },
  present: {
    title: "Orquestador de agentes digitales",
    subtitle: "LangChain • Zapier • RAG • AI Agents",
    description: "Ríos de datos que fluyen hacia soluciones reales"
  },
  vision: {
    title: "Construyendo algo que no tiene nombre aún",
    subtitle: "Arquitectura modular de agentes conectados",
    description: "Sistemas que aprenden, se adaptan y evolucionan"
  },
  cta: {
    title: "Pero tú ya lo necesitas",
    subtitle: "Inicia la conversación",
    description: "No es un funnel. Es el comienzo de algo diferente."
  }
};

export default function Home() {
  const [isAppLoaded, setIsAppLoaded] = useState(false);
  const [showLoadingTransition, setShowLoadingTransition] = useState(false);
  const { scrollState } = useScrollControl(6);
  const { 
    loadingState, 
    progressiveLoader, 
    updatePosition, 
    getAsset,
    isAssetLoaded,
    clearError 
  } = useProgressiveLoading({
    enableScenePreloading: true,
    enableErrorHandling: true,
    preloadDistance: 15,
    unloadDistance: 25
  });

  // Integrate loading scroll control
  const { 
    scrollLocked,
    enableProgressiveScroll 
  } = useLoadingScroll(loadingState.isLoading, {
    enableDuringLoading: false,
    smoothTransition: true,
    transitionDuration: 800
  });

  // Handle loading completion
  const handleLoadComplete = () => {
    console.log('🚀 App loading completed, starting immersive experience');
    setIsAppLoaded(true);
  };

  // Handle progressive loading states
  useEffect(() => {
    if (loadingState.progress.progress > 0.6 && !showLoadingTransition) {
      setShowLoadingTransition(true);
    }
    
    // Enable progressive scroll as loading progresses
    enableProgressiveScroll(loadingState.progress.progress);
  }, [loadingState.progress.progress, showLoadingTransition, enableProgressiveScroll]);

  // Update progressive loader position based on scroll
  useEffect(() => {
    if (isAppLoaded && progressiveLoader) {
      // Map scroll progress to 3D position
      const scrollProgress = scrollState.progress;
      const yPosition = -scrollProgress * 50; // 50 units for 6 sections
      updatePosition(new THREE.Vector3(0, yPosition, 0));
    }
  }, [scrollState.progress, isAppLoaded, progressiveLoader, updatePosition]);

  // Handle loading errors
  useEffect(() => {
    if (loadingState.error) {
      console.warn('Loading error detected:', loadingState.error);
      // Auto-clear error after 5 seconds to allow retry
      setTimeout(clearError, 5000);
    }
  }, [loadingState.error, clearError]);

  // Development testing (only in dev mode)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && isAppLoaded && !loadingState.isLoading) {
      // Run loading integration tests after app is fully loaded
      setTimeout(async () => {
        try {
          const { runLoadingTests } = await import('@/lib/loadingIntegrationTest');
          await runLoadingTests();
        } catch (error) {
          console.error('Loading tests failed:', error);
        }
      }, 2000);
    }
  }, [isAppLoaded, loadingState.isLoading]);

  return (
    <AccessibilityProvider>
      {/* Premium Loader - shown during initial loading */}
      {!isAppLoaded && (
        <PremiumLoader 
          onLoadComplete={handleLoadComplete}
          progressiveLoader={progressiveLoader}
        />
      )}

      {/* Loading transition for background asset loading */}
      <LoadingTransition
        isVisible={showLoadingTransition && isAppLoaded && loadingState.progress.progress < 1}
        progress={loadingState.progress.progress}
        onComplete={() => setShowLoadingTransition(false)}
      />

      <main className={`relative transition-opacity duration-1000 ${
        !isAppLoaded ? 'opacity-0' : 'opacity-100'
      }`}>
        {/* 3D Scene Background */}
        <Scene3D 
          scrollState={scrollState}
          progressiveLoader={progressiveLoader}
          loadingState={loadingState}
        >
          <SectionsManager 
            scrollState={scrollState} 
            getAsset={getAsset}
            isAssetLoaded={isAssetLoaded}
          />
        </Scene3D>

        {/* Content Sections */}
        <div className="relative z-10">
          {Object.entries(sectionContent).map(([key, content], index) => (
            <section 
              key={key}
              className="h-screen flex flex-col justify-center items-center px-8"
              style={{ minHeight: '100vh' }}
            >
              <div className="max-w-4xl text-center space-y-8">
                <TextReveal
                  className="text-gray-200 text-3xl md:text-5xl font-light"
                  delay={0.2}
                  duration={1.2}
                  variant={key === 'identity' ? 'slideUp' : key === 'origin' ? 'fade' : 'slideUp'}
                  triggerStart="top 80%"
                >
                  {content.title}
                </TextReveal>
                
                {content.subtitle && (
                  <TextReveal
                    className="text-gray-300 text-xl md:text-2xl"
                    delay={0.8}
                    duration={1.0}
                    variant={key === 'present' ? 'splitWords' : 'fade'}
                    triggerStart="top 75%"
                  >
                    {content.subtitle}
                  </TextReveal>
                )}
                
                <TextReveal
                  className={`${
                    key === 'identity' ? 'text-red-400 font-semibold' :
                    key === 'vision' ? 'text-yellow-400 font-medium' :
                    key === 'cta' ? 'text-red-400 font-semibold' :
                    'text-gray-400'
                  } text-lg md:text-xl`}
                  delay={1.4}
                  duration={key === 'identity' ? 2.0 : 1.2}
                  variant={key === 'identity' ? 'typewriter' : key === 'vision' ? 'splitWords' : key === 'cta' ? 'magneticHover' : 'fade'}
                  triggerStart="top 70%"
                >
                  {content.description}
                </TextReveal>
                
                {key === 'cta' && (
                  <div className="mt-12">
                    <button 
                      className="px-8 py-4 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors duration-300"
                      onClick={() => {
                        // Contact action - can be implemented later
                        console.log('Contact initiated');
                      }}
                    >
                      Iniciar Conversación
                    </button>
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>

        {/* Performance Monitors */}
        <PerformanceMonitor />
        <LoadingPerformanceMonitor 
          progressiveLoader={progressiveLoader}
          showDetailedStats={process.env.NODE_ENV === 'development'}
        />
        
        {/* Loading Error Handler */}
        {loadingState.error && (
          <div className="fixed top-4 right-4 z-30 bg-red-900/80 backdrop-blur-sm border border-red-500/50 rounded-lg p-4 max-w-sm">
            <div className="flex items-start space-x-3">
              <div className="text-red-400 text-sm">⚠️</div>
              <div className="text-white text-sm">
                <div className="font-medium mb-1">Loading Error</div>
                <div className="text-red-200 text-xs">{loadingState.error}</div>
                <button 
                  onClick={clearError}
                  className="mt-2 text-red-300 hover:text-red-100 text-xs underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Scroll Indicator with Loading State */}
        <div className="fixed bottom-8 right-8 z-20">
          <div className="flex flex-col items-center space-y-2">
            <div className="w-1 h-20 bg-gray-600 rounded-full overflow-hidden">
              <div 
                className="w-full bg-red-500 transition-all duration-300 ease-out"
                style={{ height: `${scrollState.progress * 100}%` }}
              />
            </div>
            <span className="text-gray-400 text-sm">
              {scrollState.currentSection + 1} / 6
            </span>
            
            {/* Loading indicator for ongoing background loading */}
            {loadingState.progress.progress < 1 && isAppLoaded && (
              <div className="text-xs text-gray-500 mt-2">
                Loading: {Math.round(loadingState.progress.progress * 100)}%
              </div>
            )}
          </div>
        </div>
      </main>
    </AccessibilityProvider>
  );
}