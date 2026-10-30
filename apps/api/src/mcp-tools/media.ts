import { reconcileMediaReferencesBodySchema } from "@courselit/api-contract";
import { z } from "zod";
import type { MediaResourceType } from "../media.js";
import {
  deleteMedia,
  getMedia,
  listMedia,
  listMediaReferences,
  reconcileMediaReferences,
  updateMedia,
} from "../media.js";
import type { McpToolModule } from "./context.js";

export const mediaTools: McpToolModule = (deps) => [
  {
    name: "media.list",
    description: "List media-library assets for the selected school",
    risk: "read",
    inputSchema: z.object({
      search: z.string().max(200).optional(),
      cursor: z.string().max(500).optional(),
      limit: z.number().int().min(1).max(50).default(25),
    }),
    async handler({ context, args }) {
      const parsed = args as {
        search?: string;
        cursor?: string;
        limit: number;
      };
      const result = await listMedia(deps.db, context, context.publicSchoolId, parsed);
      if (!result.ok) return { error: result.error };
      return result.value;
    },
  },
  {
    name: "media.get",
    description: "Read media-library metadata",
    risk: "read",
    inputSchema: z.object({ mediaId: z.string() }),
    async handler({ context, args }) {
      const result = await getMedia(
        deps.db,
        context,
        context.publicSchoolId,
        (args as { mediaId: string }).mediaId,
      );
      if (!result.ok) return { error: result.error };
      return result.value;
    },
  },
  {
    name: "media.update",
    description: "Update media-library metadata",
    risk: "write",
    inputSchema: z.object({
      mediaId: z.string(),
      altText: z.string().max(1_000).optional(),
      caption: z.string().max(2_000).optional(),
      accessPolicy: z.enum(["public", "private"]).optional(),
    }),
    async handler({ context, args }) {
      const parsed = args as {
        mediaId: string;
        altText?: string;
        caption?: string;
        accessPolicy?: "public" | "private";
      };
      const result = await updateMedia(
        deps.db,
        context,
        context.publicSchoolId,
        parsed.mediaId,
        parsed,
        deps.clock,
      );
      if (!result.ok) return { error: result.error };
      return result.value;
    },
  },
  {
    name: "media.references.list",
    description: "List the resources using a media-library asset",
    risk: "read",
    inputSchema: z.object({ mediaId: z.string() }),
    async handler({ context, args }) {
      const result = await listMediaReferences(
        deps.db,
        context,
        (args as { mediaId: string }).mediaId,
      );
      if (!result.ok) return { error: result.error };
      return { items: result.value };
    },
  },
  {
    name: "media.references.reconcile",
    description: "Replace the complete reference set for a media asset",
    risk: "write",
    inputSchema: z.object({
      mediaId: z.string(),
      ...reconcileMediaReferencesBodySchema.shape,
    }),
    async handler({ context, args }) {
      const parsed = args as {
        mediaId: string;
        references: Array<{
          resourceType: MediaResourceType;
          resourceId: string;
          parentResourceId?: string | null;
        }>;
      };
      const result = await reconcileMediaReferences(
        deps.db,
        context,
        parsed.mediaId,
        parsed.references,
        deps.clock,
      );
      if (!result.ok) return { error: result.error };
      return { items: result.value };
    },
  },
  {
    name: "media.delete",
    description: "Delete an unused media-library asset",
    risk: "destructive",
    inputSchema: z.object({ mediaId: z.string(), confirm: z.boolean().optional() }),
    async handler({ context, args }) {
      const result = await deleteMedia(
        deps.db,
        context,
        deps.mediaLit,
        (args as { mediaId: string }).mediaId,
        deps.clock,
      );
      if (!result.ok) return { error: result.error };
      return { deleted: true };
    },
  },
];
