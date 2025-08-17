'use client';

import type { Vector3 } from 'three';

/**
 * Advanced Gesture Recognition Types
 * Supporting multi-touch, prediction, and 3D interaction
 */

// Base gesture types
export type GestureType = 
  | 'tap' 
  | 'double-tap' 
  | 'triple-tap'
  | 'long-press' 
  | 'pan' 
  | 'swipe' 
  | 'pinch' 
  | 'rotate' 
  | 'multi-finger-pan'
  | 'edge-swipe'
  | 'force-touch'
  | 'orbit'
  | 'zoom'
  | 'twist'
  | 'flick'
  | 'hold-and-drag'
  | 'pressure-pan'
  | 'momentum-swipe'
  | 'corner-tap'
  | 'screen-edge-pan'
  | 'two-finger-rotate'
  | 'three-finger-pan'
  | 'four-finger-swipe'
  | 'palm-rejection'
  | 'hover-gesture'
  | 'air-tap'
  | 'directional-flick'
  | 'elastic-pull'
  | 'magnetic-snap'
  | 'vibration-feedback';

// Advanced gesture patterns
export type GesturePattern = 
  | 'circle'
  | 'line'
  | 'triangle'
  | 'square'
  | 'arrow'
  | 'spiral'
  | 'zigzag'
  | 'custom';

// Gesture directions
export type GestureDirection = 
  | 'up' 
  | 'down' 
  | 'left' 
  | 'right' 
  | 'up-left' 
  | 'up-right' 
  | 'down-left' 
  | 'down-right'
  | 'clockwise'
  | 'counter-clockwise'
  | 'inward'
  | 'outward';

// Touch point with enhanced tracking
export interface EnhancedTouchPoint {
  id: number;
  x: number;
  y: number;
  pressure: number;
  radiusX: number;
  radiusY: number;
  rotationAngle: number;
  timestamp: number;
  velocity: Vector2D;
  acceleration: Vector2D;
  force?: number; // For force touch devices
}

export interface Vector2D {
  x: number;
  y: number;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

// Gesture state with comprehensive tracking
export interface AdvancedGestureState {
  isActive: boolean;
  type: GestureType | null;
  pattern: GesturePattern | null;
  direction: GestureDirection | null;
  
  // Basic metrics
  duration: number;
  distance: number;
  velocity: number;
  acceleration: number;
  
  // Multi-touch specific
  touchCount: number;
  centerPoint: Vector2D;
  boundingBox: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
  };
  
  // Advanced properties
  scale: number;
  rotation: number;
  pressure: number;
  confidence: number; // Gesture recognition confidence (0-1)
  
  // Movement tracking
  path: Vector2D[];
  smoothedPath: Vector2D[];
  delta: Vector2D;
  momentum: Vector2D;
  
  // 3D interaction properties
  worldPosition?: Vector3D;
  screenToWorldRatio?: number;
  cameraDistance?: number;
}

// Gesture prediction state
export interface GesturePrediction {
  predictedType: GestureType;
  confidence: number;
  timeToComplete: number;
  predictedEndPoint: Vector2D;
  suggestedAction: string;
}

// Gesture recognition configuration
export interface GestureRecognitionConfig {
  // Thresholds
  tapThreshold: number;
  doubleTapInterval: number;
  longPressDelay: number;
  swipeThreshold: number;
  pinchThreshold: number;
  rotationThreshold: number;
  velocityThreshold: number;
  
  // Smoothing and prediction
  smoothingFactor: number;
  predictionEnabled: boolean;
  predictionLookAhead: number;
  
  // Performance
  maxTrackingPoints: number;
  samplingRate: number;
  debounceTime: number;
  
  // 3D interaction
  enable3DInteraction: boolean;
  worldSpaceGestures: boolean;
  gestureToWorldScale: number;
  
  // Device-specific
  enableForceTouch: boolean;
  enableHaptics: boolean;
  adaptToDevice: boolean;
}

// 3D interaction mappings
export interface Gesture3DMapping {
  gestureType: GestureType;
  action: '3d-rotate' | '3d-pan' | '3d-zoom' | '3d-focus' | 'section-navigate' | 'camera-shake' | 'object-select';
  sensitivity: number;
  constraints?: {
    minScale?: number;
    maxScale?: number;
    lockAxes?: ('x' | 'y' | 'z')[];
    snapPoints?: Vector3D[];
  };
  hapticFeedback?: HapticFeedbackPattern;
}

// Haptic feedback patterns
export interface HapticFeedbackPattern {
  type: 'impact' | 'notification' | 'selection' | 'custom';
  intensity: 'light' | 'medium' | 'heavy';
  duration?: number;
  pattern?: number[]; // For custom patterns
}

// Section navigation gestures
export interface SectionNavigationGesture {
  pattern: GesturePattern | GestureType;
  direction: GestureDirection;
  targetSection: number;
  transitionType: 'smooth' | 'snap' | 'bounce' | 'elastic';
  duration: number;
}

// Gesture shortcuts
export interface GestureShortcut {
  id: string;
  pattern: GestureType | GesturePattern;
  modifiers?: {
    touchCount?: number;
    direction?: GestureDirection;
    duration?: number;
    velocity?: number;
  };
  action: string;
  description: string;
  icon?: string;
  accessibility: {
    keyboardAlternative: string;
    screenReaderDescription: string;
    voiceCommand?: string;
  };
}

// Gesture recording for demos and training
export interface GestureRecording {
  id: string;
  name: string;
  description: string;
  timestamp: number;
  duration: number;
  touchPoints: EnhancedTouchPoint[][];
  gestureSequence: AdvancedGestureState[];
  metadata: {
    deviceType: 'mobile' | 'tablet' | 'desktop';
    screenSize: Vector2D;
    devicePixelRatio: number;
    userAgent: string;
  };
}

// Gesture training data
export interface GestureTrainingData {
  samples: GestureRecording[];
  recognitionModel?: unknown; // ML model for custom gesture recognition
  accuracy: number;
  lastTrainingDate: number;
}

// Advanced callbacks with enhanced context
export interface AdvancedGestureCallbacks {
  // Basic gestures
  onTap?: (point: Vector2D, context: GestureContext) => void;
  onDoubleTap?: (point: Vector2D, context: GestureContext) => void;
  onLongPress?: (point: Vector2D, context: GestureContext) => void;
  onPan?: (delta: Vector2D, state: AdvancedGestureState, context: GestureContext) => void;
  onSwipe?: (direction: GestureDirection, velocity: number, context: GestureContext) => void;
  
  // Multi-touch gestures
  onPinch?: (scale: number, center: Vector2D, state: AdvancedGestureState, context: GestureContext) => void;
  onRotate?: (angle: number, center: Vector2D, state: AdvancedGestureState, context: GestureContext) => void;
  onMultiFingerPan?: (delta: Vector2D, touchCount: number, context: GestureContext) => void;
  
  // Advanced patterns
  onCircle?: (center: Vector2D, radius: number, clockwise: boolean, context: GestureContext) => void;
  onShape?: (pattern: GesturePattern, points: Vector2D[], confidence: number, context: GestureContext) => void;
  onCustomPattern?: (path: Vector2D[], context: GestureContext) => void;
  
  // 3D interaction callbacks
  on3DRotate?: (rotation: Vector3D, context: GestureContext) => void;
  on3DPan?: (translation: Vector3D, context: GestureContext) => void;
  on3DZoom?: (zoom: number, context: GestureContext) => void;
  onObjectSelect?: (worldPosition: Vector3D, context: GestureContext) => void;
  
  // Section navigation
  onSectionNavigate?: (direction: 'next' | 'previous' | number, context: GestureContext) => void;
  onSectionSwipe?: (targetSection: number, context: GestureContext) => void;
  
  // Advanced features
  onGesturePredict?: (prediction: GesturePrediction, context: GestureContext) => void;
  onGestureStart?: (type: GestureType, context: GestureContext) => void;
  onGestureUpdate?: (state: AdvancedGestureState, context: GestureContext) => void;
  onGestureEnd?: (finalState: AdvancedGestureState, context: GestureContext) => void;
  
  // Error handling
  onGestureError?: (error: GestureError, context: GestureContext) => void;
  onGestureConflict?: (gestures: GestureType[], context: GestureContext) => void;
}

// Gesture context providing environmental information
export interface GestureContext {
  timestamp: number;
  element: HTMLElement;
  viewport: {
    width: number;
    height: number;
    pixelRatio: number;
  };
  device: {
    type: 'mobile' | 'tablet' | 'desktop';
    hasForceTouch: boolean;
    hasHaptics: boolean;
    maxTouchPoints: number;
  };
  camera?: {
    position: Vector3D;
    rotation: Vector3D;
    fov: number;
    distance: number;
  };
  scene?: {
    currentSection: number;
    scrollProgress: number;
    activeObjects: string[];
  };
  accessibility: {
    reduceMotion: boolean;
    highContrast: boolean;
    screenReader: boolean;
  };
}

// Error types for gesture recognition
export interface GestureError {
  code: 'UNSUPPORTED_GESTURE' | 'TIMEOUT' | 'CONFLICT' | 'DEVICE_LIMITATION' | 'PERFORMANCE_ISSUE';
  message: string;
  gesture?: GestureType;
  timestamp: number;
}

// Performance monitoring for gesture recognition
export interface GesturePerformanceMetrics {
  recognitionTime: number;
  processingLatency: number;
  memoryUsage: number;
  fps: number;
  droppedFrames: number;
  accuracyScore: number;
}

// Accessibility alternatives for gestures
export interface GestureAccessibilityAlternative {
  gestureId: string;
  keyboardShortcut: {
    key: string;
    modifiers: ('ctrl' | 'alt' | 'shift' | 'meta')[];
    description: string;
  };
  voiceCommand?: {
    phrase: string;
    variations: string[];
  };
  buttonAlternative?: {
    label: string;
    icon: string;
    position: 'fixed' | 'contextual';
  };
  description: string;
}