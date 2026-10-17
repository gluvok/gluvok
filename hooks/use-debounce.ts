"use client";

import { useEffect, useState } from "react";

/**
 * Custom hook that debounces a value by a specified delay in milliseconds.
 *
 * @param value The value to debounce.
 * @param delay The delay in milliseconds (default: 300ms).
 * @returns The debounced value.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // If value is empty or cleared, update immediately to prevent 300ms stale lag or double spinner flashes
    if (!value) {
      setDebouncedValue(value);
      return;
    }

    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
