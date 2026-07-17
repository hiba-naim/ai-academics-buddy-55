import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const TABLE = "tasks" as const;

export const Route = createFileRoute("/api/tasks/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { getRow } = await import("@/server/utils/crud.server");
        return getRow(TABLE, params.id);
      },
      PATCH: async ({ params, request }) => {
        const { updateRow } = await import("@/server/utils/crud.server");
        return updateRow(TABLE, params.id, request);
      },
      DELETE: async ({ params }) => {
        const { deleteRow } = await import("@/server/utils/crud.server");
        return deleteRow(TABLE, params.id);
      },
    },
  },
});
