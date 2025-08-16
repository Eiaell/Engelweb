import * as THREE from 'three';

// Core interaction types for enterprise 3D visualization
export interface InteractionEvent {
  type: InteractionType;
  target: THREE.Object3D | null;
  data: any;
  timestamp: number;
  position: THREE.Vector3;
  multiSelect?: boolean;
  gestureData?: GestureData;
}

export type InteractionType = 
  | 'hover'
  | 'click'
  | 'doubleClick'
  | 'rightClick'
  | 'dragStart'
  | 'drag'
  | 'dragEnd'
  | 'select'
  | 'deselect'
  | 'multiSelect'
  | 'filter'
  | 'search'
  | 'validate'
  | 'merge'
  | 'inspect'
  | 'duplicate'
  | 'move'
  | 'trace'
  | 'analyze'
  | 'explore';

export interface GestureData {
  gesture: 'tap' | 'pinch' | 'pan' | 'swipe' | 'longPress';
  touches: number;
  deltaX: number;
  deltaY: number;
  scale?: number;
  rotation?: number;
  velocity?: number;
}

export interface InteractableObject extends THREE.Object3D {
  interactionData: {
    id: string;
    type: string;
    metadata: Record<string, any>;
    state: ObjectState;
    capabilities: InteractionCapability[];
    accessibility: AccessibilityData;
  };
}

export type ObjectState = 
  | 'idle'
  | 'hovered'
  | 'selected'
  | 'dragging'
  | 'validating'
  | 'processing'
  | 'highlighted'
  | 'filtered'
  | 'disabled';

export type InteractionCapability = 
  | 'draggable'
  | 'selectable'
  | 'filterable'
  | 'inspectable'
  | 'mergeable'
  | 'duplicatable'
  | 'deletable'
  | 'connectable'
  | 'expandable'
  | 'traceable';

export interface AccessibilityData {
  label: string;
  description: string;
  role: string;
  keyboardShortcuts: string[];
  announcements: string[];
}

export interface InteractionState {
  selectedObjects: Set<string>;
  hoveredObject: string | null;
  dragState: DragState | null;
  filterState: FilterState;
  searchState: SearchState;
  mode: InteractionMode;
  multiSelectEnabled: boolean;
  undoStack: Command[];
  redoStack: Command[];
}

export interface DragState {
  objectId: string;
  startPosition: THREE.Vector3;
  currentPosition: THREE.Vector3;
  targetPosition: THREE.Vector3 | null;
  isValid: boolean;
  ghostObject?: THREE.Object3D;
}

export interface FilterState {
  entityTypes: Set<string>;
  documentTypes: Set<string>;
  relationshipTypes: Set<string>;
  confidenceThreshold: number;
  dateRange: { start: Date; end: Date } | null;
  customFilters: Record<string, any>;
}

export interface SearchState {
  query: string;
  results: string[];
  highlightedResults: Set<string>;
  searchType: 'semantic' | 'exact' | 'fuzzy';
  isActive: boolean;
}

export type InteractionMode = 
  | 'explore'
  | 'select'
  | 'filter'
  | 'search'
  | 'validate'
  | 'analyze'
  | 'trace'
  | 'accessibility';

export interface Command {
  id: string;
  type: string;
  timestamp: number;
  data: any;
  execute: () => void;
  undo: () => void;
  merge?: (other: Command) => Command | null;
  canMerge?: (other: Command) => boolean;
}

export interface InteractionAnalytics {
  sessionId: string;
  userId?: string;
  interactions: InteractionEvent[];
  performance: PerformanceMetrics;
  userBehavior: UserBehaviorMetrics;
}

export interface PerformanceMetrics {
  averageResponseTime: number;
  frameRate: number;
  memoryUsage: number;
  interactionLatency: number[];
  renderTime: number[];
}

export interface UserBehaviorMetrics {
  mostUsedInteractions: Record<InteractionType, number>;
  sessionDuration: number;
  objectExplorationTime: Record<string, number>;
  errorRate: number;
  helpRequests: number;
}

export interface InteractionConfig {
  enableAnalytics: boolean;
  enableUndoRedo: boolean;
  enableMultiSelect: boolean;
  enableAccessibility: boolean;
  performanceMode: 'high' | 'medium' | 'low';
  touchEnabled: boolean;
  keyboardEnabled: boolean;
  maxUndoSteps: number;
  analyticsBufferSize: number;
  animationDuration: number;
  hoverDelay: number;
  doubleClickThreshold: number;
}

// Scene-specific interaction types
export interface VectorizationInteraction {
  chunkId: string;
  documentType: 'process' | 'policy' | 'data' | 'metadata';
  confidence: number;
  position: THREE.Vector3;
  connections: string[];
}

export interface EntityExtractionInteraction {
  entityId: string;
  entityType: 'PERSONAS' | 'PROCESOS' | 'RELACIONES' | 'CONCEPTOS';
  extractionConfidence: number;
  validationState: 'pending' | 'validated' | 'rejected' | 'merged';
  relationships: string[];
}

export interface KnowledgeGraphInteraction {
  nodeId: string;
  nodeType: 'CORE' | 'ENTITY' | 'PROCESS' | 'RELATION';
  connections: string[];
  clusterData: ClusterData;
  pathfindingData?: PathfindingData;
}

export interface ClusterData {
  clusterId: string;
  clusterType: string;
  members: string[];
  centroid: THREE.Vector3;
  cohesion: number;
}

export interface PathfindingData {
  startNode: string;
  endNode: string;
  path: string[];
  weight: number;
  algorithm: 'dijkstra' | 'astar' | 'semantic';
}

export interface QueryResponseInteraction {
  queryId: string;
  evidenceNodes: string[];
  traceData: TraceData;
  responseQuality: 'detailed' | 'summary' | 'executive';
  citations: CitationData[];
}

export interface TraceData {
  queryPath: THREE.Vector3[];
  evidenceActivation: Record<string, number>;
  confidenceScores: number[];
  sourceWeights: Record<string, number>;
}

export interface CitationData {
  sourceId: string;
  documentType: string;
  relevanceScore: number;
  excerpt: string;
  position: THREE.Vector3;
}

// Event handlers
export type InteractionHandler = (event: InteractionEvent) => void;
export type StateChangeHandler = (newState: Partial<InteractionState>) => void;
export type CommandHandler = (command: Command) => void;
export type AnalyticsHandler = (analytics: Partial<InteractionAnalytics>) => void;