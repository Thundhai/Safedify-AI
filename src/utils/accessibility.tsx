/**
 * Accessibility utilities and components
 */

import React, { useEffect, useRef, createContext, useContext, useState, useCallback } from 'react';

// ============ SKIP LINK ============
/**
 * Skip to main content link for keyboard users
 * Place at the very top of your app layout
 */
export const SkipLink: React.FC<{ targetId?: string }> = ({ targetId = 'main-content' }) => (
  <a
    href={`#${targetId}`}
    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:shadow-lg"
  >
    Skip to main content
  </a>
);

// ============ LIVE REGION FOR ANNOUNCEMENTS ============
interface AnnouncerContextType {
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
}

const AnnouncerContext = createContext<AnnouncerContextType | null>(null);

export const AnnouncerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [politeMessage, setPoliteMessage] = useState('');
  const [assertiveMessage, setAssertiveMessage] = useState('');

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (priority === 'assertive') {
      setAssertiveMessage('');
      setTimeout(() => setAssertiveMessage(message), 50);
    } else {
      setPoliteMessage('');
      setTimeout(() => setPoliteMessage(message), 50);
    }
  }, []);

  return (
    <AnnouncerContext.Provider value={{ announce }}>
      {children}
      {/* Polite announcements (non-interrupting) */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeMessage}
      </div>
      {/* Assertive announcements (interrupting) */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveMessage}
      </div>
    </AnnouncerContext.Provider>
  );
};

export const useAnnounce = () => {
  const context = useContext(AnnouncerContext);
  if (!context) {
    // Return no-op if not wrapped in provider
    return { announce: () => {} };
  }
  return context;
};

// ============ FOCUS TRAP ============
/**
 * Trap focus within a container (for modals, dialogs)
 */
export const useFocusTrap = (isActive: boolean) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    // Store previously focused element
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Get focusable elements
    const getFocusableElements = () => {
      const container = containerRef.current;
      if (!container) return [];
      return Array.from(
        container.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
    };

    // Focus first element
    const focusables = getFocusableElements();
    if (focusables.length > 0) {
      focusables[0].focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusables = getFocusableElements();
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus on unmount
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [isActive]);

  return containerRef;
};

// ============ ESCAPE KEY HANDLER ============
export const useEscapeKey = (callback: () => void, isActive: boolean = true) => {
  useEffect(() => {
    if (!isActive) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        callback();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [callback, isActive]);
};

// ============ VISUALLY HIDDEN (SR ONLY) ============
export const VisuallyHidden: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="sr-only">{children}</span>
);

// ============ ICON BUTTON ============
/**
 * Accessible icon-only button with required aria-label
 */
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string; // Make aria-label required
  children: React.ReactNode;
}

export const IconButton: React.FC<IconButtonProps> = ({
  children,
  className = '',
  ...props
}) => (
  <button
    type="button"
    className={`inline-flex items-center justify-center ${className}`}
    {...props}
  >
    {children}
  </button>
);

// ============ KEYBOARD NAV HELPERS ============
/**
 * Handle arrow key navigation in a list
 */
export const useArrowKeyNavigation = (itemCount: number, options?: { wrap?: boolean }) => {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const wrap = options?.wrap ?? true;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = prev + 1;
          return wrap ? next % itemCount : Math.min(next, itemCount - 1);
        });
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = prev - 1;
          return wrap ? (next < 0 ? itemCount - 1 : next) : Math.max(next, 0);
        });
      } else if (e.key === 'Home') {
        e.preventDefault();
        setFocusedIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setFocusedIndex(itemCount - 1);
      }
    },
    [itemCount, wrap]
  );

  return { focusedIndex, setFocusedIndex, handleKeyDown };
};

export default {
  SkipLink,
  AnnouncerProvider,
  useAnnounce,
  useFocusTrap,
  useEscapeKey,
  VisuallyHidden,
  IconButton,
  useArrowKeyNavigation,
};
