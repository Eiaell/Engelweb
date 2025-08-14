'use client';

import { SectionWrapper } from '@/components/SectionWrapper';
import { TextReveal } from '@/components/TextReveal';

interface DataGraphSectionProps {
  isVisible: boolean;
  isActive: boolean;
  scrollProgress: number;
  sectionIndex: number;
}

const DataGraphSection: React.FC<DataGraphSectionProps> = ({
  isVisible,
  isActive,
  scrollProgress,
  sectionIndex
}) => {

  const sectionContent = {
    title: "Arquitectura del Conocimiento",
    subtitle: "Visualización en Tiempo Real del Grafo de Conocimiento",
    description: "Explora cómo los datos danzan y se conectan en un ecosistema inteligente, donde cada fragmento de información encuentra su lugar en la sinfonía del conocimiento.",
    spanish: {
      title: "Arquitectura del Conocimiento",
      subtitle: "Visualización en Tiempo Real del Grafo de Conocimiento",
      description: "Explora cómo los datos danzan y se conectan en un ecosistema inteligente, donde cada fragmento de información encuentra su lugar en la sinfonía del conocimiento."
    }
  };

  return (
    <SectionWrapper 
      isVisible={isVisible}
      className="bg-black relative overflow-hidden"
    >
      {/* Background overlay for infinite space effect */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-black/50 to-black/90" />
      
      {/* Text overlay - only visible when scrolling starts */}
      <div 
        className={`absolute inset-0 z-10 flex flex-col justify-center items-center px-8 transition-opacity duration-1000 ${
          scrollProgress > 0.1 ? 'opacity-90' : 'opacity-0'
        }`}
      >
        <div className="text-center max-w-4xl">
          <TextReveal
            text={sectionContent.title}
            className="text-6xl md:text-8xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-yellow-400 to-magenta-400"
            delay={0.5}
            isVisible={isActive && scrollProgress > 0.2}
          />
          
          <TextReveal
            text={sectionContent.subtitle}
            className="text-xl md:text-2xl mb-8 text-cyan-300"
            delay={1}
            isVisible={isActive && scrollProgress > 0.4}
          />
          
          <TextReveal
            text={sectionContent.description}
            className="text-lg text-gray-300 leading-relaxed"
            delay={1.5}
            isVisible={isActive && scrollProgress > 0.6}
          />
        </div>

        {/* Interaction hint */}
        <div 
          className={`mt-12 text-center transition-all duration-1000 ${
            scrollProgress > 0.8 ? 'opacity-70 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <p className="text-cyan-400 text-sm uppercase tracking-wider animate-pulse">
            Interactúa con los datos • Mueve el cursor
          </p>
        </div>
      </div>

      {/* 3D Data Visualization - this should be rendered inside Scene3D */}

      {/* Phosphorescent particles overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400 rounded-full animate-pulse opacity-60"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>

      {/* Scan lines effect */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="w-full h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />
        <div 
          className="absolute w-full h-px bg-gradient-to-r from-transparent via-magenta-400 to-transparent"
          style={{ 
            top: '33%',
            animationDelay: '1s' 
          }}
        />
        <div 
          className="absolute w-full h-px bg-gradient-to-r from-transparent via-yellow-400 to-transparent"
          style={{ 
            top: '66%',
            animationDelay: '2s' 
          }}
        />
      </div>
    </SectionWrapper>
  );
};

export default DataGraphSection;