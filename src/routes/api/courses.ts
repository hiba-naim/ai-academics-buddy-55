import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const TABLE = "courses" as const;

export const Route = createFileRoute("/api/courses")({
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
