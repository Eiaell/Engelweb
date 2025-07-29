'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProgressiveLoader, LoadingProgress, ScenePreloadConfig } from '@/lib/progressiveLoader';
import { MemoryManager } from '@/lib/memoryManager';
import * as THREE from 'three';

export interface LoadingState {
  isLoading: boolean;
  progress: LoadingProgress;
  error: string | null;
  currentScene: string | null;
}

export interface UseProgressiveLoadingOptions {
  enableScenePreloading?: boolean;
  enableErrorHandling?: boolean;
  preloadDistance?: number;
  unloadDistance?: number;
}

export const useProgressiveLoading = (options: UseProgressiveLoadingOptions = {}) => {
  const {
    enableScenePreloading = true,
    enableErrorHandling = true,
    preloadDistance = 15,
    unloadDistance = 25
  } = options;

  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: true,
    progress: {
      total: 0,
      loaded: 0,
      progress: 0,
      estimatedTimeRemaining: 0
    },
    error: null,
    currentScene: null
  });

  const [progressiveLoader] = useState(() => ProgressiveLoader.getInstance());
  const [memoryManager] = useState(() => MemoryManager.getInstance());

  // Configure scene assets for the 6 sections
  const configureScenes = useCallback(() => {
    const sceneConfigs: ScenePreloadConfig[] = [
      {
        sceneId: 'identity',
        preloadDistance,
        unloadDistance,
        assets: [
          {
            id: 'identityCircleGeometry',
            type: 'geometry',
            priority: 'critical',
            estimatedSize: 0.1,
            dependencies: [],
            loader: async () => {
              return memoryManager.createOptimizedGeometry('sphere', [2, 32, 16]);
            }
          },
          {
            id: 'identityParticleGeometry',
            type: 'geometry',
            priority: 'high',
            estimatedSize: 0.05,
            dependencies: [],
            loader: async () => {
              return memoryManager.createOptimizedGeometry('sphere', [0.02, 8, 6]);
            }
          },
          {
            id: 'identityMaterial',
            type: 'material',
            priority: 'critical',
            estimatedSize: 0.02,
            dependencies: [],
            loader: async () => {
              return new THREE.MeshBasicMaterial({
                color: 0xff4444,
                transparent: true,
                opacity: 0.8
              });
            }
          }
        ]
      },
      {
        sceneId: 'origin',
        preloadDistance,
        unloadDistance,
        assets: [
          {
            id: 'mapGeometry',
            type: 'geometry',
            priority: 'high',
            estimatedSize: 0.15,
            dependencies: [],
            loader: async () => {
              return memoryManager.createOptimizedGeometry('box', [4, 0.1, 3]);
            }
          },
          {
            id: 'originMaterials',
            type: 'material',
            priority: 'high',
            estimatedSize: 0.03,
            dependencies: [],
            loader: async () => {
              return [
                new THREE.MeshBasicMaterial({ color: 0x4444ff }), // Peru
                new THREE.MeshBasicMaterial({ color: 0xffff44 })  // Germany
              ];
            }
          }
        ]
      },
      {
        sceneId: 'mission',
        preloadDistance,
        unloadDistance,
        assets: [
          {
            id: 'gearGeometry',
            type: 'geometry',
            priority: 'medium',
            estimatedSize: 0.2,
            dependencies: [],
            loader: async () => {
              return memoryManager.createOptimizedGeometry('torus', [1, 0.3, 8, 16]);
            }
          },
          {
            id: 'missionMaterial',
            type: 'material',
            priority: 'medium',
            estimatedSize: 0.02,
            dependencies: [],
            loader: async () => {
              return new THREE.MeshBasicMaterial({
                color: 0x666666,
                wireframe: true,
                transparent: true,
                opacity: 0.6
              });
            }
          }
        ]
      },
      {
        sceneId: 'present',
        preloadDistance,
        unloadDistance,
        assets: [
          {
            id: 'dataStreamGeometry',
            type: 'geometry',
            priority: 'medium',
            estimatedSize: 0.1,
            dependencies: [],
            loader: async () => {
              return memoryManager.createOptimizedGeometry('sphere', [0.05, 8, 6]);
            }
          },
          {
            id: 'presentMaterial',
            type: 'material',
            priority: 'medium',
            estimatedSize: 0.02,
            dependencies: [],
            loader: async () => {
              return new THREE.MeshBasicMaterial({
                color: 0x44ff44,
                transparent: true,
                opacity: 0.7
              });
            }
          }
        ]
      },
      {
        sceneId: 'vision',
        preloadDistance,
        unloadDistance,
        assets: [
          {
            id: 'modularGeometry',
            type: 'geometry',
            priority: 'low',
            estimatedSize: 0.25,
            dependencies: [],
            loader: async () => {
              return memoryManager.createOptimizedGeometry('box', [1, 1, 1]);
            }
          },
          {
            id: 'visionMaterial',
            type: 'material',
            priority: 'low',
            estimatedSize: 0.02,
            dependencies: [],
            loader: async () => {
              return new THREE.MeshBasicMaterial({
                color: 0xffff44,
                transparent: true,
                opacity: 0.8
              });
            }
          }
        ]
      },
      {
        sceneId: 'cta',
        preloadDistance,
        unloadDistance,
        assets: [
          {
            id: 'ctaGeometry',
            type: 'geometry',
            priority: 'low',
            estimatedSize: 0.1,
            dependencies: [],
            loader: async () => {
              return memoryManager.createOptimizedGeometry('sphere', [1.5, 16, 12]);
            }
          },
          {
            id: 'ctaMaterial',
            type: 'material',
            priority: 'low',
            estimatedSize: 0.02,
            dependencies: [],
            loader: async () => {
              return new THREE.MeshBasicMaterial({
                color: 0xff4444,
                transparent: true,
                opacity: 0.9
              });
            }
          }
        ]
      }
    ];

    // Register all scene configurations
    sceneConfigs.forEach(config => {
      progressiveLoader.registerScene(config);
    });

    console.log('🎬 Configured 6 scenes for progressive loading');
  }, [progressiveLoader, memoryManager, preloadDistance, unloadDistance]);

  // Update loading progress
  const updateProgress = useCallback(() => {
    const progress = progressiveLoader.getLoadingProgress();
    const stats = progressiveLoader.getStats();
    
    setLoadingState(prev => ({
      ...prev,
      progress,
      isLoading: progress.progress < 1,
      currentScene: stats.registeredScenes > 0 ? 'configured' : null
    }));
  }, [progressiveLoader]);

  // Handle loading errors
  const handleError = useCallback((error: Error, assetId?: string) => {
    if (!enableErrorHandling) return;
    
    console.warn(`Loading error for ${assetId || 'unknown asset'}:`, error);
    
    setLoadingState(prev => ({
      ...prev,
      error: `Failed to load ${assetId || 'asset'}: ${error.message}`,
      isLoading: false
    }));
  }, [enableErrorHandling]);

  // Initialize progressive loading
  useEffect(() => {
    if (enableScenePreloading) {
      configureScenes();
    }

    // Start loading critical assets
    progressiveLoader.preloadCriticalAssets().catch(error => {
      handleError(error, 'critical assets');
    });

    // Set up progress monitoring
    const progressInterval = setInterval(updateProgress, 100);

    return () => {
      clearInterval(progressInterval);
    };
  }, [enableScenePreloading, configureScenes, progressiveLoader, handleError, updateProgress]);

  // Update position for scene-based loading
  const updatePosition = useCallback((position: THREE.Vector3) => {
    if (enableScenePreloading) {
      progressiveLoader.updatePosition(position);
    }
  }, [progressiveLoader, enableScenePreloading]);

  // Get asset by ID
  const getAsset = useCallback(async (assetId: string) => {
    try {
      return await progressiveLoader.loadAssetById(assetId);
    } catch (error) {
      handleError(error as Error, assetId);
      return null;
    }
  }, [progressiveLoader, handleError]);

  // Check if asset is loaded
  const isAssetLoaded = useCallback((assetId: string): boolean => {
    return progressiveLoader.isAssetLoaded(assetId);
  }, [progressiveLoader]);

  // Clear error
  const clearError = useCallback(() => {
    setLoadingState(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  // Get loader stats for debugging
  const getStats = useCallback(() => {
    return progressiveLoader.getStats();
  }, [progressiveLoader]);

  return {
    loadingState,
    progressiveLoader,
    updatePosition,
    getAsset,
    isAssetLoaded,
    clearError,
    getStats
  };
};