'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export const CustomCursor = () => {
  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorDotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    const cursorDot = cursorDotRef.current;
    
    if (!cursor || !cursorDot) return;

    let mouseX = 0;
    let mouseY = 0;
    let cursorX = 0;
    let cursorY = 0;
    let dotX = 0;
    let dotY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const handleMouseEnter = () => {
      gsap.to(cursor, { opacity: 1, duration: 0.3 });
      gsap.to(cursorDot, { opacity: 1, duration: 0.3 });
    };

    const handleMouseLeave = () => {
      gsap.to(cursor, { opacity: 0, duration: 0.3 });
      gsap.to(cursorDot, { opacity: 0, duration: 0.3 });
    };

    const handleMouseDown = () => {
      gsap.to(cursor, { scale: 0.8, duration: 0.1 });
    };

    const handleMouseUp = () => {
      gsap.to(cursor, { scale: 1, duration: 0.1 });
    };

    // Hover effects for interactive elements
    const handleHoverableEnter = () => {
      gsap.to(cursor, { 
        scale: 1.5, 
        backgroundColor: 'var(--eh-crimson)',
        mixBlendMode: 'difference',
        duration: 0.3 
      });
    };

    const handleHoverableLeave = () => {
      gsap.to(cursor, { 
        scale: 1, 
        backgroundColor: 'rgba(248, 249, 250, 0.1)',
        mixBlendMode: 'normal',
        duration: 0.3 
      });
    };

    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);

    // Add hover effects to interactive elements
    const hoverableElements = document.querySelectorAll('button, a, .scroll-dot, .glass');
    hoverableElements.forEach(el => {
      el.addEventListener('mouseenter', handleHoverableEnter);
      el.addEventListener('mouseleave', handleHoverableLeave);
    });

    // Smooth cursor animation
    const animateCursor = () => {
      cursorX += (mouseX - cursorX) * 0.1;
      cursorY += (mouseY - cursorY) * 0.1;
      dotX += (mouseX - dotX) * 0.3;
      dotY += (mouseY - dotY) * 0.3;

      gsap.set(cursor, {
        x: cursorX - 20,
        y: cursorY - 20,
      });

      gsap.set(cursorDot, {
        x: dotX - 2,
        y: dotY - 2,
      });

      requestAnimationFrame(animateCursor);
    };

    animateCursor();

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      
      hoverableElements.forEach(el => {
        el.removeEventListener('mouseenter', handleHoverableEnter);
        el.removeEventListener('mouseleave', handleHoverableLeave);
      });
    };
  }, []);

  return (
    <>
      {/* Main cursor */}
      <div
        ref={cursorRef}
        className="fixed top-0 left-0 w-10 h-10 border border-white/20 rounded-full pointer-events-none z-[9999] opacity-0"
        style={{
          backgroundColor: 'rgba(248, 249, 250, 0.1)',
          backdropFilter: 'blur(10px)',
        }}
      />
      
      {/* Cursor dot */}
      <div
        ref={cursorDotRef}
        className="fixed top-0 left-0 w-1 h-1 bg-white rounded-full pointer-events-none z-[9999] opacity-0"
      />
    </>
  );
};