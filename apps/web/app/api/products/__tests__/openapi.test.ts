/**
 * @jest-environment node
 */

import { execFileSync } from "child_process";
import path from "path";
import { pathToFileURL } from "url";

function buildOpenApiRoutesForTest() {
    const openApiIndex = pathToFileURL(
        path.resolve(process.cwd(), "apps/web/openapi/index.mjs"),
    ).href;
    const output = execFileSync(
        process.execPath,
        [
            "--input-type=module",
            "-e",
            `import { buildOpenApiRoutes } from ${JSON.stringify(openApiIndex)}; console.log(JSON.stringify(buildOpenApiRoutes()));`,
        ],
        { encoding: "utf8" },
    );
    return JSON.parse(output);
}

describe("Products OpenAPI", () => {
    it("documents product list and detail routes without legacy pricing or non-actionable fields", () => {
        const routes = buildOpenApiRoutesForTest();

        expect(routes.paths["/api/products"].get).toMatchObject({
            tags: ["Products"],
            operationId: "listProducts",
        });
        expect(routes.paths["/api/products/{productId}"].get).toMatchObject({
            tags: ["Products"],
            operationId: "getProduct",
        });
        const productProperties = routes.components.schemas.Product.properties;

        expect(productProperties.productId).toBeDefined();
        expect(productProperties.paymentPlans).toBeDefined();
        expect(productProperties.cost).toBeUndefined();
        expect(productProperties.costType).toBeUndefined();
        expect(productProperties.leadMagnet).toBeUndefined();
        expect(productProperties.certificate).toBeUndefined();
    });

    it("documents a concrete product create request example", () => {
        const routes = buildOpenApiRoutesForTest();
        const createBody =
            routes.paths["/api/products"].post.requestBody.content[
                "application/json"
            ];
        const productCreateSchema =
            routes.components.schemas.ProductCreateRequest;
        const productUpdateSchema =
            routes.components.schemas.ProductUpdateRequest;
        const updateBody =
            routes.paths["/api/products/{productId}"].patch.requestBody.content[
                "application/json"
            ];

        expect(createBody.example).toMatchObject({
            title: "AI Foundations",
            type: "course",
        });
        expect(createBody.example.slug).toBeUndefined();
        expect(createBody.example.description).toBeUndefined();
        expect(createBody.example.tags).toBeUndefined();
        expect(createBody.example.published).toBeUndefined();
        expect(createBody.example.privacy).toBeUndefined();
        expect(productCreateSchema.required).toEqual(["title", "type"]);
        expect(productCreateSchema.properties.title.description).toContain(
            "Product title",
        );
        expect(productCreateSchema.properties.slug).toBeUndefined();
        expect(productCreateSchema.properties.description).toBeUndefined();
        expect(productCreateSchema.properties.tags).toBeUndefined();
        expect(productCreateSchema.properties.featuredImage).toBeUndefined();
        expect(productCreateSchema.properties.published).toBeUndefined();
        expect(productCreateSchema.properties.privacy).toBeUndefined();
        expect(productUpdateSchema.properties.published).toBeDefined();
        expect(productUpdateSchema.properties.privacy).toBeDefined();
        expect(
            productUpdateSchema.properties.description.description,
        ).toContain("JSON-stringified Tiptap");
        expect(
            JSON.parse(productUpdateSchema.properties.description.example),
        ).toMatchObject({ type: "doc" });
        expect(JSON.parse(updateBody.example.description)).toMatchObject({
            type: "doc",
        });
    });

    it("documents payment-plan, content, customer, and progress endpoints", () => {
        const routes = buildOpenApiRoutesForTest();

        expect(
            routes.paths["/api/products/{productId}/payment-plans"].post,
        ).toMatchObject({
            tags: ["Product Payment Plans"],
            operationId: "createProductPaymentPlan",
        });
        const paymentPlanCreateBody =
            routes.paths["/api/products/{productId}/payment-plans"].post
                .requestBody.content["application/json"];
        const paymentPlanUpdateBody =
            routes.paths["/api/products/{productId}/payment-plans/{planId}"]
                .patch.requestBody.content["application/json"];
        expect(paymentPlanCreateBody.schema.$ref).toBe(
            "#/components/schemas/PaymentPlanCreateRequest",
        );
        expect(paymentPlanCreateBody.example).toMatchObject({
            name: "Lifetime access",
            type: "onetime",
            oneTimeAmount: 9900,
        });
        expect(paymentPlanUpdateBody.schema.$ref).toBe(
            "#/components/schemas/PaymentPlanUpdateRequest",
        );
        expect(paymentPlanUpdateBody.example).toMatchObject({
            name: "Updated lifetime access",
            oneTimeAmount: 12900,
        });
        expect(
            routes.components.schemas.PaymentPlanCreateRequest.required,
        ).toEqual(["name", "type"]);
        expect(
            routes.components.schemas.PaymentPlanCreateRequest.properties
                .oneTimeAmount.description,
        ).toContain("onetime");
        expect(
            routes.components.schemas.PaymentPlanUpdateRequest.required,
        ).toBeUndefined();
        expect(
            routes.paths["/api/products/{productId}/sections"].post,
        ).toBeDefined();
        const sectionCreateBody =
            routes.paths["/api/products/{productId}/sections"].post.requestBody
                .content["application/json"];
        const sectionUpdateBody =
            routes.paths["/api/products/{productId}/sections/{sectionId}"].patch
                .requestBody.content["application/json"];
        expect(sectionCreateBody.schema.$ref).toBe(
            "#/components/schemas/SectionCreateRequest",
        );
        expect(sectionCreateBody.example).toEqual({
            name: "Getting started",
        });
        expect(sectionUpdateBody.schema.$ref).toBe(
            "#/components/schemas/SectionUpdateRequest",
        );
        expect(sectionUpdateBody.example).toEqual({
            name: "Updated getting started",
            drip: {
                status: true,
                type: "relative-date",
                delayInMillis: 2,
            },
        });
        expect(routes.components.schemas.SectionCreateRequest.required).toEqual(
            ["name"],
        );
        expect(
            routes.components.schemas.SectionCreateRequest.properties.collapsed,
        ).toBeUndefined();
        expect(
            routes.components.schemas.SectionUpdateRequest.properties.collapsed,
        ).toBeUndefined();
        expect(
            routes.components.schemas.SectionUpdateRequest.properties.rank,
        ).toBeUndefined();
        expect(
            routes.components.schemas.SectionUpdateRequest.properties.drip.$ref,
        ).toBe("#/components/schemas/SectionDripInput");
        expect(
            routes.components.schemas.SectionDripInput.properties.type.enum,
        ).toEqual(["relative-date", "exact-date"]);
        expect(
            routes.paths["/api/products/{productId}/lessons"].post,
        ).toMatchObject({
            tags: ["Product Content"],
            operationId: "createProductLesson",
        });
        expect(
            routes.paths["/api/products/{productId}/customers"].post,
        ).toBeUndefined();
        expect(
            routes.paths["/api/products/{productId}/customers/invitations"]
                .post,
        ).toMatchObject({
            tags: ["Product Customers"],
            operationId: "inviteProductCustomer",
        });
        expect(
            routes.paths[
                "/api/products/{productId}/customers/{userId}/progress"
            ].get,
        ).toMatchObject({
            tags: ["Product Customers"],
            operationId: "getProductCustomerProgress",
        });
        expect(
            routes.paths["/api/products/{productId}/customers/{userId}"],
        ).toBeUndefined();

        const lessonType =
            routes.components.schemas.Lesson.properties.type.enum;
        expect(lessonType).toContain("text");
        expect(lessonType).not.toContain("scorm");
        expect(
            routes.paths["/api/products/{productId}/lessons"].post.requestBody
                .content["application/json"].schema.$ref,
        ).toBe("#/components/schemas/LessonCreateRequest");
        expect(
            routes.paths["/api/products/{productId}/lessons/{lessonId}"].patch
                .requestBody.content["application/json"].schema.$ref,
        ).toBe("#/components/schemas/LessonUpdateRequest");
        expect(
            routes.components.schemas.LessonUpdateRequest.properties.type,
        ).toBeUndefined();
        expect(
            routes.components.schemas.LessonUpdateRequest.properties.groupId,
        ).toBeUndefined();
        expect(
            routes.components.schemas.LessonCreateRequest.properties.content
                .oneOf,
        ).toEqual(
            expect.arrayContaining([
                { $ref: "#/components/schemas/TiptapDocument" },
                { $ref: "#/components/schemas/EmbedContent" },
                { $ref: "#/components/schemas/QuizContent" },
            ]),
        );
        expect(
            routes.components.schemas.LessonUpdateRequest.properties.content
                .oneOf,
        ).toEqual(
            expect.arrayContaining([
                { $ref: "#/components/schemas/TiptapDocument" },
                { $ref: "#/components/schemas/EmbedContent" },
                { $ref: "#/components/schemas/QuizContent" },
            ]),
        );
        expect(routes.components.schemas.EmbedContent).toMatchObject({
            required: ["value"],
            properties: {
                value: expect.objectContaining({ type: "string" }),
            },
        });
        expect(
            routes.components.schemas.LessonCreateRequest.properties.media.$ref,
        ).toBe("#/components/schemas/LessonMedia");
        expect(
            routes.components.schemas.LessonUpdateRequest.properties.media.$ref,
        ).toBe("#/components/schemas/LessonMedia");
        expect(routes.components.schemas.LessonMedia.required).toEqual([
            "mediaId",
        ]);
        expect(
            routes.paths["/api/products/{productId}/customers"].get.parameters,
        ).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: "search", in: "query" }),
            ]),
        );
        expect(
            routes.paths["/api/products/{productId}/customers"].get.parameters,
        ).not.toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: "status", in: "query" }),
            ]),
        );
        expect(
            routes.components.schemas.CustomerListResponse.properties.data.items
                .$ref,
        ).toBe("#/components/schemas/ProductCustomer");
        expect(
            routes.components.schemas.ProductCustomer.properties.user.properties
                .email,
        ).toMatchObject({
            type: "string",
        });
        expect(
            routes.components.schemas.ProductCustomer.properties
                .completedLessons,
        ).toMatchObject({
            type: "array",
            items: { type: "string" },
        });
        expect(
            routes.components.schemas.ProductCustomer.properties.downloaded,
        ).toMatchObject({
            type: "boolean",
        });
        expect(
            routes.paths["/api/products/{productId}/lessons"].post.responses[
                "422"
            ].description,
        ).toContain("SCORM");
    });
});
