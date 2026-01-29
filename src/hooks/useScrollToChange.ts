import { useRef, useCallback } from 'react';

/**
 * Hook to automatically scroll to an element when changes occur.
 * Returns a ref to attach to the target element and a function to trigger the scroll.
 */
export function useScrollToChange<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);

  const scrollToElement = useCallback((options?: ScrollIntoViewOptions) => {
    if (ref.current) {
      // Small delay to allow DOM to update before scrolling
      setTimeout(() => {
        ref.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          ...options,
        });
      }, 50);
    }
  }, []);

  return { ref, scrollToElement };
}

/**
 * Utility function to scroll to any element by ref or selector.
 */
export function scrollToElement(
  target: HTMLElement | string | null,
  options?: ScrollIntoViewOptions
) {
  const element = typeof target === 'string' 
    ? document.querySelector(target) 
    : target;

  if (element) {
    setTimeout(() => {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        ...options,
      });
    }, 50);
  }
}

/**
 * Hook for scrolling to content when a tab/section changes.
 * Useful for tab panels, accordions, and similar UI patterns.
 */
export function useScrollOnChange<T extends HTMLElement = HTMLDivElement>() {
  const contentRef = useRef<T>(null);

  const handleChange = useCallback((callback?: () => void) => {
    callback?.();
    setTimeout(() => {
      contentRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 100);
  }, []);

  return { contentRef, handleChange };
}
