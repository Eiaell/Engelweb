'use client';

import { useState, useEffect } from 'react';
import { useAccessibility } from '@/contexts/AccessibilityContext';

interface SkipLink {
  href: string;
  label: string;
  description?: string;
}

interface SkipLinksProps {
  customLinks?: SkipLink[];
  className?: string;
}

export const SkipLinks: React.FC<SkipLinksProps> = ({
  customLinks,
  className = ''
}) => {
  const { state, announceToScreenReader } = useAccessibility();
  const [isVisible, setIsVisible] = useState(false);
  
  // Default skip links for the immersive experience
  const defaultLinks: SkipLink[] = [
    {
      href: '#main-content',
      label: 'Saltar al contenido principal',
      description: 'Ir directamente a las secciones de contenido'
    },
    {
      href: '#section-navigation',
      label: 'Saltar a navegación entre secciones',
      description: 'Acceder a los controles de navegación'
    },
    {
      href: '#section-0',
      label: 'Ir a Identidad (Sección 1)',
      description: 'Primera sección: presentación personal'
    },
    {
      href: '#section-1',
      label: 'Ir a Origen (Sección 2)',
      description: 'Segunda sección: orígenes culturales'
    },
    {
      href: '#section-2',
      label: 'Ir a Misión (Sección 3)',
      description: 'Tercera sección: misión profesional'
    },
    {
      href: '#section-3',
      label: 'Ir a Presente (Sección 4)',
      description: 'Cuarta sección: trabajo actual'
    },
    {
      href: '#section-4',
      label: 'Ir a Visión (Sección 5)',
      description: 'Quinta sección: visión futura'
    },
    {
      href: '#section-5',
      label: 'Ir a Acción (Sección 6)',
      description: 'Sexta sección: llamada a la acción'
    },
    {
      href: '#accessibility-controls',
      label: 'Saltar a controles de accesibilidad',
      description: 'Configurar preferencias de accesibilidad'
    }
  ];
  
  const links = customLinks || defaultLinks;
  
  const handleLinkClick = (link: SkipLink) => {
    const targetElement = document.querySelector(link.href);
    if (targetElement) {
      // Scroll to element
      targetElement.scrollIntoView({ 
        behavior: state.reducedMotion ? 'auto' : 'smooth',
        block: 'start'
      });
      
      // Set focus
      (targetElement as HTMLElement).focus();
      
      // Announce navigation
      announceToScreenReader(`Navegado a: ${link.label}. ${link.description || ''}`);
      
      // Hide skip links after use
      setIsVisible(false);
    } else {
      announceToScreenReader(`Elemento no encontrado: ${link.label}`);
    }
  };
  
  const handleKeyDown = (event: React.KeyboardEvent<HTMLAnchorElement>, link: SkipLink) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleLinkClick(link);
    }
  };
  
  // Show skip links on keyboard focus
  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      if (target.classList.contains('skip-link')) {
        setIsVisible(true);
      }
    };
    
    const handleFocusOut = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      const relatedTarget = event.relatedTarget as HTMLElement;
      
      // Hide skip links if focus moves away from skip links area
      if (target.classList.contains('skip-link') && 
          (!relatedTarget || !relatedTarget.classList.contains('skip-link'))) {
        setTimeout(() => setIsVisible(false), 150);
      }
    };
    
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    
    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);
  
  // Announce skip links availability when keyboard navigation is detected
  useEffect(() => {
    if (state.keyboardNavigation) {
      announceToScreenReader(
        'Enlaces de salto disponibles. Presione Tab al inicio de la página para acceder a la navegación rápida.'
      );
    }
  }, [state.keyboardNavigation, announceToScreenReader]);
  
  return (
    <nav 
      aria-label="Enlaces de navegación rápida"
      className={`skip-links-container ${className}`}
    >
      <div 
        className={`
          skip-links fixed top-0 left-0 z-50 p-2 bg-white dark:bg-gray-900 border-2 border-blue-500 rounded-br-lg shadow-lg
          transform transition-transform duration-200 ease-in-out
          ${isVisible ? 'translate-y-0' : '-translate-y-full'}
          ${!state.keyboardNavigation ? 'sr-only' : ''}
        `}
        style={{
          transform: isVisible ? 'translateY(0)' : 'translateY(-100%)',
          minWidth: '300px'
        }}
      >
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
          Navegación Rápida
        </h2>
        
        <ul className="space-y-1">
          {links.map((link, index) => (
            <li key={index}>
              <a
                href={link.href}
                className="skip-link block px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 focus:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 no-underline transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  handleLinkClick(link);
                }}
                onKeyDown={(e) => handleKeyDown(e, link)}
                title={link.description}
              >
                {link.label}
                {link.description && (
                  <span className="sr-only">. {link.description}</span>
                )}
              </a>
            </li>
          ))}
        </ul>
        
        <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Presione Escape para ocultar este menú
          </p>
        </div>
      </div>
      
      {/* Invisible focus trap to show skip links on Tab */}
      <button
        className="skip-link-trigger sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 bg-blue-600 text-white px-3 py-2 rounded"
        onFocus={() => setIsVisible(true)}
        onBlur={() => setTimeout(() => setIsVisible(false), 150)}
      >
        Mostrar enlaces de navegación rápida
      </button>
    </nav>
  );
};

// Hook to manage skip link targets
export const useSkipLinkTargets = () => {
  useEffect(() => {
    // Ensure all skip link targets have proper attributes
    const targets = [
      '#main-content',
      '#section-navigation',
      '#section-0',
      '#section-1', 
      '#section-2',
      '#section-3',
      '#section-4',
      '#section-5',
      '#accessibility-controls'
    ];
    
    targets.forEach(selector => {
      const element = document.querySelector(selector) as HTMLElement;
      if (element) {
        // Make focusable if not already
        if (element.tabIndex < 0) {
          element.tabIndex = -1;
        }
        
        // Add focus styles
        element.classList.add('skip-link-target');
        
        // Add role if it's a section
        if (selector.startsWith('#section-') && !element.getAttribute('role')) {
          element.setAttribute('role', 'region');
        }
      }
    });
    
    // Add CSS for skip link targets if not already added
    if (!document.getElementById('skip-link-styles')) {
      const style = document.createElement('style');
      style.id = 'skip-link-styles';
      style.textContent = `
        .skip-link-target:focus {
          outline: 3px solid #3b82f6;
          outline-offset: 2px;
          scroll-margin-top: 2rem;
        }
        
        .skip-link-trigger:focus {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }
        
        @media (prefers-reduced-motion: reduce) {
          .skip-link-target {
            scroll-behavior: auto !important;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);
};

// Utility to create skip link targets
export const createSkipTarget = (id: string, label?: string): JSX.Element => {
  return (
    <div
      id={id}
      tabIndex={-1}
      role="region"
      aria-label={label}
      className="skip-link-target"
    />
  );
};