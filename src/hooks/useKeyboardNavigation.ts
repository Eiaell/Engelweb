'use client';

import { useEffect } from 'react';

interface KeyboardNavigationProps {
  totalSections: number;
  currentSection: number;
  scrollToSection: (section: number) => void;
  disabled?: boolean;
}

export const useKeyboardNavigation = ({
  totalSections,
  currentSection,
  scrollToSection,
  disabled = false
}: KeyboardNavigationProps) => {
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent navigation when user is typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
        case 'j':
        case ' ': // Spacebar
          e.preventDefault();
          if (currentSection < totalSections - 1) {
            scrollToSection(currentSection + 1);
          }
          break;
          
        case 'ArrowUp':
        case 'k':
          e.preventDefault();
          if (currentSection > 0) {
            scrollToSection(currentSection - 1);
          }
          break;
          
        case 'Home':
          e.preventDefault();
          scrollToSection(0);
          break;
          
        case 'End':
          e.preventDefault();
          scrollToSection(totalSections - 1);
          break;
          
        // Number keys for direct navigation
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
          e.preventDefault();
          const sectionIndex = parseInt(e.key) - 1;
          if (sectionIndex >= 0 && sectionIndex < totalSections) {
            scrollToSection(sectionIndex);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [totalSections, currentSection, scrollToSection, disabled]);
};