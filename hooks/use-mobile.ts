/**
 * @file hooks/use-mobile.ts
 * @description Hook to detect if the current screen width is within mobile breakpoint limits.
 */

import * as React from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * useIsMobile hook
 * Tracks viewport width changes and returns a boolean indicating whether screen width is below 768px.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    onChange();
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
