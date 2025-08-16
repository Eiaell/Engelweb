import { useRef, useEffect, useCallback, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { InteractionManager } from '@/lib/InteractionManager';
import {
  InteractionConfig,
  InteractionState,
  InteractionHandler,
  StateChangeHandler,
  CommandHandler,
  AnalyticsHandler,
  InteractableObject,
  Command,
  InteractionType
} from '@/types/interactions';

interface UseInteractionManagerOptions extends Partial<InteractionConfig> {
  onStateChange?: StateChangeHandler;
  onCommand?: CommandHandler;
  onAnalytics?: AnalyticsHandler;
  enablePerformanceMonitoring?: boolean;
  enableDebugMode?: boolean;
}

interface InteractionManagerHook {
  interactionManager: InteractionManager | null;
  state: InteractionState | null;
  isInitialized: boolean;
  registerObject: (object: InteractableObject) => void;
  unregisterObject: (objectId: string) => void;
  selectObject: (objectId: string, multiSelect?: boolean) => void;
  clearSelection: () => void;
  filterObjects: (criteria: Partial<InteractionState['filterState']>) => void;
  searchObjects: (query: string, searchType?: 'semantic' | 'exact' | 'fuzzy') => void;
  executeCommand: (command: Command) => void;
  undo: () => boolean;
  redo: () => boolean;
  on: (type: InteractionType, handler: InteractionHandler) => void;
  off: (type: InteractionType, handler: InteractionHandler) => void;
  updateObjectState: (objectId: string, newState: any) => void;
  getPerformanceMetrics: () => any;
}

export const useInteractionManager = (
  options: UseInteractionManagerOptions = {}
): InteractionManagerHook => {
  const { gl, camera, scene } = useThree();
  const interactionManagerRef = useRef<InteractionManager | null>(null);
  const [state, setState] = useState<InteractionState | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const frameTimeRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(performance.now());

  // Initialize interaction manager
  useEffect(() => {
    if (!gl.domElement || interactionManagerRef.current) return;

    try {
      const config: Partial<InteractionConfig> = {
        enableAnalytics: true,
        enableUndoRedo: true,
        enableMultiSelect: true,
        enableAccessibility: true,
        performanceMode: 'high',
        touchEnabled: true,
        keyboardEnabled: true,
        maxUndoSteps: 50,
        animationDuration: 0.3,
        hoverDelay: 150,
        doubleClickThreshold: 300,
        ...options
      };

      const manager = new InteractionManager(config);
      
      // Initialize with canvas and camera
      manager.initialize(gl.domElement, camera);
      
      // Set up event handlers
      if (options.onStateChange) {
        manager.onStateChange(options.onStateChange);
      }
      
      if (options.onCommand) {
        manager.onCommand(options.onCommand);
      }
      
      if (options.onAnalytics) {
        manager.onAnalytics(options.onAnalytics);
      }

      // Set up state change handler to update React state
      manager.onStateChange((newState) => {
        setState(manager.getState());
      });

      interactionManagerRef.current = manager;
      setState(manager.getState());
      setIsInitialized(true);

      if (options.enableDebugMode) {
        console.log('🎯 InteractionManager initialized', {
          config,
          canvas: gl.domElement,
          camera: camera.type
        });
      }
    } catch (error) {
      console.error('Failed to initialize InteractionManager:', error);
    }

    return () => {
      if (interactionManagerRef.current) {
        interactionManagerRef.current.dispose();
        interactionManagerRef.current = null;
        setIsInitialized(false);
        setState(null);
      }
    };
  }, [gl.domElement, camera]);

  // Performance monitoring frame loop
  useFrame((state, delta) => {
    if (!interactionManagerRef.current) return;

    const currentTime = performance.now();
    frameTimeRef.current = currentTime - lastFrameTimeRef.current;
    lastFrameTimeRef.current = currentTime;

    // Update performance metrics if enabled
    if (options.enablePerformanceMonitoring) {
      interactionManagerRef.current.updatePerformanceMetrics(frameTimeRef.current);
    }

    // Handle any frame-based interaction updates
    // This is where we could add things like animation interpolation,
    // physics updates, or other frame-dependent interaction behavior
  });

  // Memoized methods to prevent unnecessary re-renders
  const registerObject = useCallback((object: InteractableObject) => {
    if (interactionManagerRef.current) {
      interactionManagerRef.current.registerObject(object);
      
      if (options.enableDebugMode) {
        console.log('🔗 Registered interactive object:', object.interactionData.id);
      }
    }
  }, [options.enableDebugMode]);

  const unregisterObject = useCallback((objectId: string) => {
    if (interactionManagerRef.current) {
      interactionManagerRef.current.unregisterObject(objectId);
      
      if (options.enableDebugMode) {
        console.log('🔌 Unregistered interactive object:', objectId);
      }
    }
  }, [options.enableDebugMode]);

  const selectObject = useCallback((objectId: string, multiSelect = false) => {
    if (interactionManagerRef.current) {
      interactionManagerRef.current.selectObject(objectId, multiSelect);
    }
  }, []);

  const clearSelection = useCallback(() => {
    if (interactionManagerRef.current) {
      interactionManagerRef.current.clearSelection();
    }
  }, []);

  const filterObjects = useCallback((criteria: Partial<InteractionState['filterState']>) => {
    if (interactionManagerRef.current) {
      interactionManagerRef.current.filterObjects(criteria);
    }
  }, []);

  const searchObjects = useCallback((
    query: string, 
    searchType: 'semantic' | 'exact' | 'fuzzy' = 'semantic'
  ) => {
    if (interactionManagerRef.current) {
      interactionManagerRef.current.searchObjects(query, searchType);
    }
  }, []);

  const executeCommand = useCallback((command: Command) => {
    if (interactionManagerRef.current) {
      interactionManagerRef.current.executeCommand(command);
    }
  }, []);

  const undo = useCallback(() => {
    if (interactionManagerRef.current) {
      return interactionManagerRef.current.undo();
    }
    return false;
  }, []);

  const redo = useCallback(() => {
    if (interactionManagerRef.current) {
      return interactionManagerRef.current.redo();
    }
    return false;
  }, []);

  const on = useCallback((type: InteractionType, handler: InteractionHandler) => {
    if (interactionManagerRef.current) {
      interactionManagerRef.current.on(type, handler);
    }
  }, []);

  const off = useCallback((type: InteractionType, handler: InteractionHandler) => {
    if (interactionManagerRef.current) {
      interactionManagerRef.current.off(type, handler);
    }
  }, []);

  const updateObjectState = useCallback((objectId: string, newState: any) => {
    if (interactionManagerRef.current) {
      interactionManagerRef.current.updateObjectState(objectId, newState);
    }
  }, []);

  const getPerformanceMetrics = useCallback(() => {
    if (interactionManagerRef.current) {
      return interactionManagerRef.current['performanceMetrics'];
    }
    return null;
  }, []);

  return {
    interactionManager: interactionManagerRef.current,
    state,
    isInitialized,
    registerObject,
    unregisterObject,
    selectObject,
    clearSelection,
    filterObjects,
    searchObjects,
    executeCommand,
    undo,
    redo,
    on,
    off,
    updateObjectState,
    getPerformanceMetrics
  };
};

// Utility hook for creating interactable objects
export const useInteractableObject = (
  id: string,
  type: string,
  metadata: Record<string, any> = {},
  capabilities: any[] = ['selectable', 'inspectable'],
  accessibility: {
    label: string;
    description: string;
    role: string;
    keyboardShortcuts?: string[];
    announcements?: string[];
  }
) => {
  const { registerObject, unregisterObject } = useInteractionManager();
  const objectRef = useRef<THREE.Object3D | null>(null);

  const createInteractableObject = useCallback((object: THREE.Object3D) => {
    const interactableObject = object as InteractableObject;
    
    interactableObject.interactionData = {
      id,
      type,
      metadata,
      state: 'idle',
      capabilities,
      accessibility: {
        label: accessibility.label,
        description: accessibility.description,
        role: accessibility.role,
        keyboardShortcuts: accessibility.keyboardShortcuts || [],
        announcements: accessibility.announcements || []
      }
    };

    objectRef.current = interactableObject;
    registerObject(interactableObject);

    return interactableObject;
  }, [id, type, metadata, capabilities, accessibility, registerObject]);

  useEffect(() => {
    return () => {
      if (objectRef.current) {
        unregisterObject(id);
      }
    };
  }, [id, unregisterObject]);

  return {
    createInteractableObject,
    objectRef
  };
};

// Hook for handling specific interaction patterns
export const useInteractionPattern = (
  pattern: 'hover' | 'select' | 'drag' | 'filter' | 'search',
  objectId?: string
) => {
  const { on, off, state } = useInteractionManager();
  const [patternState, setPatternState] = useState<any>(null);

  useEffect(() => {
    if (!objectId) return;

    const handler = (event: any) => {
      if (event.target?.interactionData?.id === objectId) {
        setPatternState({
          type: event.type,
          data: event.data,
          timestamp: event.timestamp
        });
      }
    };

    switch (pattern) {
      case 'hover':
        on('hover', handler);
        return () => off('hover', handler);
      case 'select':
        on('select', handler);
        on('deselect', handler);
        return () => {
          off('select', handler);
          off('deselect', handler);
        };
      case 'drag':
        on('dragStart', handler);
        on('drag', handler);
        on('dragEnd', handler);
        return () => {
          off('dragStart', handler);
          off('drag', handler);
          off('dragEnd', handler);
        };
      default:
        break;
    }
  }, [pattern, objectId, on, off]);

  return {
    patternState,
    isActive: patternState !== null,
    isHovered: pattern === 'hover' && patternState?.type === 'hover',
    isSelected: pattern === 'select' && state?.selectedObjects.has(objectId || ''),
    isDragging: pattern === 'drag' && state?.dragState?.objectId === objectId
  };
};

// Hook for enterprise-level accessibility compliance
export const useAccessibilityCompliance = () => {
  const { interactionManager, state } = useInteractionManager();
  const [screenReaderAnnouncements, setScreenReaderAnnouncements] = useState<string[]>([]);
  const [keyboardNavigation, setKeyboardNavigation] = useState({
    currentFocus: null as string | null,
    navigationMode: 'spatial' as 'linear' | 'spatial' | 'hierarchical'
  });

  useEffect(() => {
    if (!interactionManager) return;

    // Listen for accessibility events
    const handleAccessibilityUpdate = (announcement: string) => {
      setScreenReaderAnnouncements(prev => [...prev.slice(-4), announcement]);
      
      // Announce to screen readers
      const ariaLive = document.createElement('div');
      ariaLive.setAttribute('aria-live', 'polite');
      ariaLive.setAttribute('aria-atomic', 'true');
      ariaLive.style.position = 'absolute';
      ariaLive.style.left = '-10000px';
      ariaLive.textContent = announcement;
      document.body.appendChild(ariaLive);
      
      setTimeout(() => {
        document.body.removeChild(ariaLive);
      }, 1000);
    };

    // Keyboard navigation handler
    const handleKeyboardNavigation = (event: KeyboardEvent) => {
      if (!state) return;

      switch (event.key) {
        case 'Tab':
          event.preventDefault();
          // Implement tab navigation between interactive objects
          break;
        case 'Enter':
        case ' ':
          // Activate current focused object
          if (keyboardNavigation.currentFocus) {
            interactionManager.selectObject(keyboardNavigation.currentFocus);
          }
          break;
        case 'Escape':
          // Clear selections and exit current mode
          interactionManager.clearSelection();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyboardNavigation);

    return () => {
      document.removeEventListener('keydown', handleKeyboardNavigation);
    };
  }, [interactionManager, state, keyboardNavigation.currentFocus]);

  return {
    screenReaderAnnouncements,
    keyboardNavigation,
    setNavigationMode: (mode: 'linear' | 'spatial' | 'hierarchical') => {
      setKeyboardNavigation(prev => ({ ...prev, navigationMode: mode }));
    },
    announceToScreenReader: (message: string) => {
      setScreenReaderAnnouncements(prev => [...prev.slice(-4), message]);
    }
  };
};

export default useInteractionManager;