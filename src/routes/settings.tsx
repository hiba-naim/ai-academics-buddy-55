import { createFileRoute } from "@tanstack/react-router";
import { Settings as SettingsIcon } from "lucide-react";
import { PagePlaceholder } from "@/components/page-placeholder";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — AI Academic Copilot" },
      { name: "description", content: "Configure your account and preferences." },
    ],
  }),
  component: () => (
    <PagePlaceholder
      title="Settings"
      description="Manage your profile, preferences, and integrations."
      icon={SettingsIcon}
    />
  ),
});
