'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useSectionAnnouncements } from '@/components/SectionDescriptions';

interface KeyboardNavigationProps {
  currentSection: number;
  totalSections: number;
  onSectionChange: (sectionIndex: number) => void;
  disabled?: boolean;
}

export const KeyboardNavigation: React.FC<KeyboardNavigationProps> = ({
  currentSection,
  totalSections,
  onSectionChange,
  disabled = false
}) => {
  const { state, announceToScreenReader } = useAccessibility();
  const { announceSection } = useSectionAnnouncements();
  const focusTimeoutRef = useRef<NodeJS.Timeout>();
  const lastNavigationRef = useRef<number>(0);
  
  // Navigation throttling to prevent rapid section changes
  const NAVIGATION_THROTTLE = 300; // ms
  
  const navigateToSection = useCallback((targetSection: number, source: string = 'keyboard') => {
    if (disabled) return;
    
    const now = Date.now();
    if (now - lastNavigationRef.current < NAVIGATION_THROTTLE) return;
    lastNavigationRef.current = now;
    
    if (targetSection >= 0 && targetSection < totalSections && targetSection !== currentSection) {
      onSectionChange(targetSection);
      
      // Announce section change to screen readers
      setTimeout(() => {
        announceSection(targetSection, {
          includeVisualDescription: state.reducedMotion,
          includeNavigationHint: true
        });
      }, 100);
      
      // Focus management
      if (state.keyboardNavigation) {
        const sectionElement = document.getElementById(`section-${targetSection}`);
        if (sectionElement) {
          // Clear any existing focus timeout
          if (focusTimeoutRef.current) {
            clearTimeout(focusTimeoutRef.current);
          }
          
          // Set focus after navigation completes
          focusTimeoutRef.current = setTimeout(() => {
            sectionElement.focus();
          }, 200);
        }
      }
    }
  }, [currentSection, totalSections, onSectionChange, disabled, state, announceSection]);
  
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (disabled || !state.keyboardNavigation) return;
    
    // Prevent navigation when user is typing in form elements
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
      return;
    }
    
    let handled = false;
    
    switch (event.key) {
      case 'ArrowDown':
      case 'PageDown':
      case 'j': // Vim-style navigation
        event.preventDefault();
        navigateToSection(Math.min(currentSection + 1, totalSections - 1));
        handled = true;
        break;
        
      case 'ArrowUp':
      case 'PageUp':
      case 'k': // Vim-style navigation
        event.preventDefault();
        navigateToSection(Math.max(currentSection - 1, 0));
        handled = true;
        break;
        
      case 'Home':
        event.preventDefault();
        navigateToSection(0);
        handled = true;
        break;
        
      case 'End':
        event.preventDefault();
        navigateToSection(totalSections - 1);
        handled = true;
        break;
        
      // Number keys for direct section navigation
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
        if (!event.ctrlKey && !event.altKey && !event.metaKey) {
          event.preventDefault();
          const targetSection = parseInt(event.key) - 1;
          if (targetSection < totalSections) {
            navigateToSection(targetSection);
            handled = true;
          }
        }
        break;
        
      case 'Escape':
        // Return focus to main content
        event.preventDefault();
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
          mainContent.focus();
        }
        announceToScreenReader('Navegación cancelada, foco devuelto al contenido principal');
        handled = true;
        break;
        
      case '?':
        // Show keyboard shortcuts help
        if (!event.shiftKey) break;
        event.preventDefault();
        showKeyboardHelp();
        handled = true;
        break;
    }
    
    if (handled) {
      // Announce current section info for complex navigation
      setTimeout(() => {
        announceToScreenReader(`Sección ${currentSection + 1} de ${totalSections}`);
      }, 50);
    }
  }, [currentSection, totalSections, navigateToSection, disabled, state, announceToScreenReader]);
  
  const showKeyboardHelp = useCallback(() => {
    const helpText = `
      Atajos de teclado disponibles:
      - Flechas arriba/abajo: Navegar entre secciones
      - Page Up/Page Down: Navegar entre secciones
      - Home: Ir a la primera sección
      - End: Ir a la última sección
      - Números 1-6: Ir directamente a la sección
      - Escape: Cancelar navegación
      - Tab: Navegar por elementos interactivos
      - Shift + ?: Mostrar esta ayuda
    `;
    announceToScreenReader(helpText);
    
    // Also show visual help for sighted keyboard users
    if (state.keyboardNavigation) {
      const helpModal = document.createElement('div');
      helpModal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50';
      helpModal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md mx-4 text-black dark:text-white">
          <h3 class="text-lg font-semibold mb-4">Atajos de Teclado</h3>
          <ul class="space-y-2 text-sm">
            <li><kbd class="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">↑↓</kbd> Navegar secciones</li>
            <li><kbd class="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">PgUp/PgDn</kbd> Navegar secciones</li>
            <li><kbd class="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">Home/End</kbd> Primera/Última sección</li>
            <li><kbd class="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">1-6</kbd> Ir a sección específica</li>
            <li><kbd class="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">Tab</kbd> Navegar elementos</li>
            <li><kbd class="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">Esc</kbd> Cancelar</li>
          </ul>
          <button class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" onclick="this.parentElement.parentElement.remove()">
            Cerrar
          </button>
        </div>
      `;
      
      document.body.appendChild(helpModal);
      
      // Focus the close button
      const closeButton = helpModal.querySelector('button') as HTMLButtonElement;
      if (closeButton) {
        closeButton.focus();
      }
      
      // Auto-remove after 10 seconds
      setTimeout(() => {
        if (helpModal.parentNode) {
          helpModal.remove();
        }
      }, 10000);
    }
  }, [announceToScreenReader, state.keyboardNavigation]);
  
  // Set up keyboard event listeners
  useEffect(() => {
    if (disabled) return;
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
    };
  }, [handleKeyDown, disabled]);
  
  // Announce keyboard navigation activation
  useEffect(() => {
    if (state.keyboardNavigation && !disabled) {
      announceToScreenReader(
        'Navegación por teclado activada. Use las flechas o números para navegar entre secciones. Presione Shift + ? para ver todos los atajos.'
      );
    }
  }, [state.keyboardNavigation, disabled, announceToScreenReader]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
    };
  }, []);
  
  return null; // This component only handles keyboard events, no visual output
};

// Hook to provide keyboard navigation information
export const useKeyboardNavigation = () => {
  const { state } = useAccessibility();
  
  return {
    isActive: state.keyboardNavigation,
    shortcuts: {
      nextSection: ['ArrowDown', 'PageDown', 'j'],
      previousSection: ['ArrowUp', 'PageUp', 'k'],
      firstSection: ['Home'],
      lastSection: ['End'],
      directNavigation: ['1', '2', '3', '4', '5', '6'],
      cancel: ['Escape'],
      help: ['Shift+?']
    }
  };
};