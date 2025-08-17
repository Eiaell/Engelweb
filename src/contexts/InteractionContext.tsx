'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { InteractionManager } from '@/lib/InteractionManager';
import {
  InteractionState,
  InteractionConfig,
  InteractionAnalytics,
  Command,
  InteractableObject,
  InteractionType,
  InteractionHandler
} from '@/types/interactions';

interface InteractionContextValue {
  // Core interaction manager instance
  interactionManager: InteractionManager | null;
  
  // Global interaction state
  globalState: InteractionState | null;
  
  // Configuration
  config: InteractionConfig;
  
  // Analytics and performance
  analytics: InteractionAnalytics | null;
  performanceMetrics: unknown;
  
  // Global methods
  setGlobalMode: (mode: InteractionState['mode']) => void;
  enableMultiSelect: (enabled: boolean) => void;
  setPerformanceMode: (mode: 'high' | 'medium' | 'low') => void;
  
  // Global filters and search
  globalFilter: (criteria: Partial<InteractionState['filterState']>) => void;
  globalSearch: (query: string, searchType?: 'semantic' | 'exact' | 'fuzzy') => void;
  clearGlobalFilters: () => void;
  clearGlobalSearch: () => void;
  
  // Cross-scene coordination
  coordinateSceneTransition: (fromScene: string, toScene: string) => void;
  synchronizeSelections: (sceneId: string, selections: Set<string>) => void;
  
  // Global undo/redo
  globalUndo: () => boolean;
  globalRedo: () => boolean;
  getUndoRedoState: () => { canUndo: boolean; canRedo: boolean; undoCount: number; redoCount: number };
  
  // Event system
  subscribe: (type: InteractionType, handler: InteractionHandler) => void;
  unsubscribe: (type: InteractionType, handler: InteractionHandler) => void;
  broadcast: (type: InteractionType, data: unknown) => void;
  
  // Debugging and monitoring
  enableDebugMode: (enabled: boolean) => void;
  exportAnalytics: () => InteractionAnalytics | null;
  resetAnalytics: () => void;
}

const InteractionContext = createContext<InteractionContextValue | null>(null);

interface InteractionProviderProps {
  children: ReactNode;
  config?: Partial<InteractionConfig>;
  enableAnalytics?: boolean;
  enableDebugMode?: boolean;
  onGlobalStateChange?: (state: InteractionState) => void;
  onPerformanceIssue?: (metrics: unknown) => void;
}

export const InteractionProvider: React.FC<InteractionProviderProps> = ({
  children,
  config = {},
  enableAnalytics = true,
  enableDebugMode = false,
  onGlobalStateChange,
  onPerformanceIssue
}) => {
  const [interactionManager, setInteractionManager] = useState<InteractionManager | null>(null);
  const [globalState, setGlobalState] = useState<InteractionState | null>(null);
  const [analytics, setAnalytics] = useState<InteractionAnalytics | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);
  const [debugMode, setDebugMode] = useState(enableDebugMode);

  // Default configuration with enterprise-level defaults
  const defaultConfig: InteractionConfig = {
    enableAnalytics: true,
    enableUndoRedo: true,
    enableMultiSelect: true,
    enableAccessibility: true,
    performanceMode: 'high',
    touchEnabled: true,
    keyboardEnabled: true,
    maxUndoSteps: 100,
    analyticsBufferSize: 2000,
    animationDuration: 0.25,
    hoverDelay: 100,
    doubleClickThreshold: 250,
    ...config
  };

  const [currentConfig, setCurrentConfig] = useState<InteractionConfig>(defaultConfig);

  // Initialize interaction manager
  useEffect(() => {
    if (interactionManager) return;

    const manager = new InteractionManager(currentConfig);
    
    // Set up analytics tracking
    if (enableAnalytics) {
      const analyticsData: InteractionAnalytics = {
        sessionId: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        interactions: [],
        performance: {
          averageResponseTime: 0,
          frameRate: 60,
          memoryUsage: 0,
          interactionLatency: [],
          renderTime: []
        },
        userBehavior: {
          mostUsedInteractions: {} as Record<InteractionType, number>,
          sessionDuration: 0,
          objectExplorationTime: {},
          errorRate: 0,
          helpRequests: 0
        }
      };
      
      setAnalytics(analyticsData);
      
      // Set up analytics handler
      manager.onAnalytics((analyticsUpdate) => {
        setAnalytics(prev => {
          if (!prev) return null;
          
          return {
            ...prev,
            interactions: [...prev.interactions, ...(analyticsUpdate.interactions || [])],
            performance: { ...prev.performance, ...analyticsUpdate.performance },
            userBehavior: { ...prev.userBehavior, ...analyticsUpdate.userBehavior }
          };
        });
      });
    }

    // Set up state change handler
    manager.onStateChange((newState) => {
      setGlobalState(newState);
      onGlobalStateChange?.(newState as InteractionState);
    });

    // Set up performance monitoring
    const performanceInterval = setInterval(() => {
      const metrics = manager['performanceMetrics'];
      setPerformanceMetrics(metrics);
      
      // Check for performance issues
      if (metrics && metrics.averageResponseTime > 100) {
        onPerformanceIssue?.(metrics);
      }
    }, 1000);

    setInteractionManager(manager);
    setGlobalState(manager.getState());

    if (debugMode) {
      console.log('🌐 Global InteractionManager initialized', {
        config: currentConfig,
        analytics: enableAnalytics,
        sessionId: analytics?.sessionId
      });
    }

    return () => {
      clearInterval(performanceInterval);
      manager.dispose();
    };
  }, [currentConfig, enableAnalytics, debugMode, onGlobalStateChange, onPerformanceIssue]);

  // Global mode management
  const setGlobalMode = (mode: InteractionState['mode']) => {
    if (interactionManager) {
      interactionManager.updateState({ mode });
    }
  };

  const enableMultiSelect = (enabled: boolean) => {
    if (interactionManager) {
      interactionManager.updateState({ multiSelectEnabled: enabled });
    }
  };

  const setPerformanceMode = (mode: 'high' | 'medium' | 'low') => {
    setCurrentConfig(prev => ({ ...prev, performanceMode: mode }));
  };

  // Global filtering and search
  const globalFilter = (criteria: Partial<InteractionState['filterState']>) => {
    if (interactionManager) {
      interactionManager.filterObjects(criteria);
    }
  };

  const globalSearch = (query: string, searchType: 'semantic' | 'exact' | 'fuzzy' = 'semantic') => {
    if (interactionManager) {
      interactionManager.searchObjects(query, searchType);
    }
  };

  const clearGlobalFilters = () => {
    if (interactionManager) {
      interactionManager.updateState({
        filterState: {
          entityTypes: new Set(),
          documentTypes: new Set(),
          relationshipTypes: new Set(),
          confidenceThreshold: 0.5,
          dateRange: null,
          customFilters: {}
        }
      });
    }
  };

  const clearGlobalSearch = () => {
    if (interactionManager) {
      interactionManager.updateState({
        searchState: {
          query: '',
          results: [],
          highlightedResults: new Set(),
          searchType: 'semantic',
          isActive: false
        }
      });
    }
  };

  // Cross-scene coordination
  const coordinateSceneTransition = (fromScene: string, toScene: string) => {
    if (debugMode) {
      console.log(`🎬 Scene transition: ${fromScene} → ${toScene}`);
    }
    
    // Clear scene-specific selections
    if (interactionManager) {
      interactionManager.clearSelection();
    }
    
    // Broadcast scene change event
    broadcast('explore', { sceneTransition: { from: fromScene, to: toScene } });
  };

  const synchronizeSelections = (sceneId: string, selections: Set<string>) => {
    if (debugMode) {
      console.log(`🔄 Synchronizing selections for scene ${sceneId}:`, Array.from(selections));
    }
    
    // Update global state with scene-specific selections
    if (interactionManager) {
      const currentState = interactionManager.getState();
      const updatedSelections = new Set([...currentState.selectedObjects, ...selections]);
      interactionManager.updateState({ selectedObjects: updatedSelections });
    }
  };

  // Global undo/redo
  const globalUndo = (): boolean => {
    if (interactionManager) {
      const result = interactionManager.undo();
      if (debugMode && result) {
        console.log('↶ Global undo executed');
      }
      return result;
    }
    return false;
  };

  const globalRedo = (): boolean => {
    if (interactionManager) {
      const result = interactionManager.redo();
      if (debugMode && result) {
        console.log('↷ Global redo executed');
      }
      return result;
    }
    return false;
  };

  const getUndoRedoState = () => {
    if (!globalState) {
      return { canUndo: false, canRedo: false, undoCount: 0, redoCount: 0 };
    }
    
    return {
      canUndo: globalState.undoStack.length > 0,
      canRedo: globalState.redoStack.length > 0,
      undoCount: globalState.undoStack.length,
      redoCount: globalState.redoStack.length
    };
  };

  // Event system for cross-component communication
  const subscribe = (type: InteractionType, handler: InteractionHandler) => {
    if (interactionManager) {
      interactionManager.on(type, handler);
    }
  };

  const unsubscribe = (type: InteractionType, handler: InteractionHandler) => {
    if (interactionManager) {
      interactionManager.off(type, handler);
    }
  };

  const broadcast = (type: InteractionType, data: unknown) => {
    if (interactionManager) {
      // Create a broadcast event
      const event = {
        type,
        target: null,
        data: { ...data, broadcast: true },
        timestamp: Date.now(),
        position: { x: 0, y: 0 }
      };
      
      // Emit to all subscribers
      interactionManager['emitEvent'](event);
    }
  };

  // Debug and monitoring
  const enableDebugModeHandler = (enabled: boolean) => {
    setDebugMode(enabled);
    
    if (enabled) {
      console.log('🐛 Debug mode enabled for InteractionContext');
    }
  };

  const exportAnalytics = (): InteractionAnalytics | null => {
    if (analytics) {
      const exportData = {
        ...analytics,
        exportedAt: Date.now(),
        sessionDuration: Date.now() - parseInt(analytics.sessionId.split('-')[1])
      };
      
      if (debugMode) {
        console.log('📊 Analytics exported:', exportData);
      }
      
      return exportData;
    }
    return null;
  };

  const resetAnalytics = () => {
    if (enableAnalytics) {
      const newAnalytics: InteractionAnalytics = {
        sessionId: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        interactions: [],
        performance: {
          averageResponseTime: 0,
          frameRate: 60,
          memoryUsage: 0,
          interactionLatency: [],
          renderTime: []
        },
        userBehavior: {
          mostUsedInteractions: {} as Record<InteractionType, number>,
          sessionDuration: 0,
          objectExplorationTime: {},
          errorRate: 0,
          helpRequests: 0
        }
      };
      
      setAnalytics(newAnalytics);
      
      if (debugMode) {
        console.log('🔄 Analytics reset, new session:', newAnalytics.sessionId);
      }
    }
  };

  const contextValue: InteractionContextValue = {
    interactionManager,
    globalState,
    config: currentConfig,
    analytics,
    performanceMetrics,
    setGlobalMode,
    enableMultiSelect,
    setPerformanceMode,
    globalFilter,
    globalSearch,
    clearGlobalFilters,
    clearGlobalSearch,
    coordinateSceneTransition,
    synchronizeSelections,
    globalUndo,
    globalRedo,
    getUndoRedoState,
    subscribe,
    unsubscribe,
    broadcast,
    enableDebugMode: enableDebugModeHandler,
    exportAnalytics,
    resetAnalytics
  };

  return (
    <InteractionContext.Provider value={contextValue}>
      {children}
    </InteractionContext.Provider>
  );
};

// Hook to use the interaction context
export const useInteractionContext = () => {
  const context = useContext(InteractionContext);
  
  if (!context) {
    throw new Error('useInteractionContext must be used within an InteractionProvider');
  }
  
  return context;
};

// Hook for scene-specific interaction management
export const useSceneInteraction = (sceneId: string) => {
  const {
    interactionManager,
    globalState,
    coordinateSceneTransition,
    synchronizeSelections,
    subscribe,
    unsubscribe,
    broadcast
  } = useInteractionContext();

  const [sceneState, setSceneState] = useState({
    isActive: false,
    localSelections: new Set<string>(),
    localFilters: {},
    sceneMode: 'explore' as InteractionState['mode']
  });

  // Scene activation/deactivation
  const activateScene = () => {
    setSceneState(prev => ({ ...prev, isActive: true }));
    broadcast('explore', { sceneActivated: sceneId });
  };

  const deactivateScene = () => {
    setSceneState(prev => ({ ...prev, isActive: false }));
    broadcast('explore', { sceneDeactivated: sceneId });
  };

  // Scene-specific selection management
  const selectInScene = (objectId: string, multiSelect = false) => {
    setSceneState(prev => {
      const newSelections = new Set(prev.localSelections);
      
      if (!multiSelect) {
        newSelections.clear();
      }
      
      newSelections.add(objectId);
      synchronizeSelections(sceneId, newSelections);
      
      return { ...prev, localSelections: newSelections };
    });
  };

  const clearSceneSelection = () => {
    setSceneState(prev => ({ ...prev, localSelections: new Set() }));
  };

  // Scene transition helpers
  const transitionToScene = (targetSceneId: string) => {
    coordinateSceneTransition(sceneId, targetSceneId);
    deactivateScene();
  };

  return {
    sceneState,
    activateScene,
    deactivateScene,
    selectInScene,
    clearSceneSelection,
    transitionToScene,
    isSceneActive: sceneState.isActive,
    sceneSelections: sceneState.localSelections,
    globalSelections: globalState?.selectedObjects || new Set()
  };
};

// Hook for enterprise-level interaction monitoring
export const useInteractionMonitoring = () => {
  const { analytics, performanceMetrics, exportAnalytics, resetAnalytics } = useInteractionContext();
  const [monitoringState, setMonitoringState] = useState({
    performanceAlerts: [] as string[],
    usabilityInsights: [] as string[],
    errorLog: [] as string[]
  });

  useEffect(() => {
    if (!performanceMetrics) return;

    // Monitor performance and generate alerts
    const alerts: string[] = [];
    
    if (performanceMetrics.averageResponseTime > 100) {
      alerts.push('High interaction latency detected');
    }
    
    if (performanceMetrics.frameRate < 45) {
      alerts.push('Low frame rate detected');
    }
    
    if (performanceMetrics.memoryUsage > 100) {
      alerts.push('High memory usage detected');
    }

    setMonitoringState(prev => ({ ...prev, performanceAlerts: alerts }));
  }, [performanceMetrics]);

  useEffect(() => {
    if (!analytics) return;

    // Generate usability insights
    const insights: string[] = [];
    
    if (analytics.userBehavior.errorRate > 0.1) {
      insights.push('High error rate indicates usability issues');
    }
    
    if (analytics.userBehavior.helpRequests > 5) {
      insights.push('Frequent help requests suggest interface complexity');
    }

    setMonitoringState(prev => ({ ...prev, usabilityInsights: insights }));
  }, [analytics]);

  const generateReport = () => {
    const report = {
      timestamp: Date.now(),
      analytics: exportAnalytics(),
      performance: performanceMetrics,
      alerts: monitoringState.performanceAlerts,
      insights: monitoringState.usabilityInsights,
      errors: monitoringState.errorLog
    };
    
    return report;
  };

  return {
    performanceAlerts: monitoringState.performanceAlerts,
    usabilityInsights: monitoringState.usabilityInsights,
    errorLog: monitoringState.errorLog,
    generateReport,
    hasIssues: monitoringState.performanceAlerts.length > 0 || 
               monitoringState.usabilityInsights.length > 0 ||
               monitoringState.errorLog.length > 0
  };
};

export default InteractionContext;