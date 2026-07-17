import { createFileRoute } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <GraduationCap className="mx-auto h-12 w-12 text-primary" />
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
          AI Academic Copilot
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Project initialized. Routing and folder structure are ready.
        </p>
      </div>
    </main>
  );
}
