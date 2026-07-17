import { createFileRoute } from "@tanstack/react-router";
import { LineChart } from "lucide-react";
import { PagePlaceholder } from "@/components/page-placeholder";

export const Route = createFileRoute("/gpa")({
  head: () => ({
    meta: [
      { title: "GPA Tracker — AI Academic Copilot" },
      { name: "description", content: "Monitor and forecast your GPA over time." },
    ],
  }),
  component: () => (
    <PagePlaceholder
      title="GPA Tracker"
      description="Log grades, project your GPA, and set academic goals."
      icon={LineChart}
    />
  ),
});
