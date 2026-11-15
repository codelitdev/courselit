import { describe, expect, it } from "bun:test";
import { contract } from "@courselit/api-contract";
import { createOpenApiDocument } from "./openapi.js";

describe("CourseLit OpenAPI tags", () => {
  const document = createOpenApiDocument("https://api.example.test");

  it("declares feature groups and assigns representative routes", () => {
    expect(document.tags?.map(({ name }) => name)).toEqual([
      "System",
      "School & Team",
      "School Website",
      "Products & Courses",
      "Communities",
      "Learners",
      "Storefront & Payments",
      "Public Website",
      "Media",
      "Contacts & Marketing",
      "Platform Billing",
      "Certificates",
      "Notifications",
    ]);

    expect(document.paths["/health"]?.get?.tags).toEqual(["System"]);
    expect(document.paths["/v1/products"]?.get?.tags).toEqual(["Products & Courses"]);
    expect(document.paths["/v1/communities"]?.get?.tags).toEqual(["Communities"]);
    expect(document.paths["/v1/learner/auth/email-code/verify"]?.post?.tags).toEqual([
      "Learners",
    ]);
    expect(
      document.paths["/v1/public/{schoolId}/checkout-sessions"]?.post?.tags,
    ).toEqual(["Storefront & Payments"]);
    expect(document.paths["/v1/public/{schoolId}/site/pages"]?.get?.tags).toEqual([
      "Public Website",
    ]);
    expect(document.paths["/v1/school/website/pages"]?.get?.tags).toEqual([
      "School Website",
    ]);
  });

  it("exposes editable protocol and host server variables", () => {
    const productionDocument = createOpenApiDocument(
      "https://api.courselit.cluster.clqa.site",
    );
    expect(productionDocument.servers).toEqual([
      {
        url: "{protocol}://{host}",
        description: "API Server",
        variables: {
          protocol: { default: "https", enum: ["https", "http"] },
          host: { default: "api.courselit.cluster.clqa.site" },
        },
      },
    ]);

    const localDocument = createOpenApiDocument("http://127.0.0.1:4000");
    expect(localDocument.servers?.[0]?.variables?.protocol?.default).toBe("http");
    expect(localDocument.servers?.[0]?.variables?.host?.default).toBe("127.0.0.1:4000");
  });

  it("assigns every operation exactly one declared tag", () => {
    const declaredTags = new Set(document.tags?.map(({ name }) => name));
    const httpMethods = new Set([
      "get",
      "put",
      "post",
      "delete",
      "options",
      "head",
      "patch",
      "trace",
    ]);

    for (const pathItem of Object.values(document.paths)) {
      for (const [method, operation] of Object.entries(pathItem ?? {})) {
        if (!httpMethods.has(method)) continue;
        const tags = (operation as { tags?: string[] }).tags;
        expect(tags).toHaveLength(1);
        expect(declaredTags.has(tags?.[0] ?? "")).toBe(true);
      }
    }
  });

  it("generates request and query schemas from the zod contract", () => {
    // @ts-rest/open-api emits `{}` for schemas from an unsupported zod major
    // instead of failing, so check that real schemas come through.
    const createCommunity = document.paths["/v1/communities"]?.post as {
      requestBody?: { content: Record<string, { schema: Record<string, unknown> }> };
    };
    expect(
      createCommunity.requestBody?.content["application/json"]?.schema,
    ).toMatchObject({
      type: "object",
      properties: { name: { type: "string", minLength: 1, maxLength: 200 } },
    });

    const listCommunities = document.paths["/v1/communities"]?.get as {
      parameters?: Array<{ name: string; schema?: Record<string, unknown> }>;
    };
    for (const parameter of listCommunities.parameters ?? []) {
      expect(parameter.schema).not.toEqual({});
    }
  });
});

describe("CourseLit OpenAPI operation ids", () => {
  const document = createOpenApiDocument("https://api.example.test");
  const operations = Object.values(document.paths).flatMap((item) =>
    ["get", "post", "put", "patch", "delete"].flatMap((method) => {
      const operation = (item as Record<string, { operationId?: string } | undefined>)[
        method
      ];
      return operation ? [operation] : [];
    }),
  );

  it("names every operation after its contract key, once", () => {
    const ids = operations.map((operation) => operation.operationId);
    expect(ids.every((id) => typeof id === "string" && id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(ids)).toEqual(new Set(Object.keys(contract)));
  });

  it("uses the contract key for representative routes", () => {
    expect(document.paths["/v1/products"]?.get?.operationId).toBe(
      Object.entries(contract).find(
        ([, route]) => route.method === "GET" && route.path === "/v1/products",
      )?.[0],
    );
  });
});
