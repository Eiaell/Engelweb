'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { cn } from '@/lib/utils';

gsap.registerPlugin(ScrollTrigger);

interface TextRevealProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
  variant?: 'fade' | 'slideUp' | 'typewriter' | 'splitWords' | 'magneticHover';
  triggerStart?: string;
  stagger?: boolean;
}

export const TextReveal: React.FC<TextRevealProps> = ({
  children,
  delay = 0,
  duration = 1,
  className = '',
  variant = 'fade',
  triggerStart = 'top 85%',
  stagger = false
}) => {
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = textRef.current;
    if (!element) return;

    let animation: gsap.core.Tween | gsap.core.Timeline;

    switch (variant) {
      case 'slideUp':
        gsap.set(element, { y: 50, opacity: 0 });
        animation = gsap.to(element, {
          y: 0,
          opacity: 1,
          duration,
          delay,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: element,
            start: triggerStart,
            toggleActions: 'play none none reverse',
            refreshPriority: -1,
            fastScrollEnd: true
          }
        });
        break;
      
      case 'typewriter':
        const text = element.textContent || '';
        element.textContent = '';
        gsap.set(element, { opacity: 1 });
        
        // Add cursor effect
        const cursor = document.createElement('span');
        cursor.textContent = '|';
        cursor.className = 'eh-crimson animate-pulse';
        element.appendChild(cursor);
        
        animation = gsap.to(element, {
          duration: duration * text.length * 0.03,
          delay,
          ease: 'none',
          onUpdate: function() {
            const progress = this.progress();
            const currentLength = Math.floor(progress * text.length);
            element.textContent = text.slice(0, currentLength);
            if (progress < 1) element.appendChild(cursor);
          },
          onComplete: () => {
            cursor.remove();
          },
          scrollTrigger: {
            trigger: element,
            start: triggerStart,
            toggleActions: 'play none none reverse',
            refreshPriority: -1,
            fastScrollEnd: true
          }
        });
        break;

      case 'splitWords':
        const words = element.textContent?.split(' ') || [];
        element.innerHTML = '';
        
        words.forEach((word, index) => {
          const span = document.createElement('span');
          span.textContent = word + ' ';
          span.style.display = 'inline-block';
          span.style.opacity = '0';
          span.style.transform = 'translateY(20px)';
          element.appendChild(span);
        });

        animation = gsap.timeline({
          scrollTrigger: {
            trigger: element,
            start: triggerStart,
            toggleActions: 'play none none reverse',
            refreshPriority: -1,
            fastScrollEnd: true
          }
        });

        element.querySelectorAll('span').forEach((span, index) => {
          animation.to(span, {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'power3.out',
            delay: delay + (index * 0.1)
          }, 0);
        });
        break;

      case 'magneticHover':
        gsap.set(element, { opacity: 0, scale: 0.95 });
        
        animation = gsap.to(element, {
          opacity: 1,
          scale: 1,
          duration,
          delay,
          ease: 'elastic.out(1, 0.5)',
          scrollTrigger: {
            trigger: element,
            start: triggerStart,
            toggleActions: 'play none none reverse',
            refreshPriority: -1,
            fastScrollEnd: true
          }
        });

        // Add magnetic hover effect
        const handleMouseEnter = () => {
          gsap.to(element, { scale: 1.02, duration: 0.3, ease: 'power2.out' });
        };
        
        const handleMouseLeave = () => {
          gsap.to(element, { scale: 1, duration: 0.3, ease: 'power2.out' });
        };

        element.addEventListener('mouseenter', handleMouseEnter);
        element.addEventListener('mouseleave', handleMouseLeave);

        // Store cleanup functions for later use
        const cleanupMouseEvents = () => {
          element.removeEventListener('mouseenter', handleMouseEnter);
          element.removeEventListener('mouseleave', handleMouseLeave);
        };
        
        // Add cleanup to the main cleanup function
        const originalCleanup = () => {
          cleanupMouseEvents();
          animation?.kill();
          ScrollTrigger.getAll().forEach(trigger => {
            if (trigger.trigger === element) {
              trigger.kill();
            }
          });
        };
        
        // Store cleanup for use in main return
        (element as any)._textRevealCleanup = originalCleanup;
        break;
      
      default: // fade
        gsap.set(element, { opacity: 0 });
        animation = gsap.to(element, {
          opacity: 1,
          duration,
          delay,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: element,
            start: triggerStart,
            toggleActions: 'play none none reverse',
            refreshPriority: -1,
            fastScrollEnd: true
          }
        });
    }

    return () => {
      // Check if magneticHover cleanup exists
      const customCleanup = (element as any)?._textRevealCleanup;
      if (customCleanup) {
        customCleanup();
      } else {
        animation?.kill();
        ScrollTrigger.getAll().forEach(trigger => {
          if (trigger.trigger === element) {
            trigger.kill();
          }
        });
      }
    };
  }, [delay, duration, variant, triggerStart, stagger]);

  return (
    <div
      ref={textRef}
      className={cn('relative', className)}
    >
      {children}
    </div>
  );
};