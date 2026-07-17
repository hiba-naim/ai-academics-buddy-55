import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { PagePlaceholder } from "@/components/page-placeholder";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — AI Academic Copilot" },
      { name: "description", content: "Insights into your study habits and performance." },
    ],
  }),
  component: () => (
    <PagePlaceholder
      title="Analytics"
      description="Visualize study time, performance trends, and streaks."
      icon={BarChart3}
    />
  ),
});
