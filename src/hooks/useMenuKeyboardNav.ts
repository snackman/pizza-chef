import { useState, useEffect, useCallback, useRef } from 'react';

interface UseMenuKeyboardNavOptions {
  itemCount: number;
  columns?: number; // For grid layouts (default 1 = vertical list)
  onSelect: (index: number) => void;
  onEscape?: () => void;
  isActive?: boolean; // Whether this menu is currently active/visible
  initialIndex?: number;
  loop?: boolean; // Whether to wrap around at edges (default true)
}

/**
 * Hook for keyboard navigation in menus
 * Supports arrow keys, Enter to select, Escape to close
 */
export const useMenuKeyboardNav = ({
  itemCount,
  columns = 1,
  onSelect,
  onEscape,
  isActive = true,
  initialIndex = 0,
  loop = true,
}: UseMenuKeyboardNavOptions) => {
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const itemRefs = useRef<(HTMLButtonElement | HTMLElement | null)[]>([]);

  // Reset selection when menu becomes active
  useEffect(() => {
    if (isActive) {
      setSelectedIndex(initialIndex);
    }
  }, [isActive, initialIndex]);

  // Focus the selected element when it changes
  useEffect(() => {
    if (isActive && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.focus();
    }
  }, [selectedIndex, isActive]);

  const navigate = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (itemCount === 0) return;

    setSelectedIndex(current => {
      let next = current;
      const rows = Math.ceil(itemCount / columns);

      switch (direction) {
        case 'up':
          next = current - columns;
          if (next < 0) {
            next = loop ? itemCount - 1 : current;
          }
          break;
        case 'down':
          next = current + columns;
          if (next >= itemCount) {
            next = loop ? 0 : current;
          }
          break;
        case 'left':
          if (columns > 1) {
            // In grid, move left within row
            if (current % columns === 0) {
              next = loop ? current + columns - 1 : current;
              if (next >= itemCount) next = itemCount - 1;
            } else {
              next = current - 1;
            }
          } else {
            // In single column, treat as up
            next = current - 1;
            if (next < 0) next = loop ? itemCount - 1 : 0;
          }
          break;
        case 'right':
          if (columns > 1) {
            // In grid, move right within row
            if ((current + 1) % columns === 0 || current === itemCount - 1) {
              next = loop ? current - (current % columns) : current;
            } else {
              next = current + 1;
            }
          } else {
            // In single column, treat as down
            next = current + 1;
            if (next >= itemCount) next = loop ? 0 : itemCount - 1;
          }
          break;
      }

      // Ensure next is within bounds
      return Math.max(0, Math.min(itemCount - 1, next));
    });
  }, [itemCount, columns, loop]);

  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          navigate('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          navigate('down');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          navigate('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          navigate('right');
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          onSelect(selectedIndex);
          break;
        case 'Escape':
          e.preventDefault();
          onEscape?.();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, navigate, onSelect, onEscape, selectedIndex]);

  // Helper to register refs for focusable items
  const registerItem = useCallback((index: number) => (el: HTMLButtonElement | HTMLElement | null) => {
    itemRefs.current[index] = el;
  }, []);

  // Helper to get props for each menu item
  const getItemProps = useCallback((index: number) => ({
    ref: registerItem(index),
    tabIndex: selectedIndex === index ? 0 : -1,
    'data-selected': selectedIndex === index,
    onMouseEnter: () => setSelectedIndex(index),
    onClick: () => onSelect(index),
  }), [selectedIndex, registerItem, onSelect]);

  return {
    selectedIndex,
    setSelectedIndex,
    getItemProps,
    registerItem,
  };
};
