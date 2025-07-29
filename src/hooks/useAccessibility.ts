'use client';

import { useState, useEffect } from 'react';

interface AccessibilityState {
  prefersReducedMotion: boolean;
  keyboardNavigation: boolean;
  highContrast: boolean;
}

export const useAccessibility = () => {
  const [accessibilityState, setAccessibilityState] = useState<AccessibilityState>({
    prefersReducedMotion: false,
    keyboardNavigation: false,
    highContrast: false
  });

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => {
      setAccessibilityState(prev => ({
        ...prev,
        prefersReducedMotion: mediaQuery.matches
      }));
    };

    handleChange();
    mediaQuery.addEventListener('change', handleChange);

    // Check for high contrast preference
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    const handleHighContrastChange = () => {
      setAccessibilityState(prev => ({
        ...prev,
        highContrast: highContrastQuery.matches
      }));
    };

    handleHighContrastChange();
    highContrastQuery.addEventListener('change', handleHighContrastChange);

    // Keyboard navigation detection
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setAccessibilityState(prev => ({
          ...prev,
          keyboardNavigation: true
        }));
      }
    };

    const handleMouseDown = () => {
      setAccessibilityState(prev => ({
        ...prev,
        keyboardNavigation: false
      }));
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      highContrastQuery.removeEventListener('change', handleHighContrastChange);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  return accessibilityState;
};