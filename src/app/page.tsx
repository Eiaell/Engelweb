'use client';

import { useState, useEffect } from 'react';
import * as THREE from 'three';
import { DataUniverseCanvas } from '@/components/DataUniverseCanvas';
import { InteractionProvider } from '@/contexts/InteractionContext';
import { PremiumLoader } from '@/components/PremiumLoader';
import { LoadingTransition } from '@/components/LoadingTransition';
import { useScrollControl } from '@/hooks/useScrollControl';
import { useProgressiveLoading } from '@/hooks/useProgressiveLoading';
import { useLoadingScroll } from '@/hooks/useLoadingScroll';
import { PerformanceMonitor } from '@/components/PerformanceMonitor';
import { LoadingPerformanceMonitor } from '@/components/LoadingPerformanceMonitor';
import { AccessibilityProvider } from '@/components/AccessibilityProvider';
import { TextReveal } from '@/components/TextReveal';

// Award-winning professional content with cinematic sophistication
const sectionContent = {
  foundation: {
    title: "Ingesta de datos",
    subtitle: "Transformación inteligente de información",
    description: "Proceso PDF, Word y Excel para crear memoria organizacional estructurada."
  },
  
  human: {
    title: "Fragmentación y vectorización",
    subtitle: "De texto a memoria semántica",
    description: "Convierto contenido en text chunks optimizados y los almacenamos en vector database para búsquedas contextuales precisas."
  },
  strategy: {
    title: "Extracción de entidades",
    subtitle: "Identificación de elementos clave",
    description: "Personas, procesos, relaciones y conceptos estructurados en memoria corporativa activa."
  },
  technical: {
    title: "Grafo de conocimiento",
    subtitle: "Conexiones que generan inteligencia y valor",
    description: "Knowledge graph navegable que mapea información, relaciones y contexto."
  },
  graphrag: {
    title: "Consulta y respuesta del Usuario",
    subtitle: "Resultados trazables y explicables",
    description: "Junto a mi equipo combinamos memoria vectorial y grafos para entregar respuestas precisas y auditables."
  }
};

export default function Home() {
  const [isAppLoaded, setIsAppLoaded] = useState(false);
  const [showLoadingTransition, setShowLoadingTransition] = useState(false);
  const [sceneTriggered, setSceneTriggered] = useState({
    vectorization: false,
    entityExtraction: false,
    knowledgeGraph: false
    // REMOVED: queryResponse: false
  });
  const { scrollState } = useScrollControl(5); // 5 secciones del proceso GraphRAG (con texto final)
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

  // Detectar cuando los títulos cruzan la línea media de la pantalla
  useEffect(() => {
    // Definir los rangos donde cada título empieza su animación desde abajo - uniformes
    const titleAnimationRanges = [
      { section: 'vectorization', start: 0.20, trigger: 0.25 },    // Fragmentación - trigger en mitad de sección
      { section: 'entityExtraction', start: 0.40, trigger: 0.45 }, // Extracción - trigger en mitad de sección
      { section: 'knowledgeGraph', start: 0.60, trigger: 0.65 }    // Grafo - trigger en mitad de sección
      // No hay trigger para consulta (solo texto)
    ];

    titleAnimationRanges.forEach(({ section, start, trigger }) => {
      // Trigger se activa cuando el título ha recorrido suficiente para cruzar línea media
      if (scrollState.progress >= trigger && !sceneTriggered[section as keyof typeof sceneTriggered]) {
        setSceneTriggered(prev => ({
          ...prev,
          [section]: true
        }));
      }
    });
  }, [scrollState.progress, sceneTriggered]);

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
        {/* Data Universe Background */}
        <InteractionProvider 
          enableAnalytics={true}
          enableDebugMode={process.env.NODE_ENV === 'development'}
        >
          <DataUniverseCanvas 
            scrollState={scrollState}
            sceneTriggered={sceneTriggered}
          />
        </InteractionProvider>

        {/* Navigation Hints */}
        <div className="fixed bottom-8 right-8 z-20 text-right space-y-2">
          <div className="bg-black/50 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20">
            <p className="text-cyan-400 text-sm animate-pulse">
              🖱️ Cursor = interactuar con datos
            </p>
          </div>
          <div className="bg-black/50 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20">
            <p className="text-yellow-400 text-sm animate-pulse">
              ⬇️ Scroll = alejarse/zoom out
            </p>
          </div>
          <div className="bg-black/50 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20">
            <p className="text-magenta-400 text-sm animate-pulse">
              🖱️ Click + Drag = mover cámara
            </p>
          </div>
        </div>

        {/* Minimal Content Overlay */}
        <div className="relative z-10">
          {Object.entries(sectionContent).map(([key, content], index) => {
            // Define text timing ranges - grafo extendido para mayor impacto
            const textRanges = [
              { start: 0.00, end: 0.20 },  // Ingesta de datos (0-20%)
              { start: 0.20, end: 0.40 },  // Fragmentación (20-40%)
              { start: 0.40, end: 0.60 },  // Extracción (40-60%)
              { start: 0.60, end: 0.90 },  // Grafo (60-90%) - EXTENDIDO para mayor duración
              { start: 0.90, end: 1.00 }   // Consulta (90-100%) - reducido pero presente
            ];
            
            const range = textRanges[index] || { start: 0, end: 0.2 };
            const isInTextRange = scrollState.progress >= range.start && scrollState.progress <= range.end;
            const opacity = 'opacity-90'; // SIEMPRE VISIBLE - sin fade
            
            // Los textos siempre son visibles cuando están en su sección
            const shouldHide = !isInTextRange;
            
            return (
              <section 
                key={key}
                className={`h-screen flex flex-col px-8 transition-all duration-1000 ${
                  index === 0 ? 'justify-end items-center pb-32' : 'justify-center items-center'
                }`}
                style={{ minHeight: '100vh' }}
              >
                {!shouldHide && (
                  <div className={`max-w-4xl text-center space-y-8 backdrop-blur-sm bg-black/5 p-8 rounded-2xl border border-white/5 ${opacity}`}>
                <div className="text-white text-2xl md:text-4xl font-light mb-4">
                  {content.title}
                </div>
                
                {content.subtitle && (
                  <div className="text-cyan-300 text-lg md:text-xl mb-4">
                    {content.subtitle}
                  </div>
                )}
                
                <div className="text-gray-300 text-base md:text-lg leading-relaxed">
                  {content.description}
                </div>
                
                {key === 'cta' && (
                  <div className="mt-8">
                    <button 
                      className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg shadow-cyan-500/25"
                      onClick={() => {
                        console.log('Contact initiated');
                      }}
                    >
                      Iniciar Conversación
                    </button>
                  </div>
                )}
              </div>
                )}
            </section>
            );
          })}
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
              {scrollState.currentSection + 1} / 5
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