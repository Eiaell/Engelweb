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
    title: "De Datos Aislados a Conocimiento Conectado",
    subtitle: "Transformación inteligente con GraphRAG",
    description: "Proceso PDF, Word y Excel para crear memoria organizacional estructurada."
  },
  
  human: {
    title: "Entendimiento Profundo del Contenido",
    subtitle: "Convertimos tus documentos en conocimiento útil",
    description: "Analizamos y estructuramos tu información para que la IA pueda realizar búsquedas basadas en el significado real, no solo en palabras clave."
  },
  strategy: {
    title: "Conectando los Puntos Clave",
    subtitle: "Damos estructura a tu conocimiento",
    description: "Extraemos los \"quién\", \"qué\" y \"cómo\" de tus documentos para construir un mapa de relaciones claro y útil para tu organización."
  },
  technical: {
    title: "El Panorama Completo de tu Información",
    subtitle: "Descubre conexiones ocultas y obtén respuestas con contexto",
    description: "Te entregamos un mapa interactivo de tus datos, permitiéndote navegar las relaciones entre proyectos, personas y conceptos clave como nunca antes."
  },
  graphrag: {
    title: "Respuestas Precisas y Confiables",
    subtitle: "Entiende siempre el porqué de cada resultado",
    description: "Combinamos la búsqueda por significado con el mapa de relaciones de tus datos para darte respuestas exactas y con contexto. Cada resultado es transparente, permitiéndote verificar las fuentes originales fácilmente."
  }
};

export default function Home() {
  const [isAppLoaded, setIsAppLoaded] = useState(false);
  const [showLoadingTransition, setShowLoadingTransition] = useState(false);
  const [sceneTriggered, setSceneTriggered] = useState({
    vectorization: false,
    entityExtraction: false,
    knowledgeGraph: false,
    claudeInterface: false
  });
  const { scrollState } = useScrollControl(7); // 7 secciones para extender el mundo
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
      const yPosition = -scrollProgress * 70; // 70 units for 7 sections
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
    // Definir los rangos donde cada título empieza su animación desde abajo - ajustados
    const titleAnimationRanges = [
      { section: 'vectorization', start: 0.16, trigger: 0.20 },    // Fragmentación - trigger en mitad de sección
      { section: 'entityExtraction', start: 0.32, trigger: 0.36 }, // Extracción - trigger en mitad de sección
      { section: 'knowledgeGraph', start: 0.48, trigger: 0.54 },   // Grafo - trigger en mitad de sección
      { section: 'claudeInterface', start: 0.98, trigger: 0.98 }   // Claude Interface - aparece solo al final
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

        {/* Navigation Hints - Responsive */}
        <div className="fixed bottom-4 sm:bottom-8 right-2 sm:right-8 z-20 text-right">
          <div className="bg-black/50 backdrop-blur-sm px-2 sm:px-4 py-1 sm:py-2 rounded-lg border border-white/20">
            <p className="text-yellow-400 text-xs sm:text-sm animate-pulse">
              ⬇️ Scroll = explorar
            </p>
          </div>
        </div>

        {/* Minimal Content Overlay */}
        <div className="relative z-10">
          {Object.entries(sectionContent).map(([key, content], index) => {
            // Define cuándo cada texto empieza a aparecer - una vez que aparece, se queda para siempre
            const textStartTimes = [
              0.00,  // Ingesta de datos - aparece desde el inicio
              0.16,  // Fragmentación - aparece al 16%
              0.32,  // Extracción - aparece al 32%
              0.48,  // Grafo - aparece al 48%
              0.70   // Consulta - aparece al 70%
            ];
            
            const startTime = textStartTimes[index] || 0;
            const hasAppeared = scrollState.progress >= startTime;
            const opacity = 'opacity-90'; // SIEMPRE VISIBLE - sin fade
            
            // Una vez que aparece, nunca se oculta
            const shouldHide = !hasAppeared;
            
            return (
              <section 
                key={key}
                className={`h-screen flex flex-col px-4 sm:px-8 transition-all duration-1000 ${
                  index === 0 ? 'justify-end items-center pb-16 sm:pb-32' : 'justify-center items-center'
                }`}
                style={{ minHeight: '100vh' }}
              >
                {!shouldHide && (
                  <div className={`max-w-4xl text-center space-y-4 sm:space-y-8 backdrop-blur-sm bg-black/10 p-4 sm:p-8 rounded-2xl border border-white/10 ${opacity}`}>
                <div className="text-white text-xl sm:text-2xl md:text-4xl font-light mb-2 sm:mb-4">
                  {content.title}
                </div>
                
                {content.subtitle && (
                  <div className="text-cyan-300 text-base sm:text-lg md:text-xl mb-2 sm:mb-4">
                    {content.subtitle}
                  </div>
                )}
                
                <div className="text-gray-300 text-sm sm:text-base md:text-lg leading-relaxed">
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
        
        {/* Scroll Indicator with Loading State - Mobile Responsive */}
        <div className="fixed bottom-20 sm:bottom-8 right-2 sm:right-8 z-20">
          <div className="flex flex-col items-center space-y-1 sm:space-y-2">
            <div className="w-1 h-12 sm:h-20 bg-gray-600 rounded-full overflow-hidden">
              <div 
                className="w-full bg-red-500 transition-all duration-300 ease-out"
                style={{ height: `${scrollState.progress * 100}%` }}
              />
            </div>
            <span className="text-gray-400 text-xs sm:text-sm">
              {scrollState.currentSection + 1} / 7
            </span>
            
            {/* Loading indicator for ongoing background loading */}
            {loadingState.progress.progress < 1 && isAppLoaded && (
              <div className="text-xs text-gray-500 mt-1 sm:mt-2">
                {Math.round(loadingState.progress.progress * 100)}%
              </div>
            )}
          </div>
        </div>

      </main>
    </AccessibilityProvider>
  );
}