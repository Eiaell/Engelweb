'use client';

import { useEffect, useRef, useState } from 'react';
import { useAccessibility } from '@/contexts/AccessibilityContext';

interface LiveRegionProps {
  politeness?: 'polite' | 'assertive' | 'off';
  atomic?: boolean;
  relevant?: 'additions' | 'removals' | 'text' | 'all';
  className?: string;
}

export const ScreenReaderLiveRegion: React.FC<LiveRegionProps> = ({
  politeness = 'polite',
  atomic = true,
  relevant = 'all',
  className = 'sr-only'
}) => {
  const [announcement, setAnnouncement] = useState<string>('');
  const [isVisible, setIsVisible] = useState(false);
  const announcementTimeoutRef = useRef<NodeJS.Timeout>();
  const clearTimeoutRef = useRef<NodeJS.Timeout>();
  const { state } = useAccessibility();
  
  // Listen for custom announcement events
  useEffect(() => {
    const handleAnnouncement = (event: CustomEvent<{ message: string; priority?: 'polite' | 'assertive' }>) => {
      const { message, priority = politeness } = event.detail;
      
      // Clear any existing timeouts
      if (announcementTimeoutRef.current) {
        clearTimeout(announcementTimeoutRef.current);
      }
      if (clearTimeoutRef.current) {
        clearTimeout(clearTimeoutRef.current);
      }
      
      // Set the announcement
      setAnnouncement(message);
      setIsVisible(true);
      
      // For screen readers, we need to ensure the content changes to trigger announcement
      announcementTimeoutRef.current = setTimeout(() => {
        setAnnouncement(`${message} `); // Add space to make it different
      }, 50);
      
      // Clear the announcement after it's been read
      clearTimeoutRef.current = setTimeout(() => {
        setAnnouncement('');
        setIsVisible(false);
      }, Math.max(3000, message.length * 100)); // Longer messages get more time
    };
    
    // Listen for the custom event
    document.addEventListener('screen-reader-announce', handleAnnouncement as EventListener);
    
    return () => {
      document.removeEventListener('screen-reader-announce', handleAnnouncement as EventListener);
      if (announcementTimeoutRef.current) {
        clearTimeout(announcementTimeoutRef.current);
      }
      if (clearTimeoutRef.current) {
        clearTimeout(clearTimeoutRef.current);
      }
    };
  }, [politeness]);
  
  return (
    <>
      {/* Primary live region for general announcements */}
      <div
        id="live-region-polite"
        aria-live="polite"
        aria-atomic={atomic}
        aria-relevant={relevant}
        className={className}
      >
        {politeness === 'polite' && announcement}
      </div>
      
      {/* Assertive live region for urgent announcements */}
      <div
        id="live-region-assertive"
        aria-live="assertive"
        aria-atomic={atomic}
        aria-relevant={relevant}
        className={className}
      >
        {politeness === 'assertive' && announcement}
      </div>
      
      {/* Status region for progress updates */}
      <div
        id="live-region-status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={className}
      >
        {/* This will be populated by status updates */}
      </div>
      
      {/* Alert region for errors and important messages */}
      <div
        id="live-region-alert"
        role="alert"
        aria-atomic="true"
        className={className}
      >
        {/* This will be populated by alerts */}
      </div>
    </>
  );
};

// Status announcer for loading states, progress, etc.
export const StatusAnnouncer: React.FC = () => {
  const [status, setStatus] = useState<string>('');
  const statusTimeoutRef = useRef<NodeJS.Timeout>();
  
  useEffect(() => {
    const handleStatusUpdate = (event: CustomEvent<{ message: string }>) => {
      const { message } = event.detail;
      
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
      
      setStatus(message);
      
      // Clear status after announcement
      statusTimeoutRef.current = setTimeout(() => {
        setStatus('');
      }, 2000);
    };
    
    document.addEventListener('status-update', handleStatusUpdate as EventListener);
    
    return () => {
      document.removeEventListener('status-update', handleStatusUpdate as EventListener);
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
    };
  }, []);
  
  return (
    <div
      id="status-announcer"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {status}
    </div>
  );
};

// Alert announcer for errors and critical messages
export const AlertAnnouncer: React.FC = () => {
  const [alert, setAlert] = useState<string>('');
  const alertTimeoutRef = useRef<NodeJS.Timeout>();
  
  useEffect(() => {
    const handleAlert = (event: CustomEvent<{ message: string; persistent?: boolean }>) => {
      const { message, persistent = false } = event.detail;
      
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }
      
      setAlert(message);
      
      // Clear alert unless it's persistent
      if (!persistent) {
        alertTimeoutRef.current = setTimeout(() => {
          setAlert('');
        }, 5000);
      }
    };
    
    const handleClearAlert = () => {
      setAlert('');
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }
    };
    
    document.addEventListener('accessibility-alert', handleAlert as EventListener);
    document.addEventListener('clear-accessibility-alert', handleClearAlert);
    
    return () => {
      document.removeEventListener('accessibility-alert', handleAlert as EventListener);
      document.removeEventListener('clear-accessibility-alert', handleClearAlert);
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }
    };
  }, []);
  
  return (
    <div
      id="alert-announcer"
      role="alert"
      aria-atomic="true"
      className="sr-only"
    >
      {alert}
    </div>
  );
};

// Progress announcer for loading and animation states
export const ProgressAnnouncer: React.FC = () => {
  const [progress, setProgress] = useState<string>('');
  const { state } = useAccessibility();
  
  useEffect(() => {
    const handleProgressUpdate = (event: CustomEvent<{ 
      current: number; 
      total: number; 
      label?: string;
      percentage?: number;
    }>) => {
      const { current, total, label = 'Progreso', percentage } = event.detail;
      
      let message = '';
      if (percentage !== undefined) {
        message = `${label}: ${Math.round(percentage)}% completado`;
      } else {
        message = `${label}: ${current} de ${total}`;
      }
      
      setProgress(message);
      
      // Clear progress when complete
      if (current >= total || percentage === 100) {
        setTimeout(() => setProgress(''), 1000);
      }
    };
    
    // Only announce progress if user has accessibility needs
    if (state.screenReader || state.reducedMotion) {
      document.addEventListener('progress-update', handleProgressUpdate as EventListener);
    }
    
    return () => {
      document.removeEventListener('progress-update', handleProgressUpdate as EventListener);
    };
  }, [state.screenReader, state.reducedMotion]);
  
  return (
    <div
      id="progress-announcer"
      role="progressbar"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {progress}
    </div>
  );
};

// Utility functions to trigger announcements
export const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
  const event = new CustomEvent('screen-reader-announce', {
    detail: { message, priority }
  });
  document.dispatchEvent(event);
};

export const announceStatus = (message: string) => {
  const event = new CustomEvent('status-update', {
    detail: { message }
  });
  document.dispatchEvent(event);
};

export const announceAlert = (message: string, persistent: boolean = false) => {
  const event = new CustomEvent('accessibility-alert', {
    detail: { message, persistent }
  });
  document.dispatchEvent(event);
};

export const clearAlert = () => {
  const event = new CustomEvent('clear-accessibility-alert');
  document.dispatchEvent(event);
};

export const announceProgress = (current: number, total: number, label?: string) => {
  const event = new CustomEvent('progress-update', {
    detail: { current, total, label }
  });
  document.dispatchEvent(event);
};

export const announceProgressPercentage = (percentage: number, label?: string) => {
  const event = new CustomEvent('progress-update', {
    detail: { current: percentage, total: 100, percentage, label }
  });
  document.dispatchEvent(event);
};