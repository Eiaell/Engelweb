'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Html } from '@react-three/drei';
import { useInteractionContext } from '@/contexts/InteractionContext';
import { UndoRedoSystem, CommandFactory, ExecutableCommand, MacroCommand } from '@/lib/UndoRedoSystem';
import * as THREE from 'three';

interface UndoRedoControlsProps {
  position?: [number, number, number];
  enabled?: boolean;
  showHistory?: boolean;
  showSnapshots?: boolean;
}

interface HistoryItem {
  command: ExecutableCommand | MacroCommand;
  index: number;
  canUndo: boolean;
  canRedo: boolean;
}

export const UndoRedoControls: React.FC<UndoRedoControlsProps> = ({
  position = [35, 15, 0],
  enabled = true,
  showHistory = true,
  showSnapshots = false
}) => {
  const { manager, globalState } = useInteractionContext();
  const undoRedoSystemRef = useRef<UndoRedoSystem | null>(null);
  
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [stats, setStats] = useState({
    commandCount: 0,
    snapshotCount: 0,
    memoryUsage: 0
  });
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [autoGroup, setAutoGroup] = useState(true);
  const [snapshotsEnabled, setSnapshotsEnabled] = useState(true);

  // Initialize undo/redo system
  useEffect(() => {
    if (!manager) return;

    const undoRedoSystem = new UndoRedoSystem({
      maxHistorySize: 100,
      maxSnapshotSize: 20,
      autoGroupTimeout: 1000,
      enableSnapshots: snapshotsEnabled,
      enableMerging: autoGroup,
      enableMacros: true
    });

    undoRedoSystemRef.current = undoRedoSystem;

    // Register all existing objects
    if (globalState) {
      globalState.objects.forEach((object, id) => {
        undoRedoSystem.registerObject(id, object);
      });
    }

    // Set up event listeners
    const updateState = () => {
      setCanUndo(undoRedoSystem.canUndo());
      setCanRedo(undoRedoSystem.canRedo());
      setCurrentIndex(undoRedoSystem.getCurrentIndex());
      
      const newHistory = undoRedoSystem.getHistory().map((command, index) => ({
        command,
        index,
        canUndo: index <= undoRedoSystem.getCurrentIndex(),
        canRedo: index > undoRedoSystem.getCurrentIndex()
      }));
      setHistory(newHistory);
      
      setStats(undoRedoSystem.getStats());
    };

    undoRedoSystem.on('historyChanged', updateState);
    undoRedoSystem.on('commandExecuted', updateState);
    undoRedoSystem.on('commandUndone', updateState);
    undoRedoSystem.on('commandRedone', updateState);

    // Integrate with interaction manager
    const originalExecuteCommand = manager.executeCommand.bind(manager);
    manager.executeCommand = (command) => {
      // Convert interaction command to undo/redo command
      const undoRedoCommand = convertToUndoRedoCommand(command);
      undoRedoSystem.executeCommand(undoRedoCommand);
      return originalExecuteCommand(command);
    };

    updateState();

    return () => {
      undoRedoSystem.destroy();
    };
  }, [manager, globalState, snapshotsEnabled, autoGroup]);

  // Convert interaction command to undo/redo command
  const convertToUndoRedoCommand = useCallback((command: unknown): ExecutableCommand => {
    const objectRegistry = new Map();
    if (globalState) {
      globalState.objects.forEach((object, id) => {
        objectRegistry.set(id, object);
      });
    }

    switch (command.type) {
      case 'move':
        return CommandFactory.createMoveCommand(
          command.data.objectId,
          command.data.from,
          command.data.to,
          objectRegistry
        );
      
      case 'select':
        return CommandFactory.createSelectionCommand(
          command.data.objectIds || [command.data.objectId],
          command.data.previousSelection || [],
          objectRegistry
        );
      
      default:
        return {
          id: command.id,
          type: command.type,
          timestamp: command.timestamp,
          description: command.description,
          data: command.data,
          execute: command.execute,
          undo: command.undo,
          canExecute: command.canExecute,
          canUndo: command.canUndo
        };
    }
  }, [globalState]);

  // Undo/Redo handlers
  const handleUndo = useCallback(async () => {
    if (undoRedoSystemRef.current && canUndo) {
      await undoRedoSystemRef.current.undo();
    }
  }, [canUndo]);

  const handleRedo = useCallback(async () => {
    if (undoRedoSystemRef.current && canRedo) {
      await undoRedoSystemRef.current.redo();
    }
  }, [canRedo]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!enabled) return;

      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case 'z':
            event.preventDefault();
            if (event.shiftKey) {
              handleRedo();
            } else {
              handleUndo();
            }
            break;
          case 'y':
            event.preventDefault();
            handleRedo();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleUndo, handleRedo]);

  // Jump to specific history point
  const jumpToHistoryPoint = useCallback(async (targetIndex: number) => {
    if (!undoRedoSystemRef.current) return;

    const system = undoRedoSystemRef.current;
    const current = system.getCurrentIndex();

    if (targetIndex < current) {
      // Undo to target
      for (let i = current; i > targetIndex; i--) {
        await system.undo();
      }
    } else if (targetIndex > current) {
      // Redo to target
      for (let i = current; i < targetIndex; i++) {
        await system.redo();
      }
    }
  }, []);

  // Create a batch command from selected operations
  const createBatchFromSelection = useCallback((startIndex: number, endIndex: number) => {
    if (!undoRedoSystemRef.current) return;

    const system = undoRedoSystemRef.current;
    const allCommands = system.getHistory();
    const selectedCommands = allCommands.slice(startIndex, endIndex + 1);

    const batchCommand = CommandFactory.createBatchCommand(
      selectedCommands,
      `Batch operation: ${selectedCommands.length} commands`
    );

    // This would replace the individual commands with the batch
    console.log('Created batch:', batchCommand);
  }, []);

  // Clear history
  const clearHistory = useCallback(() => {
    if (undoRedoSystemRef.current) {
      undoRedoSystemRef.current.clear();
    }
  }, []);

  if (!enabled) return null;

  return (
    <>
      {/* Main Controls */}
      <Html position={position} className="pointer-events-auto">
        <div className="bg-black bg-opacity-80 p-4 rounded text-white text-sm space-y-3 min-w-72">
          <div className="font-bold text-base">Undo/Redo System</div>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              className={`px-3 py-2 rounded flex items-center gap-2 ${
                canUndo 
                  ? 'bg-blue-600 hover:bg-blue-500 text-white' 
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
              title="Undo (Ctrl+Z)"
            >
              <span>↶</span>
              Undo
            </button>
            
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              className={`px-3 py-2 rounded flex items-center gap-2 ${
                canRedo 
                  ? 'bg-green-600 hover:bg-green-500 text-white' 
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
              title="Redo (Ctrl+Y)"
            >
              <span>↷</span>
              Redo
            </button>
          </div>
          
          {/* History Overview */}
          <div className="bg-gray-800 p-3 rounded">
            <div className="text-xs text-gray-300 mb-2">History:</div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 bg-gray-700 h-2 rounded overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-200"
                  style={{ 
                    width: `${history.length > 0 ? ((currentIndex + 1) / history.length) * 100 : 0}%` 
                  }}
                />
              </div>
              <span className="text-xs">
                {currentIndex + 1}/{history.length}
              </span>
            </div>
            
            {/* Recent Commands */}
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {history.slice(-5).map((item, index) => (
                <div 
                  key={item.command.id}
                  className={`text-xs p-1 rounded cursor-pointer hover:bg-gray-700 ${
                    item.index <= currentIndex ? 'text-white' : 'text-gray-500'
                  }`}
                  onClick={() => jumpToHistoryPoint(item.index)}
                >
                  <span className="font-mono text-gray-400">
                    {item.index.toString().padStart(2, '0')}:
                  </span>
                  <span className="ml-1">{item.command.description}</span>
                  <span className="ml-1 text-gray-500">
                    ({item.command.type})
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Settings */}
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={autoGroup}
                onChange={(e) => setAutoGroup(e.target.checked)}
                className="form-checkbox text-blue-600"
              />
              <span className="text-xs">Auto-group commands</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={snapshotsEnabled}
                onChange={(e) => setSnapshotsEnabled(e.target.checked)}
                className="form-checkbox text-blue-600"
              />
              <span className="text-xs">Enable snapshots</span>
            </label>
          </div>
          
          {/* Statistics */}
          <div className="bg-gray-800 p-2 rounded text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>Commands: {stats.commandCount}</div>
              <div>Snapshots: {stats.snapshotCount}</div>
              <div>Memory: {(stats.memoryUsage / 1024).toFixed(1)}KB</div>
              <div>Current: {currentIndex + 1}</div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="space-y-1">
            {showHistory && (
              <button
                onClick={() => setShowHistoryModal(true)}
                className="w-full px-2 py-1 bg-purple-600 hover:bg-purple-500 rounded text-xs"
              >
                View Full History
              </button>
            )}
            
            <button
              onClick={clearHistory}
              className="w-full px-2 py-1 bg-red-600 hover:bg-red-500 rounded text-xs"
              title="Clear all history"
            >
              Clear History
            </button>
          </div>
        </div>
      </Html>

      {/* History Modal */}
      {showHistoryModal && (
        <Html position={[0, 0, 0]} className="pointer-events-auto">
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-4xl max-h-96 overflow-hidden text-black">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Command History</h2>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="overflow-y-auto max-h-64">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">#</th>
                      <th className="text-left p-2">Type</th>
                      <th className="text-left p-2">Description</th>
                      <th className="text-left p-2">Time</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((item) => (
                      <tr 
                        key={item.command.id}
                        className={`border-b hover:bg-gray-50 ${
                          item.index === currentIndex ? 'bg-blue-50' : ''
                        }`}
                      >
                        <td className="p-2 font-mono">{item.index}</td>
                        <td className="p-2">
                          <span className="px-2 py-1 bg-gray-200 rounded text-xs">
                            {item.command.type}
                          </span>
                        </td>
                        <td className="p-2">{item.command.description}</td>
                        <td className="p-2 text-xs text-gray-500">
                          {new Date(item.command.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            item.index <= currentIndex 
                              ? 'bg-green-200 text-green-800' 
                              : 'bg-gray-200 text-gray-600'
                          }`}>
                            {item.index <= currentIndex ? 'Executed' : 'Undone'}
                          </span>
                        </td>
                        <td className="p-2">
                          <button
                            onClick={() => {
                              jumpToHistoryPoint(item.index);
                              setShowHistoryModal(false);
                            }}
                            className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                          >
                            Jump Here
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Total: {history.length} commands, Current: {currentIndex + 1}
                </div>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </Html>
      )}

      {/* Keyboard Shortcuts Help */}
      <Html position={[position[0], position[1] - 10, position[2]]} className="pointer-events-none">
        <div className="bg-black bg-opacity-60 p-2 rounded text-white text-xs">
          <div className="font-bold mb-1">Shortcuts:</div>
          <div>Ctrl+Z: Undo</div>
          <div>Ctrl+Y / Ctrl+Shift+Z: Redo</div>
        </div>
      </Html>
    </>
  );
};

export default UndoRedoControls;