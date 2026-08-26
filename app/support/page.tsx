"use client";

/**
 * @file app/support/page.tsx
 * @description Support center page (Under Construction).
 */

import { LifeBuoy } from "lucide-react";
import { UnderConstructionPage } from "@/components/under-construction";

export default function SupportPage() {
  return (
    <UnderConstructionPage
      triggerId="sidebar-trigger-support"
      breadcrumbTitle="Support"
      title="Support Center Coming Soon"
      description="We are currently building our dedicated Support Portal to provide instant ticketing, live chat, and comprehensive technical assistance. Stay tuned!"
      icon={LifeBuoy}
    />
  );
}
