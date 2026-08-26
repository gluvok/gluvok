"use client";

/**
 * @file app/not-found.tsx
 * @description 404 Not Found error page.
 * Rendered by Next.js automatically when a route is not matched.
 */

import {
  NotFoundHeader,
  NotFoundIllustration,
  NotFoundMessage,
  NotFoundActions,
} from "@/components/not-found";

/**
 * NotFound Component
 * Main orchestrator of the 404 page, combining header, illustration, messages, and action buttons.
 */
export default function NotFound() {
  return (
    <>
      <NotFoundHeader />

      <main className="flex flex-col items-center justify-center flex-1 p-6 md:p-12 text-center select-none">
        <div className="max-w-md w-full space-y-8 flex flex-col items-center justify-center">
          <NotFoundIllustration />
          <NotFoundMessage />
          <NotFoundActions />
        </div>
      </main>
    </>
  );
}
