'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface AccessibilityState {
  reducedMotion: boolean;
  highContrast: boolean;
  focusVisible: boolean;
  keyboardNavigation: boolean;
  screenReader: boolean;
  fontSize: 'small' | 'medium' | 'large';
  isMobile: boolean;
  isTablet: boolean;
  touchDevice: boolean;
}

interface AccessibilityContextType {
  state: AccessibilityState;
  toggleReducedMotion: () => void;
  toggleHighContrast: () => void;
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  enableKeyboardNavigation: () => void;
  disableKeyboardNavigation: () => void;
  announceToScreenReader: (message: string) => void;
  isAccessibilityMode: boolean;
  enableAccessibilityMode: () => void;
  disableAccessibilityMode: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

interface AccessibilityProviderProps {
  children: React.ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const [state, setState] = useState<AccessibilityState>({
    reducedMotion: false,
    highContrast: false,
    focusVisible: true,
    keyboardNavigation: false,
    screenReader: false,
    fontSize: 'medium',
    isMobile: false,
    isTablet: false,
    touchDevice: false
  });

  const [isAccessibilityMode, setIsAccessibilityMode] = useState(false);

  // Screen reader announcement area
  const announceToScreenReader = useCallback((message: string) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, []);

  // Device detection
  const detectDevice = useCallback(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const isTablet = /ipad|android(?=.*tablet)|tablet/i.test(userAgent);
    const touchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    setState(prev => ({
      ...prev,
      isMobile,
      isTablet,
      touchDevice
    }));
  }, []);

  // Initialize accessibility state
  useEffect(() => {
    detectDevice();

    // Check for reduced motion preference
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateReducedMotion = () => {
      setState(prev => ({ ...prev, reducedMotion: reducedMotionQuery.matches }));
    };
    updateReducedMotion();
    reducedMotionQuery.addEventListener('change', updateReducedMotion);

    // Check for high contrast preference
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    const updateHighContrast = () => {
      setState(prev => ({ ...prev, highContrast: highContrastQuery.matches }));
    };
    updateHighContrast();
    highContrastQuery.addEventListener('change', updateHighContrast);

    // Detect screen reader
    const checkScreenReader = () => {
      const hasScreenReader = !!(
        window.speechSynthesis ||
        (navigator as any).tts ||
        document.querySelector('[role="application"]') ||
        document.querySelector('[aria-hidden="false"]')
      );
      setState(prev => ({ ...prev, screenReader: hasScreenReader }));
    };
    checkScreenReader();

    // Check for saved preferences
    const savedFontSize = localStorage.getItem('accessibility-font-size') as 'small' | 'medium' | 'large';
    if (savedFontSize) {
      setState(prev => ({ ...prev, fontSize: savedFontSize }));
    }

    const savedAccessibilityMode = localStorage.getItem('accessibility-mode') === 'true';
    setIsAccessibilityMode(savedAccessibilityMode);

    return () => {
      reducedMotionQuery.removeEventListener('change', updateReducedMotion);
      highContrastQuery.removeEventListener('change', updateHighContrast);
    };
  }, [detectDevice]);

  // Keyboard navigation detection
  useEffect(() => {
    let keyboardUsed = false;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && !keyboardUsed) {
        keyboardUsed = true;
        setState(prev => ({ ...prev, keyboardNavigation: true }));
        announceToScreenReader('Keyboard navigation activated');
      }
    };

    const handleMouseDown = () => {
      if (keyboardUsed) {
        keyboardUsed = false;
        setState(prev => ({ ...prev, keyboardNavigation: false }));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [announceToScreenReader]);

  // Apply CSS classes based on accessibility state
  useEffect(() => {
    const root = document.documentElement;
    
    // Reduced motion
    if (state.reducedMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }

    // High contrast
    if (state.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Font size
    root.classList.remove('font-small', 'font-medium', 'font-large');
    root.classList.add(`font-${state.fontSize}`);

    // Keyboard navigation
    if (state.keyboardNavigation) {
      root.classList.add('keyboard-nav');
    } else {
      root.classList.remove('keyboard-nav');
    }

    // Touch device
    if (state.touchDevice) {
      root.classList.add('touch-device');
    } else {
      root.classList.remove('touch-device');
    }

    // Mobile/tablet
    if (state.isMobile) {
      root.classList.add('mobile-device');
    } else {
      root.classList.remove('mobile-device');
    }

    if (state.isTablet) {
      root.classList.add('tablet-device');
    } else {
      root.classList.remove('tablet-device');
    }

    // Accessibility mode
    if (isAccessibilityMode) {
      root.classList.add('accessibility-mode');
    } else {
      root.classList.remove('accessibility-mode');
    }
  }, [state, isAccessibilityMode]);

  // Skip links for keyboard users
  useEffect(() => {
    if (state.keyboardNavigation && !document.getElementById('skip-links')) {
      const skipLinks = document.createElement('div');
      skipLinks.id = 'skip-links';
      skipLinks.className = 'skip-links';
      skipLinks.innerHTML = `
        <a href="#main-content" class="skip-link">Skip to main content</a>
        <a href="#section-navigation" class="skip-link">Skip to navigation</a>
      `;
      document.body.insertBefore(skipLinks, document.body.firstChild);
    }
  }, [state.keyboardNavigation]);

  const toggleReducedMotion = useCallback(() => {
    setState(prev => ({ ...prev, reducedMotion: !prev.reducedMotion }));
    announceToScreenReader(`Reduced motion ${!state.reducedMotion ? 'enabled' : 'disabled'}`);
  }, [state.reducedMotion, announceToScreenReader]);

  const toggleHighContrast = useCallback(() => {
    setState(prev => ({ ...prev, highContrast: !prev.highContrast }));
    announceToScreenReader(`High contrast ${!state.highContrast ? 'enabled' : 'disabled'}`);
  }, [state.highContrast, announceToScreenReader]);

  const setFontSize = useCallback((size: 'small' | 'medium' | 'large') => {
    setState(prev => ({ ...prev, fontSize: size }));
    localStorage.setItem('accessibility-font-size', size);
    announceToScreenReader(`Font size changed to ${size}`);
  }, [announceToScreenReader]);

  const enableKeyboardNavigation = useCallback(() => {
    setState(prev => ({ ...prev, keyboardNavigation: true }));
    announceToScreenReader('Keyboard navigation enabled');
  }, [announceToScreenReader]);

  const disableKeyboardNavigation = useCallback(() => {
    setState(prev => ({ ...prev, keyboardNavigation: false }));
  }, []);

  const enableAccessibilityMode = useCallback(() => {
    setIsAccessibilityMode(true);
    localStorage.setItem('accessibility-mode', 'true');
    
    // Enable all accessibility features
    setState(prev => ({
      ...prev,
      reducedMotion: true,
      highContrast: true,
      focusVisible: true,
      keyboardNavigation: true
    }));
    
    announceToScreenReader('Accessibility mode enabled. All animations reduced, high contrast enabled.');
  }, [announceToScreenReader]);

  const disableAccessibilityMode = useCallback(() => {
    setIsAccessibilityMode(false);
    localStorage.setItem('accessibility-mode', 'false');
    announceToScreenReader('Accessibility mode disabled');
  }, [announceToScreenReader]);

  const contextValue: AccessibilityContextType = {
    state,
    toggleReducedMotion,
    toggleHighContrast,
    setFontSize,
    enableKeyboardNavigation,
    disableKeyboardNavigation,
    announceToScreenReader,
    isAccessibilityMode,
    enableAccessibilityMode,
    disableAccessibilityMode
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = (): AccessibilityContextType => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

// Accessibility controls component
export const AccessibilityControls: React.FC<{
  visible?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}> = ({
  visible = false,
  position = 'bottom-right'
}) => {
  const {
    state,
    toggleReducedMotion,
    toggleHighContrast,
    setFontSize,
    isAccessibilityMode,
    enableAccessibilityMode,
    disableAccessibilityMode
  } = useAccessibility();

  const [isOpen, setIsOpen] = useState(false);

  if (!visible) return null;

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label="Open accessibility controls"
        aria-expanded={isOpen}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute bottom-16 right-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 w-64 space-y-3">
          <h3 className="font-semibold text-gray-900 dark:text-white">Accessibility Options</h3>
          
          <div className="space-y-2">
            <button
              onClick={isAccessibilityMode ? disableAccessibilityMode : enableAccessibilityMode}
              className={`w-full p-2 rounded text-sm font-medium ${
                isAccessibilityMode 
                  ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
              }`}
            >
              {isAccessibilityMode ? 'Disable' : 'Enable'} Accessibility Mode
            </button>

            <button
              onClick={toggleReducedMotion}
              className={`w-full p-2 rounded text-sm ${
                state.reducedMotion 
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
              }`}
            >
              Reduced Motion: {state.reducedMotion ? 'ON' : 'OFF'}
            </button>

            <button
              onClick={toggleHighContrast}
              className={`w-full p-2 rounded text-sm ${
                state.highContrast 
                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
              }`}
            >
              High Contrast: {state.highContrast ? 'ON' : 'OFF'}
            </button>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Font Size
              </label>
              <div className="flex space-x-1">
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => setFontSize(size)}
                    className={`px-3 py-1 rounded text-xs ${
                      state.fontSize === size
                        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-800 dark:text-indigo-100'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <div>Device: {state.isMobile ? 'Mobile' : state.isTablet ? 'Tablet' : 'Desktop'}</div>
              <div>Input: {state.touchDevice ? 'Touch' : state.keyboardNavigation ? 'Keyboard' : 'Mouse'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};