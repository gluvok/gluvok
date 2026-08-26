"use client";

/**
 * @file app/feedback/page.tsx
 * @description Feedback portal page (Under Construction).
 */

import { Send } from "lucide-react";
import { UnderConstructionPage } from "@/components/under-construction";

export default function FeedbackPage() {
  return (
    <UnderConstructionPage
      triggerId="sidebar-trigger-feedback"
      breadcrumbTitle="Feedback"
      title="Feedback Portal Coming Soon"
      description="We value your feedback! Our dedicated Feedback submission and feature request hub is currently being built to help shape future platform updates."
      icon={Send}
    />
  );
}
