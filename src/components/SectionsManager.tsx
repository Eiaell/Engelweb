'use client';

import { useMemo } from 'react';
import { ScrollState, SectionConfig, CameraState } from '@/types';
import { useCameraControl } from '@/hooks/useCameraControl';

// Import all section components
import { IdentitySection } from './sections/IdentitySection';
import { OriginSection } from './sections/OriginSection';
import { MissionSection } from './sections/MissionSection';
import { PresentSection } from './sections/PresentSection';
import { VisionSection } from './sections/VisionSection';
import { CTASection } from './sections/CTASection';

interface SectionsManagerProps {
  scrollState: ScrollState;
  getAsset?: (assetId: string) => Promise<any>;
  isAssetLoaded?: (assetId: string) => boolean;
}

export const SectionsManager: React.FC<SectionsManagerProps> = ({ 
  scrollState, 
  getAsset, 
  isAssetLoaded 
}) => {
  // Define camera configurations for each section
  const cameraConfigs: CameraState[] = useMemo(() => [
    // Identity Section - Close intimate view
    {
      position: [0, 0, 4],
      rotation: [0, 0, 0],
      fov: 75
    },
    // Origin Section - Wide view to see both maps
    {
      position: [0, 1, 6],
      rotation: [-0.1, 0, 0],
      fov: 80
    },
    // Mission Section - Dynamic angle for gear system
    {
      position: [2, 2, 5],
      rotation: [-0.2, 0.3, 0],
      fov: 70
    },
    // Present Section - Flowing perspective
    {
      position: [1, 0, 5],
      rotation: [0, 0.1, 0],
      fov: 75
    },
    // Vision Section - Elevated view of city
    {
      position: [0, 3, 7],
      rotation: [-0.3, 0, 0],
      fov: 65
    },
    // CTA Section - Clean centered view
    {
      position: [0, 0, 4],
      rotation: [0, 0, 0],
      fov: 75
    }
  ], []);

  // Section configurations
  const sections: SectionConfig[] = useMemo(() => [
    {
      name: 'identity',
      component: IdentitySection,
      camera: cameraConfigs[0],
      duration: 1
    },
    {
      name: 'origin',
      component: OriginSection,
      camera: cameraConfigs[1],
      duration: 1
    },
    {
      name: 'mission',
      component: MissionSection,
      camera: cameraConfigs[2],
      duration: 1
    },
    {
      name: 'present',
      component: PresentSection,
      camera: cameraConfigs[3],
      duration: 1
    },
    {
      name: 'vision',
      component: VisionSection,
      camera: cameraConfigs[4],
      duration: 1
    },
    {
      name: 'cta',
      component: CTASection,
      camera: cameraConfigs[5],
      duration: 1
    }
  ], [cameraConfigs]);

  // Initialize camera control
  useCameraControl(scrollState, cameraConfigs);

  // Calculate section-specific progress
  const getSectionProgress = (sectionIndex: number): number => {
    const totalSections = sections.length;
    const sectionSize = 1 / totalSections;
    const sectionStart = sectionIndex * sectionSize;
    const sectionEnd = (sectionIndex + 1) * sectionSize;
    
    if (scrollState.progress < sectionStart) return 0;
    if (scrollState.progress > sectionEnd) return 1;
    
    return (scrollState.progress - sectionStart) / sectionSize;
  };

  // Determine which sections should be active (for performance)
  const getActiveSections = (): boolean[] => {
    const currentSection = scrollState.currentSection;
    const totalSections = sections.length;
    
    return sections.map((_, index) => {
      // Show current section and adjacent sections for smooth transitions
      return Math.abs(index - currentSection) <= 1;
    });
  };

  const activeSections = getActiveSections();

  return (
    <group>
      {sections.map((section, index) => {
        const SectionComponent = section.component;
        const isActive = activeSections[index];
        const sectionProgress = getSectionProgress(index);
        
        return (
          <SectionComponent
            key={section.name}
            isActive={isActive}
            scrollProgress={scrollState.progress}
            sectionProgress={sectionProgress}
            velocity={scrollState.velocity}
          />
        );
      })}
    </group>
  );
};