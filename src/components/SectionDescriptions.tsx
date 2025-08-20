'use client';

import { useAccessibility } from '@/contexts/AccessibilityContext';

// Comprehensive accessibility descriptions for each section
export const sectionDescriptions = {
  identity: {
    title: "Sección de Identidad",
    description: "Introducción personal de Engelbert Huber. Declara que no es un programador tradicional ni un marketero, sino alguien diferente en el espacio de la inteligencia artificial.",
    visualDescription: "Sección con un círculo 3D abstracto que representa la identidad única. El fondo muestra elementos geométricos sutiles que se mueven lentamente.",
    content: "Texto principal: 'No soy programador, No soy marketero, No soy otro más hablando de IA. Soy Engelbert Huber Quequejana'",
    interactionHint: "Use las flechas del teclado o scroll para navegar a la siguiente sección.",
    sectionIndex: 1,
    totalSections: 6
  },
  origin: {
    title: "Sección de Origen",  
    description: "Explora los orígenes culturales duales de Engelbert: el altiplano peruano de Puno y la ingeniería europea de Appenweier, Alemania.",
    visualDescription: "Mapas superpuestos de Puno, Perú y Appenweier, Alemania, con efectos de paralaje que muestran la conexión entre ambos mundos.",
    content: "Texto principal: 'Hijo del altiplano y del ingenio europeo. Puno, Perú + Appenweier, Alemania. Dos mundos, una visión'",
    interactionHint: "Continúe navegando para conocer la misión profesional.",
    sectionIndex: 2,
    totalSections: 6
  },
  mission: {
    title: "Sección de Misión",
    description: "Define su rol como operador de sistemas humanos que diseña engranajes invisibles respetando lo humano mientras amplifica lo digital.",
    visualDescription: "Engranajes y mecanismos mostrados como contornos y sombras, representando sistemas invisibles pero funcionales.",
    content: "Texto principal: 'Operador de sistemas humanos. Diseño engranajes invisibles que respetan lo humano mientras amplifican lo digital'",
    interactionHint: "Explore cómo esta misión se aplica en el presente.",
    sectionIndex: 3,
    totalSections: 6
  },
  present: {
    title: "Sección de Presente",
    description: "Muestra su trabajo actual en AI Engineering usando tecnologías como LangChain, Zapier, RAG y AI Agents.",
    visualDescription: "Ríos de datos fluyendo con iconos de herramientas tecnológicas. Animaciones de partículas representan el flujo de información.",
    content: "Texto principal: 'AI Engineering. LangChain • Zapier • RAG • AI Agents. Ríos de datos que fluyen hacia soluciones reales'",
    interactionHint: "Descubra la visión futura en la siguiente sección.",
    sectionIndex: 4,
    totalSections: 6
  },
  vision: {
    title: "Sección de Visión",
    description: "Presenta su visión de construir arquitecturas modulares de agentes conectados que aprenden, se adaptan y evolucionan.",
    visualDescription: "Una ciudad modular que se despliega, mostrando sistemas interconectados y evolutivos. Elementos arquitectónicos futuristas.",
    content: "Texto principal: 'Construyendo algo que no tiene nombre aún. Arquitectura modular de agentes conectados. Sistemas que aprenden, se adaptan y evolucionan'",
    interactionHint: "Llegue a la llamada a la acción final.",
    sectionIndex: 5,
    totalSections: 6
  },
  cta: {
    title: "Sección de Llamada a la Acción",
    description: "Invitación final para iniciar una conversación. Enfatiza que no es un funnel de ventas tradicional, sino el comienzo de algo diferente.",
    visualDescription: "Elementos minimalistas que enfocan la atención en el botón de acción. Efectos sutiles que invitan a la interacción.",
    content: "Texto principal: 'Pero tú ya lo necesitas. Inicia la conversación. No es un funnel. Es el comienzo de algo diferente.' Incluye un botón para iniciar la conversación.",
    interactionHint: "Presione Enter o haga clic en el botón para iniciar la conversación.",
    sectionIndex: 6,
    totalSections: 6
  }
};

interface SectionDescriptionsProps {
  currentSection: number;
  className?: string;
}

export const SectionDescriptions: React.FC<SectionDescriptionsProps> = ({ 
  currentSection, 
  className = "" 
}) => {
  const { announceToScreenReader, state } = useAccessibility();
  
  // Get current section info
  const sections = Object.keys(sectionDescriptions);
  const currentSectionKey = sections[currentSection] as keyof typeof sectionDescriptions;
  const sectionInfo = sectionDescriptions[currentSectionKey];
  
  if (!sectionInfo) return null;

  return (
    <div className={`sr-only ${className}`}>
      {/* Current section description for screen readers */}
      <div 
        id={`section-${currentSection}-description`}
        aria-live="polite"
        aria-atomic="true"
      >
        <h2>{sectionInfo.title}</h2>
        <p>{sectionInfo.description}</p>
        {state.reducedMotion && (
          <p>{sectionInfo.visualDescription}</p>
        )}
        <p>{sectionInfo.content}</p>
        <p>
          Sección {sectionInfo.sectionIndex} de {sectionInfo.totalSections}. 
          {sectionInfo.interactionHint}
        </p>
      </div>
      
      {/* Navigation instructions */}
      <div id="navigation-instructions" aria-live="polite">
        <p>
          Navegación: Use las flechas arriba/abajo, Page Up/Page Down, o scroll para moverse entre secciones. 
          Presione Tab para navegar por elementos interactivos.
        </p>
      </div>
    </div>
  );
};

// Hook to get section description by key
export const useSectionDescription = (sectionKey: keyof typeof sectionDescriptions) => {
  return sectionDescriptions[sectionKey];
};

// Hook to announce section changes to screen readers
export const useSectionAnnouncements = () => {
  const { announceToScreenReader, state } = useAccessibility();
  
  const announceSection = (sectionIndex: number, options?: {
    includeVisualDescription?: boolean;
    includeNavigationHint?: boolean;
  }) => {
    const sections = Object.keys(sectionDescriptions);
    const sectionKey = sections[sectionIndex] as keyof typeof sectionDescriptions;
    const section = sectionDescriptions[sectionKey];
    
    if (!section) return;
    
    let announcement = `${section.title}. ${section.description}`;
    
    if (options?.includeVisualDescription && state.reducedMotion) {
      announcement += ` ${section.visualDescription}`;
    }
    
    if (options?.includeNavigationHint) {
      announcement += ` ${section.interactionHint}`;
    }
    
    announcement += ` Sección ${section.sectionIndex} de ${section.totalSections}.`;
    
    announceToScreenReader(announcement);
  };
  
  return { announceSection };
};