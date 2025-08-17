'use client';

import { EventEmitter } from 'events';
import * as THREE from 'three';
import { InteractionCommand, Interactive3DObject } from '@/types/interactions';

// Enhanced command types for complex operations
export interface BaseCommand {
  id: string;
  type: string;
  timestamp: number;
  description: string;
  groupId?: string;
  merged?: boolean;
  data: Record<string, any>;
}

export interface ExecutableCommand extends BaseCommand {
  execute: () => void | Promise<void>;
  undo: () => void | Promise<void>;
  redo?: () => void | Promise<void>;
  canExecute: () => boolean;
  canUndo: () => boolean;
  merge?: (otherCommand: ExecutableCommand) => ExecutableCommand | null;
}

// State snapshot for complex undo operations
export interface StateSnapshot {
  id: string;
  timestamp: Date;
  objectStates: Map<string, {
    position: THREE.Vector3;
    rotation: THREE.Euler;
    scale: THREE.Vector3;
    visible: boolean;
    opacity: number;
    state: string;
    data: unknown;
  }>;
  sceneState: {
    camera: {
      position: THREE.Vector3;
      rotation: THREE.Euler;
      fov: number;
    };
    selection: string[];
    filters: unknown[];
    settings: Record<string, unknown>;
  };
  metadata: {
    commandId: string;
    userAction: string;
    complexity: number;
  };
}

// Macro command for complex operations
export interface MacroCommand extends BaseCommand {
  commands: ExecutableCommand[];
  executeAll: () => Promise<void>;
  undoAll: () => Promise<void>;
  canExecuteAll: () => boolean;
  canUndoAll: () => boolean;
}

// Undo/Redo system configuration
export interface UndoRedoConfig {
  maxHistorySize: number;
  maxSnapshotSize: number;
  autoGroupTimeout: number;
  enableSnapshots: boolean;
  enableMerging: boolean;
  enableMacros: boolean;
  compressionThreshold: number;
  persistToDisk: boolean;
  batchSize: number;
}

export class UndoRedoSystem extends EventEmitter {
  private commands: ExecutableCommand[] = [];
  private snapshots: StateSnapshot[] = [];
  private currentIndex: number = -1;
  private snapshotIndex: number = -1;
  private config: UndoRedoConfig;
  private groupTimer: NodeJS.Timeout | null = null;
  private currentGroupId: string | null = null;
  private pendingCommands: ExecutableCommand[] = [];
  private executing: boolean = false;
  private objectRegistry: Map<string, Interactive3DObject> = new Map();

  constructor(config: Partial<UndoRedoConfig> = {}) {
    super();
    
    this.config = {
      maxHistorySize: 100,
      maxSnapshotSize: 20,
      autoGroupTimeout: 1000,
      enableSnapshots: true,
      enableMerging: true,
      enableMacros: true,
      compressionThreshold: 50,
      persistToDisk: false,
      batchSize: 10,
      ...config
    };

    this.initializeEventHandlers();
  }

  private initializeEventHandlers(): void {
    // Handle memory cleanup
    this.on('historyChanged', this.cleanupHistory.bind(this));
    this.on('snapshotCreated', this.cleanupSnapshots.bind(this));
  }

  // Command execution with enhanced features
  public async executeCommand(command: ExecutableCommand): Promise<boolean> {
    if (this.executing) {
      this.pendingCommands.push(command);
      return false;
    }

    try {
      this.executing = true;

      // Check if command can be executed
      if (!command.canExecute()) {
        throw new Error(`Command ${command.id} cannot be executed`);
      }

      // Handle command grouping
      if (this.config.enableMerging && this.shouldMergeCommand(command)) {
        const merged = this.mergeWithLastCommand(command);
        if (merged) {
          this.executing = false;
          return true;
        }
      }

      // Create snapshot if needed
      if (this.config.enableSnapshots && this.shouldCreateSnapshot(command)) {
        await this.createSnapshot(command);
      }

      // Clear redo history
      this.clearRedoHistory();

      // Execute the command
      await command.execute();

      // Add to history
      this.addCommandToHistory(command);

      // Handle auto-grouping
      this.handleAutoGrouping(command);

      // Emit events
      this.emit('commandExecuted', command);
      this.emit('historyChanged');

      this.executing = false;

      // Process pending commands
      if (this.pendingCommands.length > 0) {
        const nextCommand = this.pendingCommands.shift()!;
        setTimeout(() => this.executeCommand(nextCommand), 0);
      }

      return true;

    } catch (error) {
      this.executing = false;
      this.emit('commandError', { command, error });
      console.error('Command execution failed:', error);
      return false;
    }
  }

  // Enhanced undo with snapshot support
  public async undo(): Promise<boolean> {
    if (!this.canUndo()) return false;

    try {
      const command = this.commands[this.currentIndex];
      
      // Check if we need to restore from snapshot
      if (this.shouldRestoreFromSnapshot(command)) {
        return await this.restoreFromSnapshot();
      }

      // Check if command can be undone
      if (!command.canUndo()) {
        throw new Error(`Command ${command.id} cannot be undone`);
      }

      // Handle grouped commands
      if (command.groupId && this.isGroupedCommand(command)) {
        return await this.undoGroup(command.groupId);
      }

      // Execute undo
      await command.undo();
      this.currentIndex--;

      this.emit('commandUndone', command);
      this.emit('historyChanged');

      return true;

    } catch (error) {
      this.emit('undoError', error);
      console.error('Undo failed:', error);
      return false;
    }
  }

  // Enhanced redo with snapshot support
  public async redo(): Promise<boolean> {
    if (!this.canRedo()) return false;

    try {
      const command = this.commands[this.currentIndex + 1];

      // Check if command can be executed
      if (!command.canExecute()) {
        throw new Error(`Command ${command.id} cannot be redone`);
      }

      // Handle grouped commands
      if (command.groupId && this.isGroupedCommand(command)) {
        return await this.redoGroup(command.groupId);
      }

      // Execute redo (or original execute if no redo method)
      if (command.redo) {
        await command.redo();
      } else {
        await command.execute();
      }

      this.currentIndex++;

      this.emit('commandRedone', command);
      this.emit('historyChanged');

      return true;

    } catch (error) {
      this.emit('redoError', error);
      console.error('Redo failed:', error);
      return false;
    }
  }

  // Macro command execution
  public async executeMacro(macro: MacroCommand): Promise<boolean> {
    if (!this.config.enableMacros) {
      throw new Error('Macros are disabled');
    }

    try {
      if (!macro.canExecuteAll()) {
        throw new Error(`Macro ${macro.id} cannot be executed`);
      }

      // Create snapshot before macro execution
      if (this.config.enableSnapshots) {
        await this.createSnapshot({
          ...macro,
          type: 'macro',
        } as ExecutableCommand);
      }

      await macro.executeAll();

      // Add macro as a single command to history
      const macroCommand: ExecutableCommand = {
        ...macro,
        execute: macro.executeAll.bind(macro),
        undo: macro.undoAll.bind(macro),
        canExecute: macro.canExecuteAll.bind(macro),
        canUndo: macro.canUndoAll.bind(macro)
      };

      this.addCommandToHistory(macroCommand);

      this.emit('macroExecuted', macro);
      this.emit('historyChanged');

      return true;

    } catch (error) {
      this.emit('macroError', { macro, error });
      console.error('Macro execution failed:', error);
      return false;
    }
  }

  // State snapshot management
  private async createSnapshot(command: ExecutableCommand): Promise<StateSnapshot> {
    const snapshot: StateSnapshot = {
      id: `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      objectStates: new Map(),
      sceneState: {
        camera: {
          position: new THREE.Vector3(),
          rotation: new THREE.Euler(),
          fov: 75
        },
        selection: [],
        filters: [],
        settings: {}
      },
      metadata: {
        commandId: command.id,
        userAction: command.type,
        complexity: this.calculateCommandComplexity(command)
      }
    };

    // Capture object states
    this.objectRegistry.forEach((object, id) => {
      snapshot.objectStates.set(id, {
        position: object.position.clone(),
        rotation: object.rotation.clone(),
        scale: object.scale.clone(),
        visible: object.visible,
        opacity: object.opacity,
        state: object.state,
        data: this.deepClone(object.data)
      });
    });

    // Add to snapshots
    this.snapshots.push(snapshot);
    this.snapshotIndex = this.snapshots.length - 1;

    this.emit('snapshotCreated', snapshot);
    return snapshot;
  }

  private async restoreFromSnapshot(): Promise<boolean> {
    if (this.snapshotIndex < 0 || this.snapshotIndex >= this.snapshots.length) {
      return false;
    }

    try {
      const snapshot = this.snapshots[this.snapshotIndex];

      // Restore object states
      snapshot.objectStates.forEach((state, objectId) => {
        const object = this.objectRegistry.get(objectId);
        if (object) {
          object.position.copy(state.position);
          object.rotation.copy(state.rotation);
          object.scale.copy(state.scale);
          object.visible = state.visible;
          object.opacity = state.opacity;
          object.state = state.state as any;
          object.data = this.deepClone(state.data);
        }
      });

      // Restore scene state
      // This would need to be implemented based on your scene structure

      this.emit('snapshotRestored', snapshot);
      return true;

    } catch (error) {
      this.emit('snapshotError', error);
      console.error('Snapshot restore failed:', error);
      return false;
    }
  }

  // Command grouping and merging
  private shouldMergeCommand(command: ExecutableCommand): boolean {
    if (!this.config.enableMerging || this.commands.length === 0) return false;

    const lastCommand = this.commands[this.currentIndex];
    if (!lastCommand || !lastCommand.merge) return false;

    // Check if commands are of the same type and can be merged
    return lastCommand.type === command.type && 
           (Date.now() - lastCommand.timestamp) < this.config.autoGroupTimeout;
  }

  private mergeWithLastCommand(command: ExecutableCommand): ExecutableCommand | null {
    const lastCommand = this.commands[this.currentIndex];
    if (!lastCommand?.merge) return null;

    const merged = lastCommand.merge(command);
    if (merged) {
      this.commands[this.currentIndex] = merged;
      return merged;
    }

    return null;
  }

  private handleAutoGrouping(command: ExecutableCommand): void {
    // Clear existing group timer
    if (this.groupTimer) {
      clearTimeout(this.groupTimer);
    }

    // Start new group if none exists
    if (!this.currentGroupId) {
      this.currentGroupId = `group-${Date.now()}`;
      command.groupId = this.currentGroupId;
    } else {
      command.groupId = this.currentGroupId;
    }

    // Set timer to end group
    this.groupTimer = setTimeout(() => {
      this.currentGroupId = null;
      this.groupTimer = null;
    }, this.config.autoGroupTimeout);
  }

  private async undoGroup(groupId: string): Promise<boolean> {
    const groupCommands = this.getGroupCommands(groupId);
    
    try {
      // Undo commands in reverse order
      for (let i = groupCommands.length - 1; i >= 0; i--) {
        const command = groupCommands[i];
        if (command.canUndo()) {
          await command.undo();
          this.currentIndex--;
        }
      }

      this.emit('groupUndone', groupId);
      return true;

    } catch (error) {
      this.emit('groupUndoError', { groupId, error });
      return false;
    }
  }

  private async redoGroup(groupId: string): Promise<boolean> {
    const groupCommands = this.getGroupCommands(groupId);
    
    try {
      // Redo commands in original order
      for (const command of groupCommands) {
        if (command.canExecute()) {
          if (command.redo) {
            await command.redo();
          } else {
            await command.execute();
          }
          this.currentIndex++;
        }
      }

      this.emit('groupRedone', groupId);
      return true;

    } catch (error) {
      this.emit('groupRedoError', { groupId, error });
      return false;
    }
  }

  // Helper methods
  private addCommandToHistory(command: ExecutableCommand): void {
    // Remove commands after current index
    this.commands = this.commands.slice(0, this.currentIndex + 1);
    
    // Add new command
    this.commands.push(command);
    this.currentIndex++;

    // Limit history size
    if (this.commands.length > this.config.maxHistorySize) {
      const removeCount = this.commands.length - this.config.maxHistorySize;
      this.commands.splice(0, removeCount);
      this.currentIndex -= removeCount;
    }
  }

  private clearRedoHistory(): void {
    if (this.currentIndex < this.commands.length - 1) {
      this.commands = this.commands.slice(0, this.currentIndex + 1);
    }
  }

  private shouldCreateSnapshot(command: ExecutableCommand): boolean {
    if (!this.config.enableSnapshots) return false;
    
    const complexity = this.calculateCommandComplexity(command);
    return complexity > 3 || command.type === 'macro' || command.type === 'batch';
  }

  private shouldRestoreFromSnapshot(command: ExecutableCommand): boolean {
    const complexity = this.calculateCommandComplexity(command);
    return this.config.enableSnapshots && complexity > 3;
  }

  private calculateCommandComplexity(command: ExecutableCommand): number {
    let complexity = 1;
    
    if (command.type === 'macro') complexity += 3;
    if (command.type === 'batch') complexity += 2;
    if (command.groupId) complexity += 1;
    if (command.data && Object.keys(command.data).length > 5) complexity += 1;
    
    return complexity;
  }

  private isGroupedCommand(command: ExecutableCommand): boolean {
    return !!command.groupId && this.getGroupCommands(command.groupId).length > 1;
  }

  private getGroupCommands(groupId: string): ExecutableCommand[] {
    return this.commands.filter(cmd => cmd.groupId === groupId);
  }

  private cleanupHistory(): void {
    // Compress history if it gets too large
    if (this.commands.length > this.config.compressionThreshold) {
      this.compressHistory();
    }
  }

  private cleanupSnapshots(): void {
    if (this.snapshots.length > this.config.maxSnapshotSize) {
      const removeCount = this.snapshots.length - this.config.maxSnapshotSize;
      this.snapshots.splice(0, removeCount);
      this.snapshotIndex = Math.max(0, this.snapshotIndex - removeCount);
    }
  }

  private compressHistory(): void {
    // Merge adjacent similar commands to save memory
    const compressed: ExecutableCommand[] = [];
    
    for (let i = 0; i < this.commands.length; i++) {
      const current = this.commands[i];
      const next = this.commands[i + 1];
      
      if (next && current.merge && current.type === next.type) {
        const merged = current.merge(next);
        if (merged) {
          compressed.push(merged);
          i++; // Skip next command as it's been merged
          continue;
        }
      }
      
      compressed.push(current);
    }
    
    this.commands = compressed;
    this.currentIndex = Math.min(this.currentIndex, this.commands.length - 1);
  }

  private deepClone(obj: unknown): unknown {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));
    if (obj instanceof THREE.Vector3) return obj.clone();
    if (obj instanceof THREE.Euler) return obj.clone();
    if (typeof obj === 'object') {
      const cloned: Record<string, unknown> = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = this.deepClone(obj[key]);
        }
      }
      return cloned;
    }
    return obj;
  }

  // Public API methods
  public canUndo(): boolean {
    return this.currentIndex >= 0 && this.commands.length > 0;
  }

  public canRedo(): boolean {
    return this.currentIndex < this.commands.length - 1;
  }

  public getHistory(): ExecutableCommand[] {
    return [...this.commands];
  }

  public getCurrentIndex(): number {
    return this.currentIndex;
  }

  public getSnapshots(): StateSnapshot[] {
    return [...this.snapshots];
  }

  public registerObject(id: string, object: Interactive3DObject): void {
    this.objectRegistry.set(id, object);
  }

  public unregisterObject(id: string): void {
    this.objectRegistry.delete(id);
  }

  public clear(): void {
    this.commands = [];
    this.snapshots = [];
    this.currentIndex = -1;
    this.snapshotIndex = -1;
    this.currentGroupId = null;
    
    if (this.groupTimer) {
      clearTimeout(this.groupTimer);
      this.groupTimer = null;
    }
    
    this.emit('historyCleared');
  }

  public getStats(): {
    commandCount: number;
    snapshotCount: number;
    currentIndex: number;
    memoryUsage: number;
    canUndo: boolean;
    canRedo: boolean;
  } {
    return {
      commandCount: this.commands.length,
      snapshotCount: this.snapshots.length,
      currentIndex: this.currentIndex,
      memoryUsage: this.estimateMemoryUsage(),
      canUndo: this.canUndo(),
      canRedo: this.canRedo()
    };
  }

  private estimateMemoryUsage(): number {
    // Rough estimate of memory usage in bytes
    let usage = 0;
    
    // Commands
    usage += this.commands.length * 1000; // Rough estimate per command
    
    // Snapshots
    this.snapshots.forEach(snapshot => {
      usage += snapshot.objectStates.size * 500; // Rough estimate per object
    });
    
    return usage;
  }

  public destroy(): void {
    this.clear();
    this.objectRegistry.clear();
    this.removeAllListeners();
  }
}

// Command factory for common operations
export class CommandFactory {
  static createMoveCommand(
    objectId: string,
    fromPosition: THREE.Vector3,
    toPosition: THREE.Vector3,
    objectRegistry: Map<string, Interactive3DObject>
  ): ExecutableCommand {
    return {
      id: `move-${objectId}-${Date.now()}`,
      type: 'move',
      timestamp: Date.now(),
      description: `Move object ${objectId}`,
      data: { objectId, fromPosition, toPosition },
      execute: async () => {
        const object = objectRegistry.get(objectId);
        if (object) {
          object.position.copy(toPosition);
          object.mesh.position.copy(toPosition);
        }
      },
      undo: async () => {
        const object = objectRegistry.get(objectId);
        if (object) {
          object.position.copy(fromPosition);
          object.mesh.position.copy(fromPosition);
        }
      },
      canExecute: () => objectRegistry.has(objectId),
      canUndo: () => objectRegistry.has(objectId),
      merge: (other: ExecutableCommand) => {
        if (other.type === 'move' && other.data.objectId === objectId) {
          return CommandFactory.createMoveCommand(
            objectId,
            fromPosition,
            other.data.toPosition,
            objectRegistry
          );
        }
        return null;
      }
    };
  }

  static createSelectionCommand(
    objectIds: string[],
    previousSelection: string[],
    objectRegistry: Map<string, Interactive3DObject>
  ): ExecutableCommand {
    return {
      id: `select-${Date.now()}`,
      type: 'selection',
      timestamp: Date.now(),
      description: `Select ${objectIds.length} objects`,
      data: { objectIds, previousSelection },
      execute: async () => {
        // Implementation would depend on your selection system
        console.log('Selecting objects:', objectIds);
      },
      undo: async () => {
        // Restore previous selection
        console.log('Restoring selection:', previousSelection);
      },
      canExecute: () => true,
      canUndo: () => true
    };
  }

  static createBatchCommand(
    commands: ExecutableCommand[],
    description: string
  ): MacroCommand {
    return {
      id: `batch-${Date.now()}`,
      type: 'batch',
      timestamp: Date.now(),
      description,
      data: { commandCount: commands.length },
      commands,
      executeAll: async () => {
        for (const command of commands) {
          if (command.canExecute()) {
            await command.execute();
          }
        }
      },
      undoAll: async () => {
        // Undo in reverse order
        for (let i = commands.length - 1; i >= 0; i--) {
          const command = commands[i];
          if (command.canUndo()) {
            await command.undo();
          }
        }
      },
      canExecuteAll: () => commands.every(cmd => cmd.canExecute()),
      canUndoAll: () => commands.every(cmd => cmd.canUndo())
    };
  }
}

export default UndoRedoSystem;