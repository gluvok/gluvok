import { redirect } from "next/navigation";
import { AppRoutes } from "@/lib/constants/routes";

/**
 * @file app/feedback/page.tsx
 * @description Redirects deprecated feedback route to support.
 */
export default function FeedbackPage() {
  redirect(AppRoutes.SUPPORT);
}
