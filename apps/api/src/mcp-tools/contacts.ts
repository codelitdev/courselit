import { mediaRefSchema } from "@courselit/api-contract";
import { z } from "zod";
import {
  deleteContact,
  getContact,
  listContacts,
  listContactSegments,
  updateContact,
  updateContactMarketing,
} from "../contacts.js";
import type { McpToolModule } from "./context.js";

export const contactTools: McpToolModule = (deps) => [
  {
    name: "contacts.list",
    description: "List contacts for the school",
    risk: "read",
    inputSchema: z.object({
      q: z.string().optional(),
      segmentId: z.string().optional(),
      filter: z.string().optional(),
      page: z.coerce.number().int().min(1).default(1),
      rowsPerPage: z.coerce.number().int().min(1).max(100).default(20),
    }),
    async handler({ context, args }) {
      const parsed = args as {
        q?: string;
        segmentId?: string;
        filter?: string;
        page: number;
        rowsPerPage: number;
      };
      return listContacts(deps.db, context, parsed, deps.clock, {
        config: deps.sendLit,
      });
    },
  },
  {
    name: "contacts.get",
    description: "Read details of a single contact",
    risk: "read",
    inputSchema: z.object({ contactId: z.string() }),
    async handler({ context, args }) {
      const result = await getContact(
        deps.db,
        context,
        (args as { contactId: string }).contactId,
        { config: deps.sendLit },
      );
      if (!result.ok) return { error: result.error };
      return result.value;
    },
  },
  {
    name: "contacts.update",
    description: "Update contact details (name, bio, avatar, status)",
    risk: "write",
    inputSchema: z.object({
      contactId: z.string(),
      name: z.string().trim().min(1).max(200).optional(),
      bio: z.string().max(2000).optional(),
      avatar: mediaRefSchema.nullable().optional(),
      status: z.enum(["active", "deactivated"]).optional(),
    }),
    async handler({ context, args }) {
      const { contactId, ...body } = args as {
        contactId: string;
        name?: string;
        bio?: string;
        avatar?: any;
        status?: "active" | "deactivated";
      };
      const result = await updateContact(deps.db, context, contactId, body, deps.clock);
      if (!result.ok) return { error: result.error };
      return result.value;
    },
  },
  {
    name: "contacts.marketing.update",
    description: "Update contact marketing state (subscribed, tags)",
    risk: "write",
    inputSchema: z.object({
      contactId: z.string(),
      subscribed: z.boolean().optional(),
      tags: z.array(z.string()).optional(),
    }),
    async handler({ context, args }) {
      const { contactId, ...body } = args as {
        contactId: string;
        subscribed?: boolean;
        tags?: string[];
      };
      const result = await updateContactMarketing(
        deps.db,
        context,
        contactId,
        body,
        deps.clock,
        { config: deps.sendLit },
      );
      if (!result.ok) return { error: result.error };
      return result.value;
    },
  },
  {
    name: "contacts.delete",
    description: "Delete a contact from the school",
    risk: "destructive",
    inputSchema: z.object({
      contactId: z.string(),
      confirm: z.boolean().optional(),
    }),
    async handler({ context, args }) {
      const result = await deleteContact(
        deps.db,
        context,
        (args as { contactId: string }).contactId,
        deps.clock,
      );
      if (!result.ok) return { error: result.error };
      return result.value;
    },
  },
  {
    name: "contacts.segments.list",
    description: "List contact segments for the school",
    risk: "read",
    inputSchema: z.object({}),
    async handler({ context }) {
      const result = await listContactSegments(deps.db, context, {
        config: deps.sendLit,
      });
      if (!result.ok) return { error: result.error };
      return result.value;
    },
  },
];
