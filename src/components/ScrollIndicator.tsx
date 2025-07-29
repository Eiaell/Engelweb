'use client';

import { ScrollState } from '@/types';

interface ScrollIndicatorProps {
  scrollState: ScrollState;
  onSectionClick: (section: number) => void;
}

const sectionLabels = [
  { label: 'Identity', code: 'E1' },
  { label: 'Origin', code: 'H2' },
  { label: 'Mission', code: 'E3' },
  { label: 'Present', code: 'H4' },
  { label: 'Vision', code: 'E5' },
  { label: 'Connect', code: 'H6' }
];

export const ScrollIndicator: React.FC<ScrollIndicatorProps> = ({
  scrollState,
  onSectionClick
}) => {
  return (
    <div className="scroll-indicator">
      {sectionLabels.map((section, index) => (
        <div
          key={index}
          className="group relative cursor-pointer"
          onClick={() => onSectionClick(index)}
        >
          {/* Main dot */}
          <div
            className={`scroll-dot ${
              scrollState.currentSection === index ? 'active' : ''
            }`}
          />
          
          {/* Hover tooltip with EH code */}
          <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
            <div className="glass px-3 py-2 rounded-lg whitespace-nowrap">
              <div className="text-caption text-white/80">
                {section.code}
              </div>
              <div className="text-xs text-white/60 font-light">
                {section.label}
              </div>
            </div>
            
            {/* Arrow pointing to dot */}
            <div className="absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-b-[6px] border-l-[8px] border-t-transparent border-b-transparent border-l-white/10" />
          </div>
        </div>
      ))}
      
      {/* Subtle EH monogram at bottom */}
      <div className="mt-8 eh-monogram text-center">
        EH
      </div>
    </div>
  );
};