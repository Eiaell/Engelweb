'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Html } from '@react-three/drei';
import { useInteractionContext } from '@/contexts/InteractionContext';
import { Interactive3DObject } from '@/types/interactions';

interface AccessibilityOverlayProps {
  sceneId: string;
  enabled?: boolean;
}

interface FocusableElement {
  id: string;
  object: Interactive3DObject;
  position: { x: number; y: number };
  description: string;
  role: string;
  level: number;
}

interface ScreenReaderAnnouncement {
  id: string;
  message: string;
  priority: 'polite' | 'assertive';
  timestamp: Date;
}

export const AccessibilityOverlay: React.FC<AccessibilityOverlayProps> = ({
  sceneId,
  enabled = true
}) => {
  const { manager, globalState, settings } = useInteractionContext();
  const [focusableElements, setFocusableElements] = useState<FocusableElement[]>([]);
  const [currentFocusIndex, setCurrentFocusIndex] = useState<number>(-1);
  const [announcements, setAnnouncements] = useState<ScreenReaderAnnouncement[]>([]);
  const [keyboardHelpVisible, setKeyboardHelpVisible] = useState(false);
  const [highContrastMode, setHighContrastMode] = useState(false);
  const [motionReduced, setMotionReduced] = useState(false);
  const [screenReaderMode, setScreenReaderMode] = useState(false);
  
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const helpModalRef = useRef<HTMLDivElement>(null);
  const focusIndicatorRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation state
  const [navigationMode, setNavigationMode] = useState<'spatial' | 'linear' | 'hierarchical'>('linear');
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);

  // Update focusable elements when objects change
  useEffect(() => {
    if (!manager || !globalState) return;

    const elements: FocusableElement[] = [];
    
    globalState.objects.forEach((object, id) => {
      if (object.capabilities.focusable && object.visible) {
        // Convert 3D position to screen coordinates
        // This would need the actual camera and renderer context
        const screenPos = { x: 0, y: 0 }; // Simplified for this example
        
        elements.push({
          id,
          object,
          position: screenPos,
          description: object.metadata.ariaLabel || object.metadata.name,
          role: object.metadata.role || 'button',
          level: object.metadata.level || 0
        });
      }
    });

    // Sort by level and position for logical navigation order
    elements.sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      return a.position.y - b.position.y; // Top to bottom
    });

    setFocusableElements(elements);
  }, [manager, globalState]);

  // Keyboard event handlers
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled || !settings.accessibility.keyboardNavigation) return;

    switch (event.key) {
      case 'Tab':
        event.preventDefault();
        if (event.shiftKey) {
          navigatePrevious();
        } else {
          navigateNext();
        }
        break;
        
      case 'ArrowUp':
        if (navigationMode === 'spatial') {
          event.preventDefault();
          navigateSpatial('up');
        }
        break;
        
      case 'ArrowDown':
        if (navigationMode === 'spatial') {
          event.preventDefault();
          navigateSpatial('down');
        }
        break;
        
      case 'ArrowLeft':
        if (navigationMode === 'spatial') {
          event.preventDefault();
          navigateSpatial('left');
        }
        break;
        
      case 'ArrowRight':
        if (navigationMode === 'spatial') {
          event.preventDefault();
          navigateSpatial('right');
        }
        break;
        
      case 'Enter':
      case ' ':
        event.preventDefault();
        activateCurrentElement();
        break;
        
      case 'Escape':
        event.preventDefault();
        if (keyboardHelpVisible) {
          setKeyboardHelpVisible(false);
        } else {
          clearFocus();
        }
        break;
        
      case 'F1':
        event.preventDefault();
        setKeyboardHelpVisible(true);
        break;
        
      case 'h':
        if (event.ctrlKey) {
          event.preventDefault();
          setKeyboardHelpVisible(!keyboardHelpVisible);
        }
        break;
        
      case 'r':
        if (event.ctrlKey) {
          event.preventDefault();
          setMotionReduced(!motionReduced);
          announceToScreenReader('Motion ' + (motionReduced ? 'enabled' : 'reduced'), 'polite');
        }
        break;
        
      case 'c':
        if (event.ctrlKey) {
          event.preventDefault();
          setHighContrastMode(!highContrastMode);
          announceToScreenReader('High contrast ' + (highContrastMode ? 'disabled' : 'enabled'), 'polite');
        }
        break;
        
      case 'm':
        if (event.ctrlKey) {
          event.preventDefault();
          const modes: typeof navigationMode[] = ['linear', 'spatial', 'hierarchical'];
          const currentIndex = modes.indexOf(navigationMode);
          const nextMode = modes[(currentIndex + 1) % modes.length];
          setNavigationMode(nextMode);
          announceToScreenReader(`Navigation mode: ${nextMode}`, 'polite');
        }
        break;
        
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
        if (event.ctrlKey && navigationMode === 'hierarchical') {
          event.preventDefault();
          const level = parseInt(event.key);
          navigateToLevel(level);
        }
        break;
    }
  }, [enabled, settings.accessibility.keyboardNavigation, navigationMode, keyboardHelpVisible, currentFocusIndex, focusableElements, motionReduced, highContrastMode]);

  // Navigation functions
  const navigateNext = useCallback(() => {
    if (focusableElements.length === 0) return;
    
    const nextIndex = (currentFocusIndex + 1) % focusableElements.length;
    setCurrentFocusIndex(nextIndex);
    updateFocus(nextIndex);
  }, [currentFocusIndex, focusableElements]);

  const navigatePrevious = useCallback(() => {
    if (focusableElements.length === 0) return;
    
    const prevIndex = currentFocusIndex <= 0 ? focusableElements.length - 1 : currentFocusIndex - 1;
    setCurrentFocusIndex(prevIndex);
    updateFocus(prevIndex);
  }, [currentFocusIndex, focusableElements]);

  const navigateSpatial = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (currentFocusIndex < 0 || focusableElements.length === 0) return;
    
    const current = focusableElements[currentFocusIndex];
    let bestMatch = -1;
    let bestDistance = Infinity;
    
    focusableElements.forEach((element, index) => {
      if (index === currentFocusIndex) return;
      
      const dx = element.position.x - current.position.x;
      const dy = element.position.y - current.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      let isInDirection = false;
      switch (direction) {
        case 'up':
          isInDirection = dy < -20 && Math.abs(dx) < Math.abs(dy);
          break;
        case 'down':
          isInDirection = dy > 20 && Math.abs(dx) < Math.abs(dy);
          break;
        case 'left':
          isInDirection = dx < -20 && Math.abs(dy) < Math.abs(dx);
          break;
        case 'right':
          isInDirection = dx > 20 && Math.abs(dy) < Math.abs(dx);
          break;
      }
      
      if (isInDirection && distance < bestDistance) {
        bestDistance = distance;
        bestMatch = index;
      }
    });
    
    if (bestMatch >= 0) {
      setCurrentFocusIndex(bestMatch);
      updateFocus(bestMatch);
    }
  }, [currentFocusIndex, focusableElements]);

  const navigateToLevel = useCallback((level: number) => {
    const elementsAtLevel = focusableElements.filter(el => el.level === level);
    if (elementsAtLevel.length > 0) {
      const index = focusableElements.indexOf(elementsAtLevel[0]);
      setCurrentFocusIndex(index);
      updateFocus(index);
      announceToScreenReader(`Navigated to level ${level}`, 'polite');
    }
  }, [focusableElements]);

  const updateFocus = useCallback((index: number) => {
    if (index < 0 || index >= focusableElements.length) return;
    
    const element = focusableElements[index];
    
    // Update visual focus indicator
    if (focusIndicatorRef.current) {
      focusIndicatorRef.current.style.left = `${element.position.x}px`;
      focusIndicatorRef.current.style.top = `${element.position.y}px`;
      focusIndicatorRef.current.style.display = 'block';
    }
    
    // Announce to screen reader
    const announcement = `${element.role}: ${element.description}. ${index + 1} of ${focusableElements.length}`;
    announceToScreenReader(announcement, 'polite');
    
    // Update breadcrumbs for hierarchical navigation
    if (navigationMode === 'hierarchical') {
      const newBreadcrumbs = [`Level ${element.level}`, element.object.metadata.name];
      setBreadcrumbs(newBreadcrumbs);
    }
    
    // Focus the actual 3D object through the interaction manager
    if (manager) {
      manager.setObjectState(element.id, 'focused');
    }
  }, [focusableElements, manager, navigationMode]);

  const activateCurrentElement = useCallback(() => {
    if (currentFocusIndex < 0 || !manager) return;
    
    const element = focusableElements[currentFocusIndex];
    if (element) {
      // Simulate click on the object
      if (element.object.capabilities.clickable) {
        manager.selectObject(element.id);
        announceToScreenReader(`Activated ${element.description}`, 'assertive');
      }
    }
  }, [currentFocusIndex, focusableElements, manager]);

  const clearFocus = useCallback(() => {
    setCurrentFocusIndex(-1);
    if (focusIndicatorRef.current) {
      focusIndicatorRef.current.style.display = 'none';
    }
    if (manager && globalState) {
      // Clear all focused states
      globalState.objects.forEach((object, id) => {
        if (object.state === 'focused') {
          manager.setObjectState(id, 'idle');
        }
      });
    }
  }, [manager, globalState]);

  // Screen reader announcement system
  const announceToScreenReader = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement: ScreenReaderAnnouncement = {
      id: `announcement-${Date.now()}`,
      message,
      priority,
      timestamp: new Date()
    };
    
    setAnnouncements(prev => [...prev, announcement]);
    
    // Clean up old announcements
    setTimeout(() => {
      setAnnouncements(prev => prev.filter(a => a.id !== announcement.id));
    }, 5000);
  }, []);

  // Attach keyboard listeners
  useEffect(() => {
    if (!enabled) return;
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);

  // Apply accessibility settings
  useEffect(() => {
    if (!enabled) return;
    
    // Apply high contrast mode
    if (highContrastMode) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
    
    // Apply reduced motion
    if (motionReduced) {
      document.body.classList.add('reduce-motion');
    } else {
      document.body.classList.remove('reduce-motion');
    }
    
    // Apply screen reader optimizations
    if (screenReaderMode) {
      document.body.classList.add('screen-reader-mode');
    } else {
      document.body.classList.remove('screen-reader-mode');
    }
  }, [enabled, highContrastMode, motionReduced, screenReaderMode]);

  // Monitor interaction state changes
  useEffect(() => {
    if (!manager || !enabled) return;
    
    const handleStateChange = (event: any) => {
      const { objectId, newState, oldState } = event;
      const object = globalState?.objects.get(objectId);
      
      if (object && settings.accessibility.screenReaderOptimized) {
        let message = '';
        
        switch (newState) {
          case 'hover':
            message = `Hovering over ${object.metadata.name}`;
            break;
          case 'selected':
            message = `Selected ${object.metadata.name}`;
            break;
          case 'dragging':
            message = `Dragging ${object.metadata.name}`;
            break;
          case 'focused':
            message = `Focused on ${object.metadata.name}`;
            break;
        }
        
        if (message) {
          announceToScreenReader(message, 'polite');
        }
      }
    };
    
    manager.addEventListener('statechange', handleStateChange);
    return () => manager.removeEventListener('statechange', handleStateChange);
  }, [manager, globalState, settings, enabled, announceToScreenReader]);

  if (!enabled) return null;

  return (
    <>
      {/* Screen Reader Live Regions */}
      <div
        ref={liveRegionRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcements
          .filter(a => a.priority === 'polite')
          .slice(-1)
          .map(a => (
            <div key={a.id}>{a.message}</div>
          ))
        }
      </div>
      
      <div
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {announcements
          .filter(a => a.priority === 'assertive')
          .slice(-1)
          .map(a => (
            <div key={a.id}>{a.message}</div>
          ))
        }
      </div>

      {/* Focus Indicator */}
      <div
        ref={focusIndicatorRef}
        className="fixed pointer-events-none z-50 border-4 border-yellow-400 rounded-lg"
        style={{
          width: '60px',
          height: '60px',
          display: 'none',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(255, 255, 0, 0.2)',
          boxShadow: '0 0 10px rgba(255, 255, 0, 0.5)'
        }}
      />

      {/* Accessibility Controls */}
      <Html position={[-35, -15, 0]} className="pointer-events-auto">
        <div className="bg-black bg-opacity-90 p-4 rounded text-white text-sm space-y-3 min-w-64">
          <div className="font-bold text-base">Accessibility Controls</div>
          
          {/* Navigation Mode */}
          <div>
            <div className="mb-2">Navigation Mode:</div>
            <div className="grid grid-cols-3 gap-1">
              {['linear', 'spatial', 'hierarchical'].map(mode => (
                <button
                  key={mode}
                  onClick={() => setNavigationMode(mode as any)}
                  className={`px-2 py-1 rounded text-xs ${
                    navigationMode === mode 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
          
          {/* Accessibility Options */}
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={highContrastMode}
                onChange={(e) => setHighContrastMode(e.target.checked)}
                className="form-checkbox"
              />
              <span>High Contrast Mode</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={motionReduced}
                onChange={(e) => setMotionReduced(e.target.checked)}
                className="form-checkbox"
              />
              <span>Reduce Motion</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={screenReaderMode}
                onChange={(e) => setScreenReaderMode(e.target.checked)}
                className="form-checkbox"
              />
              <span>Screen Reader Mode</span>
            </label>
          </div>
          
          {/* Quick Actions */}
          <div className="space-y-1">
            <button
              onClick={() => setKeyboardHelpVisible(true)}
              className="w-full px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs"
            >
              Keyboard Shortcuts (F1)
            </button>
            
            <button
              onClick={() => {
                setCurrentFocusIndex(0);
                if (focusableElements.length > 0) {
                  updateFocus(0);
                }
              }}
              className="w-full px-2 py-1 bg-green-600 hover:bg-green-500 rounded text-xs"
            >
              Focus First Element
            </button>
          </div>
          
          {/* Status Info */}
          <div className="text-xs text-gray-300 space-y-1">
            <div>Focusable elements: {focusableElements.length}</div>
            <div>Current focus: {currentFocusIndex >= 0 ? `${currentFocusIndex + 1}/${focusableElements.length}` : 'None'}</div>
            <div>Mode: {navigationMode}</div>
          </div>
        </div>
      </Html>

      {/* Breadcrumbs for Hierarchical Navigation */}
      {navigationMode === 'hierarchical' && breadcrumbs.length > 0 && (
        <Html position={[0, 20, 0]} className="pointer-events-none">
          <div className="bg-black bg-opacity-80 p-2 rounded text-white text-sm">
            <div className="font-bold mb-1">Location:</div>
            <div className="flex items-center space-x-2">
              {breadcrumbs.map((crumb, index) => (
                <span key={index} className="flex items-center">
                  {index > 0 && <span className="mx-1">›</span>}
                  <span>{crumb}</span>
                </span>
              ))}
            </div>
          </div>
        </Html>
      )}

      {/* Keyboard Help Modal */}
      {keyboardHelpVisible && (
        <Html position={[0, 0, 0]} className="pointer-events-auto">
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div
              ref={helpModalRef}
              className="bg-white p-6 rounded-lg max-w-2xl max-h-96 overflow-y-auto text-black"
              role="dialog"
              aria-labelledby="help-title"
              aria-describedby="help-description"
            >
              <h2 id="help-title" className="text-xl font-bold mb-4">
                Keyboard Shortcuts
              </h2>
              
              <div id="help-description" className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Navigation</h3>
                  <ul className="space-y-1 text-sm">
                    <li><kbd>Tab</kbd> / <kbd>Shift+Tab</kbd> - Navigate forward/backward</li>
                    <li><kbd>Arrow Keys</kbd> - Spatial navigation (when enabled)</li>
                    <li><kbd>Enter</kbd> / <kbd>Space</kbd> - Activate element</li>
                    <li><kbd>Escape</kbd> - Clear focus or close dialogs</li>
                    <li><kbd>Ctrl+1-6</kbd> - Navigate to heading level (hierarchical mode)</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Accessibility</h3>
                  <ul className="space-y-1 text-sm">
                    <li><kbd>Ctrl+H</kbd> - Toggle this help dialog</li>
                    <li><kbd>Ctrl+C</kbd> - Toggle high contrast mode</li>
                    <li><kbd>Ctrl+R</kbd> - Toggle reduced motion</li>
                    <li><kbd>Ctrl+M</kbd> - Cycle navigation modes</li>
                    <li><kbd>F1</kbd> - Show keyboard help</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Scene Interaction</h3>
                  <ul className="space-y-1 text-sm">
                    <li><kbd>T</kbd> - Toggle trace mode</li>
                    <li><kbd>E</kbd> - Toggle evidence display</li>
                    <li><kbd>R</kbd> - Re-run selected query</li>
                    <li><kbd>A</kbd> - Analyze selected element</li>
                    <li><kbd>C</kbd> - Compare elements</li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setKeyboardHelpVisible(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  autoFocus
                >
                  Close (Escape)
                </button>
              </div>
            </div>
          </div>
        </Html>
      )}

      {/* Skip Links */}
      <Html position={[0, 25, 0]} className="pointer-events-auto">
        <div className="sr-only focus:not-sr-only">
          <a
            href="#main-content"
            className="bg-blue-600 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
            onFocus={() => announceToScreenReader('Skip to main content link focused', 'polite')}
          >
            Skip to main content
          </a>
        </div>
      </Html>

      {/* Current Element Description */}
      {currentFocusIndex >= 0 && focusableElements[currentFocusIndex] && (
        <Html position={[0, -20, 0]} className="pointer-events-none">
          <div className="bg-black bg-opacity-90 p-3 rounded text-white text-sm max-w-md text-center">
            <div className="font-bold mb-1">
              {focusableElements[currentFocusIndex].role}
            </div>
            <div>{focusableElements[currentFocusIndex].description}</div>
            <div className="text-xs text-gray-300 mt-2">
              {currentFocusIndex + 1} of {focusableElements.length}
            </div>
          </div>
        </Html>
      )}

      {/* CSS for accessibility modes */}
      <style jsx global>{`
        .high-contrast {
          filter: contrast(150%) brightness(110%);
        }
        
        .reduce-motion * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
        
        .screen-reader-mode {
          /* Additional optimizations for screen readers */
        }
        
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        
        .sr-only:focus {
          position: static;
          width: auto;
          height: auto;
          padding: inherit;
          margin: inherit;
          overflow: visible;
          clip: auto;
          white-space: normal;
        }
        
        kbd {
          background-color: #f7f7f7;
          border: 1px solid #ccc;
          border-radius: 3px;
          box-shadow: 0 1px 0 rgba(0,0,0,0.2), 0 0 0 2px #fff inset;
          color: #333;
          display: inline-block;
          font-family: monospace;
          font-size: 0.85em;
          font-weight: 700;
          line-height: 1;
          padding: 2px 4px;
          white-space: nowrap;
        }
      `}</style>
    </>
  );
};

export default AccessibilityOverlay;