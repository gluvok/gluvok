import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
      <h1 className="text-4xl font-bold tracking-tight font-heading">404</h1>
      <p className="text-sm text-muted-foreground">
        This page could not be found or is under construction.
      </p>
      <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/" />}>
        Return to Home
      </Button>
    </div>
  );
}
