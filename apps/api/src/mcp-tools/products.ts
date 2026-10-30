import { createPlatformError } from "@codelitdev/platform";
import {
  createProductBodySchema,
  updateProductBodySchema,
} from "@courselit/api-contract";
import { z } from "zod";
import { getProduct } from "../catalog.js";
import {
  createProduct,
  deleteProduct,
  listProducts,
  updateProduct,
} from "../products.js";
import type { McpToolModule } from "./context.js";

export const productTools: McpToolModule = (deps) => [
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
];
