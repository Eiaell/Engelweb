'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SectionProps } from '@/types';
import { cn } from '@/lib/utils';

gsap.registerPlugin(ScrollTrigger);

interface SectionWrapperProps extends SectionProps {
  children: React.ReactNode;
  sectionIndex: number;
  className?: string;
}

export const SectionWrapper: React.FC<SectionWrapperProps> = ({
  children,
  sectionIndex,
  isActive,
  scrollProgress,
  className = ''
}) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const content = contentRef.current;
    
    if (!section || !content) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1,
        onUpdate: (self) => {
          const progress = self.progress;
          gsap.set(content, {
            opacity: Math.max(0, 1 - Math.abs(progress - 0.5) * 2)
          });
        }
      }
    });

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className={cn(
        'relative h-screen w-full flex items-center justify-center',
        'overflow-hidden',
        className
      )}
      data-section-index={sectionIndex}
    >
      <div
        ref={contentRef}
        className="relative z-10 w-full max-w-4xl px-8 text-center"
      >
        {children}
      </div>
    </section>
  );
};