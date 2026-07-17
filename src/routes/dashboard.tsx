import { createFileRoute } from "@tanstack/react-router";
import { LayoutDashboard } from "lucide-react";
import { PagePlaceholder } from "@/components/page-placeholder";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — AI Academic Copilot" },
      { name: "description", content: "Your academic overview at a glance." },
    ],
  }),
  component: () => (
    <PagePlaceholder
      title="Dashboard"
      description="An overview of your courses, tasks, and study progress."
      icon={LayoutDashboard}
    />
  ),
});
