import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

/**
 * Traps focus inside a container element while it is active.
 * @param {boolean} isActive - Whether the trap should be active.
 * @returns {React.RefObject<HTMLElement>} Ref to attach to the container.
 */
export function useFocusTrap(isActive) {
  const containerRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (isActive) {
      previousFocusRef.current = document.activeElement;
      // Focus first focusable element after a short delay for render
      const timer = setTimeout(() => {
        const container = containerRef.current;
        if (!container) return;
        const focusable = container.querySelectorAll(FOCUSABLE_SELECTORS);
        const first = focusable[0];
        if (first) {
          first.focus();
        } else {
          container.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;

    function handleKeyDown(e) {
      if (e.key !== "Tab") return;
      const container = containerRef.current;
      if (!container) return;
      const focusable = Array.from(container.querySelectorAll(FOCUSABLE_SELECTORS));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    function handleEscape(e) {
      if (e.key === "Escape") {
        const container = containerRef.current;
        if (!container) return;
        // Dispatch a custom event that modals can listen for
        container.dispatchEvent(new CustomEvent("focus-trap-escape", { bubbles: true }));
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keydown", handleEscape);
      if (previousFocusRef.current?.focus) {
        previousFocusRef.current.focus();
      }
    };
  }, [isActive]);

  return containerRef;
}
