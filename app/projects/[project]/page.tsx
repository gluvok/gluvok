/**
 * @file app/projects/[project]/page.tsx
 * @description Dynamic page component for individual projects/tables in the gluvok dashboard.
 * Looks up the project in the registry and renders the appropriate layout and components.
 */

import { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectClient } from "./client";
import { PROJECT_REGISTRY } from "@/lib/projects";
import { ProjectHeader } from "@/components/projects";

type Props = {
  params: Promise<{ project: string }>;
};

/**
 * generateMetadata
 * Generates dynamic page titles and metadata based on the requested project slug.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const projectSlug = resolvedParams?.project || "";
  const config = PROJECT_REGISTRY[projectSlug];

  if (!config) return { title: "Not Found | gluvok Dashboard" };

  return {
    title: `${config.name} | gluvok Dashboard`,
    description: config.desc || `Manage and track ${config.name} entities on the gluvok platform.`,
  };
}

/**
 * ProjectPage Component
 * The main server page component for a dynamic project route.
 * Validates the project exists in the configuration registry and renders the page headers and client orchestrator.
 */
export default async function ProjectPage({ params }: Props) {
  const resolvedParams = await params;
  const projectSlug = resolvedParams?.project || "";
  const config = PROJECT_REGISTRY[projectSlug];

  if (!config) notFound();

  const { name: projectName, icon: IconComponent, desc } = config;

  return (
    <>
      {/* Navigation header for the project */}
      <ProjectHeader projectSlug={projectSlug} projectName={projectName} Icon={IconComponent} />

      {/* Main dashboard content container */}
      <main className="p-6 w-full min-w-0 flex-1 flex flex-col">
        <ProjectClient
          key={projectSlug}
          projectName={projectName}
          projectSlug={projectSlug}
          desc={desc}
        />
      </main>
    </>
  );
}
