'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { mobileDetection, MobileProfile } from '@/lib/mobileDetection';

export interface TouchGestureState {
  isActive: boolean;
  gesture: 'pan' | 'pinch' | 'swipe' | 'tap' | null;
  direction: 'up' | 'down' | 'left' | 'right' | null;
  distance: number;
  velocity: number;
  scale: number;
  deltaX: number;
  deltaY: number;
}

export interface TouchGestureCallbacks {
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onPinchIn?: (scale: number) => void;
  onPinchOut?: (scale: number) => void;
  onPan?: (deltaX: number, deltaY: number) => void;
  onTap?: (x: number, y: number) => void;
  onLongPress?: (x: number, y: number) => void;
}

interface TouchPoint {
  id: number;
  x: number;
  y: number;
  timestamp: number;
}

export const useTouchGestures = (
  element: React.RefObject<HTMLElement>,
  callbacks: TouchGestureCallbacks = {},
  options: {
    swipeThreshold?: number;
    tapThreshold?: number;
    longPressDelay?: number;
    velocityThreshold?: number;
    pinchThreshold?: number;
    preventScroll?: boolean;
  } = {}
) => {
  const {
    swipeThreshold = 50,
    tapThreshold = 10,
    longPressDelay = 500,
    velocityThreshold = 0.5,
    pinchThreshold = 0.1,
    preventScroll = true
  } = options;

  const [gestureState, setGestureState] = useState<TouchGestureState>({
    isActive: false,
    gesture: null,
    direction: null,
    distance: 0,
    velocity: 0,
    scale: 1,
    deltaX: 0,
    deltaY: 0
  });

  const touchStartRef = useRef<TouchPoint[]>([]);
  const touchCurrentRef = useRef<TouchPoint[]>([]);
  const initialPinchDistanceRef = useRef<number>(0);
  const lastPinchScaleRef = useRef<number>(1);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const velocityHistoryRef = useRef<{ x: number; y: number; time: number }[]>([]);
  const mobileProfile = useRef<MobileProfile | null>(null);

  // Initialize mobile profile
  useEffect(() => {
    mobileProfile.current = mobileDetection.getProfile();
  }, []);

  const getTouchPoint = (touch: Touch): TouchPoint => ({
    id: touch.identifier,
    x: touch.clientX,
    y: touch.clientY,
    timestamp: Date.now()
  });

  const getDistance = (point1: TouchPoint, point2: TouchPoint): number => {
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const calculateVelocity = (current: TouchPoint, previous: TouchPoint): number => {
    const dx = current.x - previous.x;
    const dy = current.y - previous.y;
    const dt = current.timestamp - previous.timestamp;
    
    if (dt === 0) return 0;
    
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance / dt;
  };

  const updateVelocityHistory = (point: TouchPoint) => {
    velocityHistoryRef.current.push({
      x: point.x,
      y: point.y,
      time: point.timestamp
    });

    // Keep only last 5 points for velocity calculation
    if (velocityHistoryRef.current.length > 5) {
      velocityHistoryRef.current.shift();
    }
  };

  const getAverageVelocity = (): { velocity: number; direction: 'up' | 'down' | 'left' | 'right' | null } => {
    const history = velocityHistoryRef.current;
    if (history.length < 2) return { velocity: 0, direction: null };

    const first = history[0];
    const last = history[history.length - 1];
    
    const dx = last.x - first.x;
    const dy = last.y - first.y;
    const dt = last.time - first.time;

    if (dt === 0) return { velocity: 0, direction: null };

    const distance = Math.sqrt(dx * dx + dy * dy);
    const velocity = distance / dt;

    let direction: 'up' | 'down' | 'left' | 'right' | null = null;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      direction = dx > 0 ? 'right' : 'left';
    } else {
      direction = dy > 0 ? 'down' : 'up';
    }

    return { velocity, direction };
  };

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!mobileProfile.current?.hasTouch) return;

    // Prevent default scroll behavior if requested
    if (preventScroll) {
      e.preventDefault();
    }

    const touches = Array.from(e.touches).map(getTouchPoint);
    touchStartRef.current = touches;
    touchCurrentRef.current = touches;
    
    // Clear velocity history
    velocityHistoryRef.current = [];
    updateVelocityHistory(touches[0]);

    // Handle pinch gesture initialization
    if (touches.length === 2) {
      initialPinchDistanceRef.current = getDistance(touches[0], touches[1]);
      lastPinchScaleRef.current = 1;
      
      setGestureState(prev => ({
        ...prev,
        isActive: true,
        gesture: 'pinch',
        scale: 1
      }));
    } else if (touches.length === 1) {
      // Single touch - potential tap, pan, or swipe
      setGestureState(prev => ({
        ...prev,
        isActive: true,
        gesture: null
      }));

      // Start long press timer
      longPressTimerRef.current = setTimeout(() => {
        callbacks.onLongPress?.(touches[0].x, touches[0].y);
      }, longPressDelay);
    }
  }, [callbacks, preventScroll, longPressDelay]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!mobileProfile.current?.hasTouch || touchStartRef.current.length === 0) return;

    if (preventScroll) {
      e.preventDefault();
    }

    const touches = Array.from(e.touches).map(getTouchPoint);
    touchCurrentRef.current = touches;

    clearLongPressTimer();
    updateVelocityHistory(touches[0]);

    if (touches.length === 2 && touchStartRef.current.length === 2) {
      // Pinch gesture
      const currentDistance = getDistance(touches[0], touches[1]);
      const scale = currentDistance / initialPinchDistanceRef.current;
      
      setGestureState(prev => ({
        ...prev,
        gesture: 'pinch',
        scale,
        isActive: true
      }));

      // Trigger pinch callbacks
      if (Math.abs(scale - lastPinchScaleRef.current) > pinchThreshold) {
        if (scale > lastPinchScaleRef.current) {
          callbacks.onPinchOut?.(scale);
        } else {
          callbacks.onPinchIn?.(scale);
        }
        lastPinchScaleRef.current = scale;
      }
    } else if (touches.length === 1 && touchStartRef.current.length === 1) {
      // Pan gesture
      const startTouch = touchStartRef.current[0];
      const currentTouch = touches[0];
      
      const deltaX = currentTouch.x - startTouch.x;
      const deltaY = currentTouch.y - startTouch.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      setGestureState(prev => ({
        ...prev,
        gesture: 'pan',
        deltaX,
        deltaY,
        distance,
        isActive: true
      }));

      // Trigger pan callback
      callbacks.onPan?.(deltaX, deltaY);
    }
  }, [callbacks, preventScroll, pinchThreshold]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!mobileProfile.current?.hasTouch || touchStartRef.current.length === 0) return;

    clearLongPressTimer();

    const { velocity, direction } = getAverageVelocity();
    
    // Determine final gesture based on movement and velocity
    if (touchStartRef.current.length === 1 && touchCurrentRef.current.length >= 1) {
      const startTouch = touchStartRef.current[0];
      const endX = touchCurrentRef.current[0]?.x || startTouch.x;
      const endY = touchCurrentRef.current[0]?.y || startTouch.y;
      
      const deltaX = endX - startTouch.x;
      const deltaY = endY - startTouch.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance < tapThreshold && velocity < velocityThreshold) {
        // Tap gesture
        setGestureState(prev => ({
          ...prev,
          gesture: 'tap',
          isActive: false
        }));
        callbacks.onTap?.(startTouch.x, startTouch.y);
      } else if (distance > swipeThreshold || velocity > velocityThreshold) {
        // Swipe gesture
        const swipeDirection = Math.abs(deltaX) > Math.abs(deltaY) 
          ? (deltaX > 0 ? 'right' : 'left')
          : (deltaY > 0 ? 'down' : 'up');

        setGestureState(prev => ({
          ...prev,
          gesture: 'swipe',
          direction: swipeDirection,
          velocity,
          distance,
          isActive: false
        }));

        // Trigger swipe callbacks
        switch (swipeDirection) {
          case 'up':
            callbacks.onSwipeUp?.();
            break;
          case 'down':
            callbacks.onSwipeDown?.();
            break;
          case 'left':
            callbacks.onSwipeLeft?.();
            break;
          case 'right':
            callbacks.onSwipeRight?.();
            break;
        }
      }
    }

    // Reset state
    setTimeout(() => {
      setGestureState(prev => ({
        ...prev,
        isActive: false,
        gesture: null,
        direction: null,
        distance: 0,
        velocity: 0,
        scale: 1,
        deltaX: 0,
        deltaY: 0
      }));
    }, 100);

    touchStartRef.current = [];
    touchCurrentRef.current = [];
    velocityHistoryRef.current = [];
  }, [callbacks, tapThreshold, velocityThreshold, swipeThreshold]);

  const handleTouchCancel = useCallback((e: TouchEvent) => {
    clearLongPressTimer();
    
    setGestureState(prev => ({
      ...prev,
      isActive: false,
      gesture: null
    }));

    touchStartRef.current = [];
    touchCurrentRef.current = [];
    velocityHistoryRef.current = [];
  }, []);

  // Attach event listeners
  useEffect(() => {
    const el = element.current;
    if (!el || !mobileProfile.current?.hasTouch) return;

    // Use passive listeners for better performance where possible
    const passiveOptions = { passive: !preventScroll };
    const activeOptions = { passive: false };

    el.addEventListener('touchstart', handleTouchStart, activeOptions);
    el.addEventListener('touchmove', handleTouchMove, activeOptions);
    el.addEventListener('touchend', handleTouchEnd, passiveOptions);
    el.addEventListener('touchcancel', handleTouchCancel, passiveOptions);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [element, handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel, preventScroll]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearLongPressTimer();
    };
  }, []);

  return {
    gestureState,
    isSupported: mobileProfile.current?.hasTouch || false,
    isMobile: mobileProfile.current?.isMobile || false
  };
};