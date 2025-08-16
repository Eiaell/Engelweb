import * as THREE from 'three';
import { gsap } from 'gsap';
import {
  InteractionEvent,
  InteractionState,
  InteractionConfig,
  InteractableObject,
  Command,
  DragState,
  InteractionHandler,
  StateChangeHandler,
  CommandHandler,
  AnalyticsHandler,
  InteractionAnalytics,
  ObjectState,
  InteractionType,
  GestureData,
  PerformanceMetrics
} from '@/types/interactions';

export class InteractionManager {
  private state: InteractionState;
  private config: InteractionConfig;
  private canvas: HTMLCanvasElement | null = null;
  private camera: THREE.Camera | null = null;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private interactableObjects: Map<string, InteractableObject> = new Map();
  private eventHandlers: Map<InteractionType, InteractionHandler[]> = new Map();
  private stateChangeHandlers: StateChangeHandler[] = [];
  private commandHandlers: CommandHandler[] = [];
  private analyticsHandlers: AnalyticsHandler[] = [];
  
  // Performance monitoring
  private performanceMetrics: PerformanceMetrics;
  private lastFrameTime: number = 0;
  private interactionStartTime: number = 0;
  
  // Touch handling
  private touchState: Map<number, Touch> = new Map();
  private gestureRecognizer: GestureRecognizer;
  
  // Animation timeline for smooth interactions
  private animationTimeline: gsap.core.Timeline;

  constructor(config: Partial<InteractionConfig> = {}) {
    this.config = {
      enableAnalytics: true,
      enableUndoRedo: true,
      enableMultiSelect: true,
      enableAccessibility: true,
      performanceMode: 'high',
      touchEnabled: true,
      keyboardEnabled: true,
      maxUndoSteps: 50,
      analyticsBufferSize: 1000,
      animationDuration: 0.3,
      hoverDelay: 150,
      doubleClickThreshold: 300,
      ...config
    };

    this.state = {
      selectedObjects: new Set(),
      hoveredObject: null,
      dragState: null,
      filterState: {
        entityTypes: new Set(),
        documentTypes: new Set(),
        relationshipTypes: new Set(),
        confidenceThreshold: 0.5,
        dateRange: null,
        customFilters: {}
      },
      searchState: {
        query: '',
        results: [],
        highlightedResults: new Set(),
        searchType: 'semantic',
        isActive: false
      },
      mode: 'explore',
      multiSelectEnabled: this.config.enableMultiSelect,
      undoStack: [],
      redoStack: []
    };

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.gestureRecognizer = new GestureRecognizer();
    this.animationTimeline = gsap.timeline();
    
    this.performanceMetrics = {
      averageResponseTime: 0,
      frameRate: 60,
      memoryUsage: 0,
      interactionLatency: [],
      renderTime: []
    };

    this.initializeEventListeners();
  }

  // Initialize canvas and camera references
  initialize(canvas: HTMLCanvasElement, camera: THREE.Camera): void {
    this.canvas = canvas;
    this.camera = camera;
    this.setupCanvasEventListeners();
  }

  // Register an interactable object
  registerObject(object: InteractableObject): void {
    // Safety check to prevent undefined errors
    if (!object || !object.interactionData || !object.interactionData.id) {
      console.warn('InteractionManager: Invalid object registration attempt', object);
      return;
    }

    this.interactableObjects.set(object.interactionData.id, object);
    
    // Add accessibility attributes for screen readers
    if (this.config.enableAccessibility) {
      this.setupAccessibilityForObject(object);
    }
  }

  // Unregister an interactable object
  unregisterObject(objectId: string): void {
    this.interactableObjects.delete(objectId);
  }

  // Add event handler for specific interaction type
  on(type: InteractionType, handler: InteractionHandler): void {
    if (!this.eventHandlers.has(type)) {
      this.eventHandlers.set(type, []);
    }
    this.eventHandlers.get(type)!.push(handler);
  }

  // Remove event handler
  off(type: InteractionType, handler: InteractionHandler): void {
    const handlers = this.eventHandlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // Add state change handler
  onStateChange(handler: StateChangeHandler): void {
    this.stateChangeHandlers.push(handler);
  }

  // Add command handler for undo/redo
  onCommand(handler: CommandHandler): void {
    this.commandHandlers.push(handler);
  }

  // Add analytics handler
  onAnalytics(handler: AnalyticsHandler): void {
    this.analyticsHandlers.push(handler);
  }

  // Get current interaction state
  getState(): InteractionState {
    return { ...this.state };
  }

  // Update interaction state
  updateState(newState: Partial<InteractionState>): void {
    const oldState = { ...this.state };
    this.state = { ...this.state, ...newState };
    
    // Notify state change handlers
    this.stateChangeHandlers.forEach(handler => {
      handler(newState);
    });

    // Track analytics if enabled
    if (this.config.enableAnalytics) {
      this.trackStateChange(oldState, this.state);
    }
  }

  // Execute command with undo/redo support
  executeCommand(command: Command): void {
    if (this.config.enableUndoRedo) {
      // Clear redo stack when executing new command
      this.state.redoStack = [];
      
      // Add to undo stack
      this.state.undoStack.push(command);
      
      // Limit undo stack size
      if (this.state.undoStack.length > this.config.maxUndoSteps) {
        this.state.undoStack.shift();
      }
    }

    // Execute the command
    command.execute();
    
    // Notify command handlers
    this.commandHandlers.forEach(handler => {
      handler(command);
    });

    // Track analytics
    if (this.config.enableAnalytics) {
      this.trackCommand(command);
    }
  }

  // Undo last command
  undo(): boolean {
    if (this.state.undoStack.length === 0) return false;
    
    const command = this.state.undoStack.pop()!;
    command.undo();
    this.state.redoStack.push(command);
    
    return true;
  }

  // Redo last undone command
  redo(): boolean {
    if (this.state.redoStack.length === 0) return false;
    
    const command = this.state.redoStack.pop()!;
    command.execute();
    this.state.undoStack.push(command);
    
    return true;
  }

  // Update object state with smooth animations
  updateObjectState(objectId: string, newState: ObjectState): void {
    const object = this.interactableObjects.get(objectId);
    if (!object) return;

    const oldState = object.interactionData.state;
    object.interactionData.state = newState;

    // Animate state transition
    this.animateStateTransition(object, oldState, newState);

    // Announce to screen readers if accessibility enabled
    if (this.config.enableAccessibility) {
      this.announceStateChange(object, newState);
    }
  }

  // Handle object selection
  selectObject(objectId: string, multiSelect: boolean = false): void {
    if (!multiSelect && !this.state.multiSelectEnabled) {
      this.clearSelection();
    }

    this.state.selectedObjects.add(objectId);
    this.updateObjectState(objectId, 'selected');
    
    this.emitEvent({
      type: 'select',
      target: this.interactableObjects.get(objectId) || null,
      data: { objectId, multiSelect },
      timestamp: Date.now(),
      position: this.mouse
    });
  }

  // Clear all selections
  clearSelection(): void {
    this.state.selectedObjects.forEach(objectId => {
      this.updateObjectState(objectId, 'idle');
    });
    this.state.selectedObjects.clear();
  }

  // Start drag operation
  startDrag(objectId: string, startPosition: THREE.Vector3): void {
    const object = this.interactableObjects.get(objectId);
    if (!object || !object.interactionData.capabilities.includes('draggable')) {
      return;
    }

    this.state.dragState = {
      objectId,
      startPosition: startPosition.clone(),
      currentPosition: startPosition.clone(),
      targetPosition: null,
      isValid: true
    };

    this.updateObjectState(objectId, 'dragging');
    
    // Create ghost object for visual feedback
    this.createDragGhost(object);

    this.emitEvent({
      type: 'dragStart',
      target: object,
      data: { objectId, startPosition },
      timestamp: Date.now(),
      position: this.mouse
    });
  }

  // Update drag operation
  updateDrag(currentPosition: THREE.Vector3): void {
    if (!this.state.dragState) return;

    this.state.dragState.currentPosition = currentPosition.clone();
    
    // Update ghost object position
    if (this.state.dragState.ghostObject) {
      this.state.dragState.ghostObject.position.copy(currentPosition);
    }

    // Validate drop target
    this.validateDropTarget(currentPosition);

    this.emitEvent({
      type: 'drag',
      target: this.interactableObjects.get(this.state.dragState.objectId) || null,
      data: { currentPosition, isValid: this.state.dragState.isValid },
      timestamp: Date.now(),
      position: this.mouse
    });
  }

  // End drag operation
  endDrag(): void {
    if (!this.state.dragState) return;

    const { objectId, isValid, targetPosition } = this.state.dragState;
    const object = this.interactableObjects.get(objectId);

    if (object && isValid && targetPosition) {
      // Animate to final position
      this.animateObjectToPosition(object, targetPosition);
      
      // Create undo command
      const originalPosition = this.state.dragState.startPosition;
      const command: Command = {
        id: `move-${objectId}-${Date.now()}`,
        type: 'move',
        timestamp: Date.now(),
        data: { objectId, originalPosition, targetPosition },
        execute: () => {
          object.position.copy(targetPosition);
        },
        undo: () => {
          object.position.copy(originalPosition);
        }
      };
      
      this.executeCommand(command);
    }

    // Clean up drag state
    this.cleanupDrag();
    this.updateObjectState(objectId, 'idle');

    this.emitEvent({
      type: 'dragEnd',
      target: object || null,
      data: { objectId, success: isValid },
      timestamp: Date.now(),
      position: this.mouse
    });
  }

  // Filter objects by criteria
  filterObjects(filterCriteria: Partial<InteractionState['filterState']>): void {
    this.updateState({
      filterState: { ...this.state.filterState, ...filterCriteria }
    });

    // Apply filters to all objects
    this.interactableObjects.forEach((object, objectId) => {
      const shouldShow = this.evaluateFilter(object);
      this.updateObjectState(objectId, shouldShow ? 'idle' : 'filtered');
    });

    this.emitEvent({
      type: 'filter',
      target: null,
      data: { filterCriteria },
      timestamp: Date.now(),
      position: this.mouse
    });
  }

  // Search objects
  searchObjects(query: string, searchType: 'semantic' | 'exact' | 'fuzzy' = 'semantic'): void {
    const results = this.performSearch(query, searchType);
    
    this.updateState({
      searchState: {
        query,
        results,
        highlightedResults: new Set(results),
        searchType,
        isActive: true
      }
    });

    // Highlight search results
    this.highlightSearchResults(results);

    this.emitEvent({
      type: 'search',
      target: null,
      data: { query, results, searchType },
      timestamp: Date.now(),
      position: this.mouse
    });
  }

  // Update performance metrics
  updatePerformanceMetrics(frameTime: number): void {
    const currentTime = performance.now();
    
    if (this.interactionStartTime > 0) {
      const latency = currentTime - this.interactionStartTime;
      this.performanceMetrics.interactionLatency.push(latency);
      
      // Keep only last 100 measurements
      if (this.performanceMetrics.interactionLatency.length > 100) {
        this.performanceMetrics.interactionLatency.shift();
      }
      
      // Calculate average response time
      this.performanceMetrics.averageResponseTime = 
        this.performanceMetrics.interactionLatency.reduce((a, b) => a + b, 0) / 
        this.performanceMetrics.interactionLatency.length;
    }

    this.performanceMetrics.frameRate = 1000 / frameTime;
    this.performanceMetrics.renderTime.push(frameTime);
    
    if (this.performanceMetrics.renderTime.length > 100) {
      this.performanceMetrics.renderTime.shift();
    }

    this.lastFrameTime = currentTime;
  }

  // Dispose of resources
  dispose(): void {
    this.removeCanvasEventListeners();
    this.animationTimeline.kill();
    this.interactableObjects.clear();
    this.eventHandlers.clear();
    this.stateChangeHandlers.length = 0;
    this.commandHandlers.length = 0;
    this.analyticsHandlers.length = 0;
  }

  // Private methods

  private initializeEventListeners(): void {
    // Keyboard event handlers
    if (this.config.keyboardEnabled) {
      document.addEventListener('keydown', this.handleKeyDown.bind(this));
      document.addEventListener('keyup', this.handleKeyUp.bind(this));
    }
  }

  private setupCanvasEventListeners(): void {
    if (!this.canvas) return;

    // Mouse events
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('click', this.handleClick.bind(this));
    this.canvas.addEventListener('dblclick', this.handleDoubleClick.bind(this));
    this.canvas.addEventListener('contextmenu', this.handleContextMenu.bind(this));

    // Touch events
    if (this.config.touchEnabled) {
      this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
      this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
      this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
    }

    // Pointer events
    this.canvas.addEventListener('pointerdown', this.handlePointerDown.bind(this));
    this.canvas.addEventListener('pointermove', this.handlePointerMove.bind(this));
    this.canvas.addEventListener('pointerup', this.handlePointerUp.bind(this));
  }

  private removeCanvasEventListeners(): void {
    if (!this.canvas) return;

    // Remove all event listeners
    this.canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    // ... (remove all other listeners)
  }

  private handleMouseMove(event: MouseEvent): void {
    this.updateMousePosition(event);
    
    const intersectedObject = this.getIntersectedObject();
    
    // Handle hover state changes
    if (intersectedObject) {
      if (this.state.hoveredObject !== intersectedObject.interactionData.id) {
        // Clear previous hover
        if (this.state.hoveredObject) {
          this.updateObjectState(this.state.hoveredObject, 'idle');
        }
        
        // Set new hover
        this.state.hoveredObject = intersectedObject.interactionData.id;
        this.updateObjectState(intersectedObject.interactionData.id, 'hovered');
        
        this.emitEvent({
          type: 'hover',
          target: intersectedObject,
          data: { enter: true },
          timestamp: Date.now(),
          position: this.mouse
        });
      }
    } else if (this.state.hoveredObject) {
      // Clear hover
      this.updateObjectState(this.state.hoveredObject, 'idle');
      this.state.hoveredObject = null;
    }

    // Handle drag update
    if (this.state.dragState) {
      const worldPosition = this.screenToWorld(this.mouse);
      this.updateDrag(worldPosition);
    }
  }

  private handleClick(event: MouseEvent): void {
    event.preventDefault();
    this.interactionStartTime = performance.now();
    
    const intersectedObject = this.getIntersectedObject();
    
    if (intersectedObject) {
      const multiSelect = event.ctrlKey || event.metaKey;
      this.selectObject(intersectedObject.interactionData.id, multiSelect);
    } else {
      this.clearSelection();
    }
  }

  private handleMouseDown(event: MouseEvent): void {
    const intersectedObject = this.getIntersectedObject();
    
    if (intersectedObject && intersectedObject.interactionData.capabilities.includes('draggable')) {
      const worldPosition = this.screenToWorld(this.mouse);
      this.startDrag(intersectedObject.interactionData.id, worldPosition);
    }
  }

  private handleMouseUp(event: MouseEvent): void {
    if (this.state.dragState) {
      this.endDrag();
    }
  }

  private handleDoubleClick(event: MouseEvent): void {
    const intersectedObject = this.getIntersectedObject();
    
    if (intersectedObject) {
      this.emitEvent({
        type: 'doubleClick',
        target: intersectedObject,
        data: { objectId: intersectedObject.interactionData.id },
        timestamp: Date.now(),
        position: this.mouse
      });
    }
  }

  private handleContextMenu(event: MouseEvent): void {
    event.preventDefault();
    
    const intersectedObject = this.getIntersectedObject();
    
    if (intersectedObject) {
      this.emitEvent({
        type: 'rightClick',
        target: intersectedObject,
        data: { objectId: intersectedObject.interactionData.id },
        timestamp: Date.now(),
        position: this.mouse
      });
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    // Handle keyboard shortcuts
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'z':
          event.preventDefault();
          if (event.shiftKey) {
            this.redo();
          } else {
            this.undo();
          }
          break;
        case 'a':
          event.preventDefault();
          this.selectAllVisible();
          break;
        case 'f':
          event.preventDefault();
          this.focusOnSelection();
          break;
      }
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    // Handle key release events
  }

  private handleTouchStart(event: TouchEvent): void {
    // Touch event handling with gesture recognition
    this.gestureRecognizer.handleTouchStart(event);
  }

  private handleTouchMove(event: TouchEvent): void {
    this.gestureRecognizer.handleTouchMove(event);
  }

  private handleTouchEnd(event: TouchEvent): void {
    const gesture = this.gestureRecognizer.handleTouchEnd(event);
    
    if (gesture) {
      this.handleGesture(gesture);
    }
  }

  private handlePointerDown(event: PointerEvent): void {
    // Unified pointer event handling
  }

  private handlePointerMove(event: PointerEvent): void {
    // Unified pointer event handling
  }

  private handlePointerUp(event: PointerEvent): void {
    // Unified pointer event handling
  }

  private handleGesture(gesture: GestureData): void {
    // Handle touch gestures
    switch (gesture.gesture) {
      case 'tap':
        // Handle tap
        break;
      case 'pinch':
        // Handle pinch to zoom
        break;
      case 'pan':
        // Handle pan to navigate
        break;
      case 'swipe':
        // Handle swipe for navigation
        break;
      case 'longPress':
        // Handle long press for context menu
        break;
    }
  }

  private updateMousePosition(event: MouseEvent): void {
    if (!this.canvas) return;
    
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private getIntersectedObject(): InteractableObject | null {
    if (!this.camera) return null;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const objects = Array.from(this.interactableObjects.values());
    const intersects = this.raycaster.intersectObjects(objects, true);
    
    if (intersects.length > 0) {
      // Find the closest interactable object
      for (const intersect of intersects) {
        let object = intersect.object;
        while (object && !this.isInteractableObject(object)) {
          object = object.parent;
        }
        if (object && this.isInteractableObject(object)) {
          return object as InteractableObject;
        }
      }
    }
    
    return null;
  }

  private isInteractableObject(object: THREE.Object3D): boolean {
    return 'interactionData' in object;
  }

  private screenToWorld(screenPosition: THREE.Vector2): THREE.Vector3 {
    if (!this.camera) return new THREE.Vector3();
    
    const vector = new THREE.Vector3(screenPosition.x, screenPosition.y, 0.5);
    vector.unproject(this.camera);
    
    if (this.camera.type === 'PerspectiveCamera') {
      const dir = vector.sub(this.camera.position).normalize();
      const distance = -this.camera.position.z / dir.z;
      return this.camera.position.clone().add(dir.multiplyScalar(distance));
    }
    
    return vector;
  }

  private emitEvent(event: InteractionEvent): void {
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => handler(event));
    }

    // Track analytics
    if (this.config.enableAnalytics) {
      this.trackInteraction(event);
    }
  }

  private animateStateTransition(object: InteractableObject, oldState: ObjectState, newState: ObjectState): void {
    // Animate visual state transitions
    const timeline = gsap.timeline();
    
    switch (newState) {
      case 'hovered':
        timeline.to(object.scale, {
          duration: this.config.animationDuration,
          x: 1.1,
          y: 1.1,
          z: 1.1,
          ease: 'power2.out'
        });
        break;
      case 'selected':
        timeline.to(object.scale, {
          duration: this.config.animationDuration,
          x: 1.2,
          y: 1.2,
          z: 1.2,
          ease: 'back.out(1.7)'
        });
        break;
      case 'idle':
        timeline.to(object.scale, {
          duration: this.config.animationDuration,
          x: 1,
          y: 1,
          z: 1,
          ease: 'power2.out'
        });
        break;
    }
  }

  private createDragGhost(object: InteractableObject): void {
    // Create visual ghost for drag operation
    const ghost = object.clone();
    ghost.traverse(child => {
      if (child.material) {
        child.material = child.material.clone();
        child.material.transparent = true;
        child.material.opacity = 0.5;
      }
    });
    
    if (this.state.dragState) {
      this.state.dragState.ghostObject = ghost;
    }
    
    object.parent?.add(ghost);
  }

  private cleanupDrag(): void {
    if (this.state.dragState?.ghostObject) {
      this.state.dragState.ghostObject.parent?.remove(this.state.dragState.ghostObject);
    }
    this.state.dragState = null;
  }

  private validateDropTarget(position: THREE.Vector3): void {
    if (!this.state.dragState) return;
    
    // Implement drop target validation logic
    this.state.dragState.isValid = true; // Simplified for now
    this.state.dragState.targetPosition = position;
  }

  private animateObjectToPosition(object: InteractableObject, targetPosition: THREE.Vector3): void {
    gsap.to(object.position, {
      duration: this.config.animationDuration,
      x: targetPosition.x,
      y: targetPosition.y,
      z: targetPosition.z,
      ease: 'power2.out'
    });
  }

  private evaluateFilter(object: InteractableObject): boolean {
    // Implement filter evaluation logic
    return true; // Simplified for now
  }

  private performSearch(query: string, searchType: string): string[] {
    // Implement search logic
    const results: string[] = [];
    
    this.interactableObjects.forEach((object, objectId) => {
      // Simple text matching for now
      const metadata = object.interactionData.metadata;
      const searchText = JSON.stringify(metadata).toLowerCase();
      
      if (searchText.includes(query.toLowerCase())) {
        results.push(objectId);
      }
    });
    
    return results;
  }

  private highlightSearchResults(results: string[]): void {
    // Clear previous highlights
    this.interactableObjects.forEach((object, objectId) => {
      if (object.interactionData.state === 'highlighted') {
        this.updateObjectState(objectId, 'idle');
      }
    });
    
    // Highlight new results
    results.forEach(objectId => {
      this.updateObjectState(objectId, 'highlighted');
    });
  }

  private selectAllVisible(): void {
    this.interactableObjects.forEach((object, objectId) => {
      if (object.interactionData.state !== 'filtered') {
        this.selectObject(objectId, true);
      }
    });
  }

  private focusOnSelection(): void {
    // Implement camera focus on selected objects
    if (this.state.selectedObjects.size > 0) {
      // Calculate bounding box of selected objects
      // Animate camera to focus on them
    }
  }

  private setupAccessibilityForObject(object: InteractableObject): void {
    // Setup accessibility attributes
    const { accessibility } = object.interactionData;
    
    // Add ARIA attributes
    object.userData.ariaLabel = accessibility.label;
    object.userData.ariaDescription = accessibility.description;
    object.userData.role = accessibility.role;
  }

  private announceStateChange(object: InteractableObject, newState: ObjectState): void {
    // Announce state changes to screen readers
    const announcement = `${object.interactionData.accessibility.label} is now ${newState}`;
    // Implement screen reader announcement
  }

  private trackInteraction(event: InteractionEvent): void {
    // Track interaction for analytics
    const analytics: Partial<InteractionAnalytics> = {
      interactions: [event],
      performance: this.performanceMetrics
    };
    
    this.analyticsHandlers.forEach(handler => {
      handler(analytics);
    });
  }

  private trackStateChange(oldState: InteractionState, newState: InteractionState): void {
    // Track state changes for analytics
  }

  private trackCommand(command: Command): void {
    // Track command execution for analytics
  }
}

// Gesture recognition helper class
class GestureRecognizer {
  private startTouches: Touch[] = [];
  private currentTouches: Touch[] = [];
  private startTime: number = 0;
  private startDistance: number = 0;
  private startAngle: number = 0;

  handleTouchStart(event: TouchEvent): void {
    this.startTouches = Array.from(event.touches);
    this.startTime = Date.now();
    
    if (this.startTouches.length === 2) {
      this.startDistance = this.getTouchDistance(this.startTouches[0], this.startTouches[1]);
      this.startAngle = this.getTouchAngle(this.startTouches[0], this.startTouches[1]);
    }
  }

  handleTouchMove(event: TouchEvent): void {
    this.currentTouches = Array.from(event.touches);
  }

  handleTouchEnd(event: TouchEvent): GestureData | null {
    const duration = Date.now() - this.startTime;
    const remainingTouches = Array.from(event.touches);
    
    // Detect gesture based on touch data
    if (this.startTouches.length === 1 && remainingTouches.length === 0) {
      const deltaX = this.currentTouches[0]?.clientX - this.startTouches[0].clientX || 0;
      const deltaY = this.currentTouches[0]?.clientY - this.startTouches[0].clientY || 0;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      if (duration < 300 && distance < 10) {
        return {
          gesture: 'tap',
          touches: 1,
          deltaX: 0,
          deltaY: 0
        };
      } else if (duration > 500 && distance < 10) {
        return {
          gesture: 'longPress',
          touches: 1,
          deltaX: 0,
          deltaY: 0
        };
      } else if (distance > 50) {
        const velocity = distance / duration;
        if (velocity > 0.5) {
          return {
            gesture: 'swipe',
            touches: 1,
            deltaX,
            deltaY,
            velocity
          };
        } else {
          return {
            gesture: 'pan',
            touches: 1,
            deltaX,
            deltaY
          };
        }
      }
    } else if (this.startTouches.length === 2) {
      const currentDistance = this.getTouchDistance(this.currentTouches[0], this.currentTouches[1]);
      const currentAngle = this.getTouchAngle(this.currentTouches[0], this.currentTouches[1]);
      
      const scale = currentDistance / this.startDistance;
      const rotation = currentAngle - this.startAngle;
      
      return {
        gesture: 'pinch',
        touches: 2,
        deltaX: 0,
        deltaY: 0,
        scale,
        rotation
      };
    }
    
    return null;
  }

  private getTouchDistance(touch1: Touch, touch2: Touch): number {
    const deltaX = touch2.clientX - touch1.clientX;
    const deltaY = touch2.clientY - touch1.clientY;
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  }

  private getTouchAngle(touch1: Touch, touch2: Touch): number {
    const deltaX = touch2.clientX - touch1.clientX;
    const deltaY = touch2.clientY - touch1.clientY;
    return Math.atan2(deltaY, deltaX);
  }
}