"use client";

/**
 * @file app/tickets/page.tsx
 * @description Support tickets management portal using the standardized DataTable architecture.
 */

import { Ticket } from "lucide-react";
import { ProjectHeader } from "@/components/projects";
import { ProjectClient } from "@/app/projects/[project]/client";
import { ProjectSlug } from "@/lib/constants/enums";

export default function TicketsPage() {
  return (
    <>
      <ProjectHeader projectSlug={ProjectSlug.TICKETS} projectName="Tickets" Icon={Ticket} />
      <main className="p-6 w-full min-w-0">
        <ProjectClient
          key={ProjectSlug.TICKETS}
          projectName="Tickets"
          projectSlug={ProjectSlug.TICKETS}
          desc="Track and review support tickets raised for entries and weighments."
        />
      </main>
    </>
  );
}
