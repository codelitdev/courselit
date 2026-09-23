import { createMcpServerKit, type McpServerKit } from "@codelitdev/mcp-server-kit";
import {
  createPlatformError,
  type PlatformRequestContext,
  readOrCreateRequestId,
} from "@codelitdev/platform";
import {
  contactFilterSetSchema,
  createProductBodySchema,
  mediaRefSchema,
  reconcileMediaReferencesBodySchema,
  updateProductBodySchema,
} from "@courselit/api-contract";
import { z } from "zod";
import { authenticateMcpRequest } from "./auth/authenticate.js";
import { getProduct } from "./catalog.js";
import {
  deleteContact,
  getContact,
  listContacts,
  listContactSegments,
  updateContact,
  updateContactMarketing,
} from "./contacts.js";
import type { DispatchDeps } from "./deps.js";
import type { MediaResourceType } from "./media.js";
import {
  deleteMedia,
  getMedia,
  listMedia,
  listMediaReferences,
  reconcileMediaReferences,
  updateMedia,
} from "./media.js";
import type { CourseLitPermission } from "./permissions.js";
import {
  createProduct,
  deleteProduct,
  listProducts,
  updateProduct,
} from "./products.js";
import { headerSchoolId, resolveSchoolContext } from "./school-context.js";

type Ctx = PlatformRequestContext<string, string, CourseLitPermission> & {
  publicSchoolId: string;
};

export function createCourseLitMcp(deps: DispatchDeps): McpServerKit<Ctx> {
  return createMcpServerKit<Ctx>({
    name: "courselit",
    version: "0.0.0",
    onError: ({ error, source }) =>
      deps.observability?.captureException({ error, source }),
    authenticate: (headers) => authenticateMcpRequest(headers, deps),
    async resolveContext({ principalId, credential, headers }) {
      const school = await resolveSchoolContext({
        db: deps.db,
        principalId,
        credential: credential.credential,
        requestedPublicSchoolId: headerSchoolId(
          headers as Record<string, string | string[] | undefined>,
        ),
      });
      if (!school.ok) return school;
      return {
        ok: true,
        context: {
          requestId: readOrCreateRequestId(
            typeof headers["x-request-id"] === "string"
              ? headers["x-request-id"]
              : undefined,
            deps.clock,
          ),
          principalId,
          tenantId: school.value.schoolId,
          credential: credential.credential,
          permissions: school.value.permissions,
          publicSchoolId: school.value.publicId,
        },
      };
    },
    tools: [
      {
        name: "products.list",
        description: "List products for the selected school",
        risk: "read",
        inputSchema: z.object({}),
        async handler({ context }) {
          const result = await listProducts(deps.db, context, context.publicSchoolId);
          if (!result.ok) return { error: result.error };
          return { items: result.value };
        },
      },
      {
        name: "products.get",
        description: "Read a product and the lesson content the caller may see",
        risk: "read",
        inputSchema: z.object({ productId: z.string() }),
        async handler({ context, args }) {
          if (!context.permissions.has("products:read")) {
            return { error: createPlatformError("forbidden") };
          }
          const parsed = args as { productId: string };
          const result = await getProduct(
            deps.db,
            { schoolId: context.tenantId!, publicId: context.publicSchoolId },
            parsed.productId,
            { kind: "admin" },
          );
          if (!result.ok) return { error: result.error };
          return result.value;
        },
      },
      {
        name: "products.create",
        description: "Create a product",
        risk: "write",
        inputSchema: createProductBodySchema,
        async handler({ context, args }) {
          const parsed = args as {
            kind: "course" | "download";
            title: string;
            slug?: string;
            description: string;
          };
          const result = await createProduct(
            deps.db,
            context,
            context.publicSchoolId,
            parsed,
            deps.clock,
          );
          if (!result.ok) return { error: result.error };
          return result.value;
        },
      },
      {
        name: "products.update",
        description: "Update a product",
        risk: "write",
        inputSchema: updateProductBodySchema.extend({
          productId: z.string(),
        }),
        async handler({ context, args }) {
          const parsed = args as {
            productId: string;
            status?: "draft" | "published";
            slug?: string;
            title?: string;
            description?: string;
          };
          const result = await updateProduct(
            deps.db,
            context,
            context.publicSchoolId,
            parsed.productId,
            parsed,
            deps.clock,
          );
          if (!result.ok) return { error: result.error };
          return result.value;
        },
      },
      {
        name: "products.delete",
        description: "Delete a product",
        risk: "destructive",
        inputSchema: z.object({
          productId: z.string(),
          confirm: z.boolean().optional(),
        }),
        async handler({ context, args }) {
          const parsed = args as { productId: string };
          const result = await deleteProduct(
            deps.db,
            context,
            parsed.productId,
            deps.clock,
          );
          if (!result.ok) return { error: result.error };
          return result.value;
        },
      },
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
          const result = await listMedia(
            deps.db,
            context,
            context.publicSchoolId,
            parsed,
          );
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
          const result = await updateContact(
            deps.db,
            context,
            contactId,
            body,
            deps.clock,
          );
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
    ],
  });
}
