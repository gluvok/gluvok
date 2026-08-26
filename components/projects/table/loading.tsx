/**
 * @file components/projects/table/loading.tsx
 * @description Simple spinner shown while table data is loading.
 */

import { Loader2 } from "lucide-react";

/**
 * ProjectTableLoading Component
 * Displays a centered spinner while data is being fetched.
 */
export function ProjectTableLoading() {
  return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
