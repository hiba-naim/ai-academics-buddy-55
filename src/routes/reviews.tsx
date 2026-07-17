import { createFileRoute } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { PagePlaceholder } from "@/components/page-placeholder";

export const Route = createFileRoute("/reviews")({
  head: () => ({
    meta: [
      { title: "Instructor Reviews — AI Academic Copilot" },
      { name: "description", content: "Browse and share instructor feedback." },
    ],
  }),
  component: () => (
    <PagePlaceholder
      title="Instructor Reviews"
      description="Read peer feedback and rate your own instructors."
      icon={Star}
    />
  ),
});
