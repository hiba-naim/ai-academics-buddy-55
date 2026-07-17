import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const TABLE = "tasks" as const;

export const Route = createFileRoute("/api/tasks")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { listRows } = await import("@/server/utils/crud.server");
        return listRows(TABLE, request);
      },
      POST: async ({ request }) => {
        const { createRow } = await import("@/server/utils/crud.server");
        return createRow(TABLE, request);
      },
    },
  },
});
