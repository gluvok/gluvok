/**
 * @file components/projects/table/empty.tsx
 * @description Empty state rendered when no records match filter criteria.
 */

import { SearchX } from "lucide-react";

/**
 * ProjectTableEmpty Component
 * Renders an empty search state indicator without a surrounding card.
 */
export function ProjectTableEmpty() {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 h-48 text-xs text-muted-foreground">
      <SearchX className="h-8 w-8 text-muted-foreground/30 animate-pulse" />
      <span className="font-medium text-muted-foreground/75">No results found.</span>
    </div>
  );
}
