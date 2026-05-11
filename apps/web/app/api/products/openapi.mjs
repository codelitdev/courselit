const errorResponse = {
    type: "object",
    properties: {
        error: {
            type: "object",
            properties: {
                code: { type: "string" },
                message: { type: "string" },
            },
            required: ["code", "message"],
        },
    },
    required: ["error"],
};

const productIdParam = {
    name: "productId",
    in: "path",
    required: true,
    schema: { type: "string" },
};

const planIdParam = {
    name: "planId",
    in: "path",
    required: true,
    schema: { type: "string" },
};

const sectionIdParam = {
    name: "sectionId",
    in: "path",
    required: true,
    schema: { type: "string" },
};

const lessonIdParam = {
    name: "lessonId",
    in: "path",
    required: true,
    schema: { type: "string" },
};

const userIdParam = {
    name: "userId",
    in: "path",
    required: true,
    schema: { type: "string" },
};

function jsonBody(schema, example) {
    return {
        required: true,
        content: {
            "application/json": {
                schema,
                ...(example ? { example } : {}),
            },
        },
    };
}

function jsonResponse(schemaRef, description = "Success.") {
    return {
        description,
        content: {
            "application/json": {
                schema:
                    typeof schemaRef === "string"
                        ? { $ref: schemaRef }
                        : schemaRef,
            },
        },
    };
}

function error(statusDescription) {
    return {
        description: statusDescription,
        content: {
            "application/json": {
                schema: { $ref: "#/components/schemas/PublicApiErrorResponse" },
            },
        },
    };
}

const secured = [{ ApiKeyAuth: [] }];

const supportedLessonTypes = [
    "text",
    "video",
    "audio",
    "pdf",
    "file",
    "embed",
    "quiz",
];

const lessonContentSchema = {
    oneOf: [
        { $ref: "#/components/schemas/TiptapDocument" },
        { $ref: "#/components/schemas/EmbedContent" },
        { $ref: "#/components/schemas/QuizContent" },
    ],
    description:
        "`text` lessons use `TiptapDocument`; `embed` lessons use `EmbedContent`; `quiz` lessons use `QuizContent`. Media-backed lessons (`video`, `audio`, `pdf`, `file`) use `media` instead of `content`.",
};

const productCreateExample = {
    title: "AI Foundations",
    type: "course",
};

const productUpdateExample = {
    title: "AI Foundations",
    slug: "ai-foundations",
    description: JSON.stringify({
        type: "doc",
        content: [
            {
                type: "paragraph",
                content: [
                    {
                        type: "text",
                        text: "Updated course description.",
                    },
                ],
            },
        ],
    }),
    published: false,
    privacy: "unlisted",
    tags: ["ai", "beginner"],
};

const paymentPlanCreateExample = {
    name: "Lifetime access",
    type: "onetime",
    oneTimeAmount: 9900,
    description: "One-time payment for lifetime product access.",
};

const paymentPlanUpdateExample = {
    name: "Updated lifetime access",
    oneTimeAmount: 12900,
    description: "Updated one-time payment plan.",
};

const sectionCreateExample = {
    name: "Getting started",
};

const sectionUpdateExample = {
    name: "Updated getting started",
    drip: {
        status: true,
        type: "relative-date",
        delayInMillis: 2,
    },
};

const lessonCreateExample = {
    title: "Introduction to AI",
    type: "text",
    groupId: "section_abc123",
    content: {
        type: "doc",
        content: [
            {
                type: "paragraph",
                content: [{ type: "text", text: "Welcome to the course!" }],
            },
        ],
    },
    requiresEnrollment: true,
    published: false,
};

const lessonUpdateExample = {
    title: "Updated Introduction to AI",
    published: true,
};

export const productsApiOpenApi = {
    tags: [
        {
            name: "Products",
            description:
                "Create, read, update, and delete products through the public REST API.",
        },
        {
            name: "Product Payment Plans",
            description:
                "Manage payment plans for course and download products.",
        },
        {
            name: "Product Content",
            description: "Manage sections and lessons within a product.",
        },
        {
            name: "Product Customers",
            description:
                "Enroll customers and read enrollment/progress snapshots.",
        },
    ],
    paths: {
        "/api/products": {
            get: {
                tags: ["Products"],
                summary: "List products",
                operationId: "listProducts",
                security: secured,
                parameters: [
                    {
                        name: "type",
                        in: "query",
                        schema: {
                            type: "string",
                            enum: ["course", "download", "blog"],
                        },
                    },
                    {
                        name: "published",
                        in: "query",
                        schema: { type: "boolean" },
                    },
                    { name: "search", in: "query", schema: { type: "string" } },
                    {
                        name: "page",
                        in: "query",
                        schema: { type: "integer", default: 1, minimum: 1 },
                    },
                    {
                        name: "limit",
                        in: "query",
                        schema: {
                            type: "integer",
                            default: 50,
                            minimum: 1,
                            maximum: 200,
                        },
                    },
                ],
                responses: {
                    200: jsonResponse(
                        "#/components/schemas/ProductListResponse",
                        "Products returned successfully.",
                    ),
                    401: error("Invalid API key."),
                },
            },
            post: {
                tags: ["Products"],
                summary: "Create a draft product",
                operationId: "createProduct",
                security: secured,
                requestBody: jsonBody(
                    {
                        $ref: "#/components/schemas/ProductCreateRequest",
                    },
                    productCreateExample,
                ),
                responses: {
                    201: jsonResponse("#/components/schemas/Product"),
                    400: error("Unsupported or invalid product field."),
                    422: error("Product could not be created."),
                },
            },
        },
        "/api/products/{productId}": {
            get: {
                tags: ["Products"],
                summary: "Get a product",
                operationId: "getProduct",
                security: secured,
                parameters: [productIdParam],
                responses: {
                    200: jsonResponse("#/components/schemas/Product"),
                    404: error("Product not found."),
                },
            },
            patch: {
                tags: ["Products"],
                summary: "Update product metadata",
                operationId: "updateProduct",
                security: secured,
                parameters: [productIdParam],
                requestBody: jsonBody(
                    {
                        $ref: "#/components/schemas/ProductUpdateRequest",
                    },
                    productUpdateExample,
                ),
                responses: {
                    200: jsonResponse("#/components/schemas/Product"),
                    400: error(
                        "Malformed JSON body, non-object body, or unsupported product field.",
                    ),
                    422: error("Product could not be updated."),
                },
            },
            delete: {
                tags: ["Products"],
                summary: "Delete a product",
                operationId: "deleteProduct",
                security: secured,
                parameters: [productIdParam],
                responses: {
                    200: jsonResponse("#/components/schemas/OkResponse"),
                    422: error("Product could not be deleted."),
                },
            },
        },
        "/api/products/{productId}/payment-plans": {
            get: {
                tags: ["Product Payment Plans"],
                summary: "List product payment plans",
                operationId: "listProductPaymentPlans",
                security: secured,
                parameters: [productIdParam],
                responses: {
                    200: jsonResponse(
                        "#/components/schemas/PaymentPlanListResponse",
                    ),
                    422: error("Payment plans could not be fetched."),
                },
            },
            post: {
                tags: ["Product Payment Plans"],
                summary: "Create a product payment plan",
                operationId: "createProductPaymentPlan",
                security: secured,
                parameters: [productIdParam],
                requestBody: jsonBody(
                    {
                        $ref: "#/components/schemas/PaymentPlanCreateRequest",
                    },
                    paymentPlanCreateExample,
                ),
                responses: {
                    201: jsonResponse("#/components/schemas/PaymentPlan"),
                    400: error("Unsupported payment plan field."),
                    422: error("Payment plan validation failed."),
                },
            },
        },
        "/api/products/{productId}/payment-plans/{planId}": {
            get: {
                tags: ["Product Payment Plans"],
                summary: "Get a product payment plan",
                operationId: "getProductPaymentPlan",
                security: secured,
                parameters: [productIdParam, planIdParam],
                responses: {
                    200: jsonResponse("#/components/schemas/PaymentPlan"),
                    404: error("Payment plan not found."),
                },
            },
            patch: {
                tags: ["Product Payment Plans"],
                summary: "Update a product payment plan",
                operationId: "updateProductPaymentPlan",
                security: secured,
                parameters: [productIdParam, planIdParam],
                requestBody: jsonBody(
                    {
                        $ref: "#/components/schemas/PaymentPlanUpdateRequest",
                    },
                    paymentPlanUpdateExample,
                ),
                responses: {
                    200: jsonResponse("#/components/schemas/PaymentPlan"),
                    400: error("Unsupported payment plan field."),
                    422: error("Payment plan validation failed."),
                },
            },
            delete: {
                tags: ["Product Payment Plans"],
                summary: "Archive a product payment plan",
                operationId: "archiveProductPaymentPlan",
                security: secured,
                parameters: [productIdParam, planIdParam],
                responses: {
                    200: jsonResponse("#/components/schemas/PaymentPlan"),
                    422: error("Payment plan could not be archived."),
                },
            },
        },
        "/api/products/{productId}/payment-plans/{planId}/default": {
            post: {
                tags: ["Product Payment Plans"],
                summary: "Set the default product payment plan",
                operationId: "setDefaultProductPaymentPlan",
                security: secured,
                parameters: [productIdParam, planIdParam],
                responses: {
                    200: jsonResponse("#/components/schemas/PaymentPlan"),
                    422: error("Default plan could not be changed."),
                },
            },
        },
        "/api/products/{productId}/sections": {
            get: {
                tags: ["Product Content"],
                summary: "List product sections",
                operationId: "listProductSections",
                security: secured,
                parameters: [productIdParam],
                responses: {
                    200: jsonResponse(
                        "#/components/schemas/SectionListResponse",
                    ),
                    404: error("Product not found."),
                },
            },
            post: {
                tags: ["Product Content"],
                summary: "Create a product section",
                operationId: "createProductSection",
                security: secured,
                parameters: [productIdParam],
                requestBody: jsonBody(
                    {
                        $ref: "#/components/schemas/SectionCreateRequest",
                    },
                    sectionCreateExample,
                ),
                responses: {
                    201: jsonResponse("#/components/schemas/Section"),
                    422: error("Section could not be created."),
                },
            },
        },
        "/api/products/{productId}/sections/{sectionId}": {
            patch: {
                tags: ["Product Content"],
                summary: "Update a product section",
                operationId: "updateProductSection",
                security: secured,
                parameters: [productIdParam, sectionIdParam],
                requestBody: jsonBody(
                    {
                        $ref: "#/components/schemas/SectionUpdateRequest",
                    },
                    sectionUpdateExample,
                ),
                responses: {
                    200: jsonResponse("#/components/schemas/Section"),
                    400: error(
                        "Unsupported section field or invalid drip configuration.",
                    ),
                    422: error("Section could not be updated."),
                },
            },
            delete: {
                tags: ["Product Content"],
                summary: "Delete a product section",
                operationId: "deleteProductSection",
                security: secured,
                parameters: [productIdParam, sectionIdParam],
                responses: {
                    200: jsonResponse("#/components/schemas/OkResponse"),
                    422: error("Section could not be deleted."),
                },
            },
        },
        "/api/products/{productId}/sections/reorder": {
            post: {
                tags: ["Product Content"],
                summary: "Reorder product sections",
                operationId: "reorderProductSections",
                security: secured,
                parameters: [productIdParam],
                requestBody: jsonBody({
                    type: "object",
                    properties: {
                        sectionIds: {
                            type: "array",
                            items: { type: "string" },
                        },
                    },
                    required: ["sectionIds"],
                }),
                responses: {
                    200: jsonResponse("#/components/schemas/OkResponse"),
                    422: error("Sections could not be reordered."),
                },
            },
        },
        "/api/products/{productId}/lessons": {
            get: {
                tags: ["Product Content"],
                summary: "List product lessons",
                operationId: "listProductLessons",
                security: secured,
                parameters: [productIdParam],
                responses: {
                    200: jsonResponse(
                        "#/components/schemas/LessonListResponse",
                    ),
                    404: error("Product not found."),
                },
            },
            post: {
                tags: ["Product Content"],
                summary: "Create a product lesson",
                description:
                    "Creates a lesson. `text` lessons accept Tiptap/ProseMirror JSON in `content`; `embed` lessons accept `{ value }` in `content`; `quiz` lessons accept quiz JSON in `content`; media-backed lessons (`video`, `audio`, `pdf`, `file`) use `media`. SCORM lessons are not supported.",
                operationId: "createProductLesson",
                security: secured,
                parameters: [productIdParam],
                requestBody: jsonBody(
                    { $ref: "#/components/schemas/LessonCreateRequest" },
                    lessonCreateExample,
                ),
                responses: {
                    201: jsonResponse("#/components/schemas/Lesson"),
                    422: error(
                        "SCORM lessons are not supported, or lesson validation failed.",
                    ),
                },
            },
        },
        "/api/products/{productId}/lessons/{lessonId}": {
            get: {
                tags: ["Product Content"],
                summary: "Get a product lesson",
                operationId: "getProductLesson",
                security: secured,
                parameters: [productIdParam, lessonIdParam],
                responses: {
                    200: jsonResponse("#/components/schemas/Lesson"),
                    404: error("Lesson not found."),
                },
            },
            patch: {
                tags: ["Product Content"],
                summary: "Update a product lesson",
                description:
                    "Updates editable lesson fields. Lesson type and section cannot be changed after creation. Use the same content/media shapes documented on create. SCORM lesson updates are rejected with `not_supported`.",
                operationId: "updateProductLesson",
                security: secured,
                parameters: [productIdParam, lessonIdParam],
                requestBody: jsonBody(
                    { $ref: "#/components/schemas/LessonUpdateRequest" },
                    lessonUpdateExample,
                ),
                responses: {
                    200: jsonResponse("#/components/schemas/Lesson"),
                    422: error(
                        "SCORM lessons are not supported, or lesson validation failed.",
                    ),
                },
            },
            delete: {
                tags: ["Product Content"],
                summary: "Delete a product lesson",
                operationId: "deleteProductLesson",
                security: secured,
                parameters: [productIdParam, lessonIdParam],
                responses: {
                    200: jsonResponse("#/components/schemas/OkResponse"),
                    422: error("Lesson could not be deleted."),
                },
            },
        },
        "/api/products/{productId}/lessons/{lessonId}/move": {
            post: {
                tags: ["Product Content"],
                summary: "Move a lesson to another section",
                operationId: "moveProductLesson",
                security: secured,
                parameters: [productIdParam, lessonIdParam],
                requestBody: jsonBody({
                    type: "object",
                    properties: {
                        destinationSectionId: { type: "string" },
                        destinationIndex: { type: "integer" },
                    },
                    required: ["destinationSectionId", "destinationIndex"],
                }),
                responses: {
                    200: jsonResponse("#/components/schemas/OkResponse"),
                    422: error("Lesson could not be moved."),
                },
            },
        },
        "/api/products/{productId}/customers": {
            get: {
                tags: ["Product Customers"],
                summary: "List product customers",
                operationId: "listProductCustomers",
                security: secured,
                parameters: [
                    productIdParam,
                    {
                        name: "search",
                        in: "query",
                        description: "Search customers by name or email.",
                        schema: { type: "string" },
                    },
                    {
                        name: "page",
                        in: "query",
                        schema: { type: "integer", default: 1, minimum: 1 },
                    },
                    {
                        name: "limit",
                        in: "query",
                        schema: {
                            type: "integer",
                            default: 50,
                            minimum: 1,
                            maximum: 200,
                        },
                    },
                ],
                responses: {
                    200: jsonResponse(
                        "#/components/schemas/CustomerListResponse",
                    ),
                },
            },
        },
        "/api/products/{productId}/customers/invitations": {
            post: {
                tags: ["Product Customers"],
                summary: "Invite a customer",
                description:
                    "Invites a customer by email. An invitation email is sent to the provided address.",
                operationId: "inviteProductCustomer",
                security: secured,
                parameters: [productIdParam],
                requestBody: jsonBody({
                    type: "object",
                    properties: {
                        email: { type: "string", format: "email" },
                        tags: { type: "array", items: { type: "string" } },
                    },
                    required: ["email"],
                }),
                responses: {
                    201: jsonResponse("#/components/schemas/Customer"),
                    400: error(
                        "Unsupported customer invitation field or missing email.",
                    ),
                    422: error("Customer could not be invited."),
                },
            },
        },
        "/api/products/{productId}/customers/{userId}/progress": {
            get: {
                tags: ["Product Customers"],
                summary: "Get product customer progress",
                description:
                    "Returns customer progress details including completed lessons.",
                operationId: "getProductCustomerProgress",
                security: secured,
                parameters: [productIdParam, userIdParam],
                responses: {
                    200: jsonResponse("#/components/schemas/Progress"),
                    404: error("Customer progress not found."),
                },
            },
        },
    },
    components: {
        schemas: {
            PublicApiErrorResponse: errorResponse,
            OkResponse: {
                type: "object",
                properties: { ok: { type: "boolean" } },
            },
            PaymentPlan: {
                type: "object",
                properties: {
                    planId: { type: "string" },
                    name: { type: "string" },
                    type: {
                        type: "string",
                        enum: ["free", "onetime", "emi", "subscription"],
                    },
                    entityId: { type: "string" },
                    entityType: { type: "string" },
                    oneTimeAmount: { type: "number" },
                    emiAmount: { type: "number" },
                    emiTotalInstallments: { type: "number" },
                    subscriptionMonthlyAmount: { type: "number" },
                    subscriptionYearlyAmount: { type: "number" },
                    description: { type: "string" },
                    isDefault: { type: "boolean" },
                },
            },
            PaymentPlanCreateRequest: {
                type: "object",
                description:
                    "Create a product-owned payment plan. `onetime` requires `oneTimeAmount`; `emi` requires `emiAmount` and `emiTotalInstallments`; `subscription` requires exactly one of `subscriptionMonthlyAmount` or `subscriptionYearlyAmount`.",
                required: ["name", "type"],
                properties: {
                    name: {
                        type: "string",
                        description: "Payment plan name shown to customers.",
                    },
                    type: {
                        type: "string",
                        enum: ["free", "onetime", "emi", "subscription"],
                    },
                    oneTimeAmount: {
                        type: "number",
                        description: "Required when `type` is `onetime`.",
                    },
                    emiAmount: {
                        type: "number",
                        description: "Required when `type` is `emi`.",
                    },
                    emiTotalInstallments: {
                        type: "number",
                        description: "Required when `type` is `emi`.",
                    },
                    subscriptionMonthlyAmount: {
                        type: "number",
                        description:
                            "Use for monthly subscriptions. For `subscription`, provide exactly one subscription amount.",
                    },
                    subscriptionYearlyAmount: {
                        type: "number",
                        description:
                            "Use for yearly subscriptions. For `subscription`, provide exactly one subscription amount.",
                    },
                    description: { type: "string" },
                },
            },
            PaymentPlanUpdateRequest: {
                type: "object",
                description: "Update editable payment plan fields.",
                properties: {
                    name: {
                        type: "string",
                        description: "Payment plan name shown to customers.",
                    },
                    type: {
                        type: "string",
                        enum: ["free", "onetime", "emi", "subscription"],
                    },
                    oneTimeAmount: {
                        type: "number",
                        description: "Required when `type` is `onetime`.",
                    },
                    emiAmount: {
                        type: "number",
                        description: "Required when `type` is `emi`.",
                    },
                    emiTotalInstallments: {
                        type: "number",
                        description: "Required when `type` is `emi`.",
                    },
                    subscriptionMonthlyAmount: {
                        type: "number",
                        description:
                            "Use for monthly subscriptions. For `subscription`, provide exactly one subscription amount.",
                    },
                    subscriptionYearlyAmount: {
                        type: "number",
                        description:
                            "Use for yearly subscriptions. For `subscription`, provide exactly one subscription amount.",
                    },
                    description: { type: "string" },
                },
            },
            PaymentPlanListResponse: {
                type: "object",
                properties: {
                    data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/PaymentPlan" },
                    },
                },
            },
            Product: {
                type: "object",
                properties: {
                    productId: { type: "string" },
                    type: {
                        type: "string",
                        enum: ["course", "download", "blog"],
                    },
                    title: { type: "string" },
                    slug: { type: "string" },
                    description: { type: "string" },
                    published: { type: "boolean" },
                    privacy: { type: "string" },
                    tags: { type: "array", items: { type: "string" } },
                    featuredImage: { type: "object" },
                    pageId: { type: "string" },
                    defaultPaymentPlan: { type: "string" },
                    paymentPlans: {
                        type: "array",
                        items: { $ref: "#/components/schemas/PaymentPlan" },
                    },
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" },
                },
            },
            ProductCreateRequest: {
                type: "object",
                required: ["title", "type"],
                description:
                    "Payload for creating a draft product. Send `title` and `type`. After creation, use the update endpoint for metadata, publish, and privacy changes.",
                properties: {
                    title: {
                        type: "string",
                        description: "Product title shown in CourseLit.",
                        example: "AI Foundations",
                    },
                    type: {
                        type: "string",
                        enum: ["course", "download", "blog"],
                        description:
                            "CourseLit product type. Use `course` for lesson-based learning products.",
                        example: "course",
                    },
                },
            },
            ProductUpdateRequest: {
                type: "object",
                description:
                    "Payload for updating product metadata. A product must have at least one payment plan before it can be published.",
                properties: {
                    title: {
                        type: "string",
                        description: "Product title shown in CourseLit.",
                        example: "AI Foundations",
                    },
                    slug: {
                        type: "string",
                        description: "Optional URL slug.",
                        example: "ai-foundations",
                    },
                    description: {
                        type: "string",
                        description:
                            'Optional product/blog description. Send this as a JSON-stringified Tiptap/ProseMirror document, for example `JSON.stringify({ type: "doc", content: [] })`. Do not use a `content` field on this endpoint.',
                        example: JSON.stringify({
                            type: "doc",
                            content: [
                                {
                                    type: "paragraph",
                                    content: [
                                        {
                                            type: "text",
                                            text: "Updated course description.",
                                        },
                                    ],
                                },
                            ],
                        }),
                    },
                    published: {
                        type: "boolean",
                        description:
                            "Whether the product is published. Existing CourseLit publishing checks still apply.",
                        example: false,
                    },
                    privacy: {
                        type: "string",
                        description:
                            "Existing CourseLit product privacy value.",
                        example: "unlisted",
                    },
                    tags: { type: "array", items: { type: "string" } },
                    featuredImage: { type: "object" },
                },
            },
            ProductListResponse: {
                type: "object",
                properties: {
                    data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Product" },
                    },
                    pagination: {
                        type: "object",
                        properties: {
                            page: { type: "integer" },
                            limit: { type: "integer" },
                        },
                    },
                },
            },
            Section: {
                type: "object",
                properties: {
                    sectionId: { type: "string" },
                    name: { type: "string" },
                    rank: { type: "number" },
                    collapsed: { type: "boolean" },
                    drip: { $ref: "#/components/schemas/SectionDrip" },
                    lessonsOrder: {
                        type: "array",
                        items: { type: "string" },
                    },
                },
            },
            SectionCreateRequest: {
                type: "object",
                required: ["name"],
                description:
                    "Payload for creating a section. Requires only `name`.",
                properties: {
                    name: { type: "string" },
                },
            },
            SectionUpdateRequest: {
                type: "object",
                description:
                    "Payload for updating a section. Supports updating `name` and scheduled release (`drip`) settings.",
                properties: {
                    name: { type: "string" },
                    drip: { $ref: "#/components/schemas/SectionDripInput" },
                },
            },
            SectionDripInput: {
                type: "object",
                properties: {
                    type: {
                        type: "string",
                        enum: ["relative-date", "exact-date"],
                    },
                    status: { type: "boolean" },
                    delayInMillis: {
                        type: "number",
                        description:
                            "Delay in milliseconds for `relative-date` drip. The input accepts a number interpreted as days (e.g. 3 = three days), but the value is persisted in millisecond equivalent (e.g. 259200000). The endpoint output always returns the stored millisecond value.",
                    },
                    dateInUTC: {
                        type: "number",
                        description:
                            "UNIX timestamp in milliseconds for `exact-date` drip. Both input and output use millisecond precision.",
                    },
                },
            },
            SectionDrip: {
                $ref: "#/components/schemas/SectionDripInput",
            },
            SectionListResponse: {
                type: "object",
                properties: {
                    data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Section" },
                    },
                },
            },
            TiptapDocument: {
                type: "object",
                description:
                    "Tiptap/ProseMirror document JSON used by `text` lessons.",
                required: ["type", "content"],
                properties: {
                    type: { type: "string", example: "doc" },
                    content: { type: "array", items: { type: "object" } },
                },
            },
            EmbedContent: {
                type: "object",
                description:
                    "Embed content for `embed` lessons. The value can be a supported video URL or iframe/embed code, matching the dashboard Embed lesson field.",
                required: ["value"],
                properties: {
                    value: {
                        type: "string",
                        example: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                    },
                },
            },
            QuizContent: {
                type: "object",
                description: "Quiz content for `quiz` lesson type.",
                required: ["questions", "requiresPassingGrade", "passingGrade"],
                properties: {
                    questions: {
                        type: "array",
                        description: "List of quiz questions.",
                        items: {
                            type: "object",
                            required: ["text", "options"],
                            properties: {
                                text: {
                                    type: "string",
                                    description: "Question text.",
                                },
                                options: {
                                    type: "array",
                                    description:
                                        "Answer options. Exactly one option should have `correctAnswer: true` for single-choice; multiple for multiple-choice.",
                                    items: {
                                        type: "object",
                                        required: ["text"],
                                        properties: {
                                            text: {
                                                type: "string",
                                                description: "Option text.",
                                            },
                                            correctAnswer: {
                                                type: "boolean",
                                                description:
                                                    "Whether this is the correct answer. Stripped from student-facing responses.",
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    requiresPassingGrade: {
                        type: "boolean",
                        description:
                            "Whether a minimum score is required to pass.",
                    },
                    passingGrade: {
                        type: "number",
                        description:
                            "Score threshold (0–100) when `requiresPassingGrade` is true.",
                    },
                },
            },
            LessonMedia: {
                type: "object",
                description:
                    "Media object used by `video`, `audio`, `pdf`, and `file` lessons. Use `/api/media/presigned` to upload to MediaLit first, then send the resulting media metadata here.",
                required: ["mediaId"],
                properties: {
                    mediaId: { type: "string" },
                    originalFileName: { type: "string" },
                    mimeType: { type: "string" },
                    size: { type: "number" },
                    access: {
                        type: "string",
                        enum: ["public", "private"],
                    },
                    file: {
                        type: "string",
                        description:
                            "Public file URL when available. Private media may omit this field.",
                    },
                    thumbnail: { type: "string" },
                    caption: { type: "string" },
                },
            },
            Lesson: {
                type: "object",
                properties: {
                    lessonId: { type: "string" },
                    title: { type: "string" },
                    type: {
                        type: "string",
                        enum: supportedLessonTypes,
                    },
                    content: lessonContentSchema,
                    media: { $ref: "#/components/schemas/LessonMedia" },
                    downloadable: { type: "boolean" },
                    courseId: { type: "string" },
                    groupId: { type: "string" },
                    requiresEnrollment: { type: "boolean" },
                    published: { type: "boolean" },
                },
            },
            LessonCreateRequest: {
                type: "object",
                required: ["title", "type", "groupId"],
                properties: {
                    title: { type: "string" },
                    type: {
                        type: "string",
                        enum: supportedLessonTypes,
                    },
                    content: lessonContentSchema,
                    media: { $ref: "#/components/schemas/LessonMedia" },
                    downloadable: { type: "boolean" },
                    groupId: { type: "string" },
                    requiresEnrollment: { type: "boolean" },
                    published: { type: "boolean" },
                },
            },
            LessonUpdateRequest: {
                type: "object",
                properties: {
                    title: { type: "string" },
                    content: lessonContentSchema,
                    media: { $ref: "#/components/schemas/LessonMedia" },
                    downloadable: { type: "boolean" },
                    requiresEnrollment: { type: "boolean" },
                    published: { type: "boolean" },
                },
            },
            LessonListResponse: {
                type: "object",
                properties: {
                    data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Lesson" },
                    },
                },
            },
            Customer: {
                type: "object",
                properties: {
                    userId: { type: "string" },
                    email: { type: "string" },
                    name: { type: "string" },
                    avatar: { type: "object" },
                    membershipId: { type: "string" },
                    membershipStatus: { type: "string" },
                    subscriptionMethod: { type: "string" },
                    completedLessons: {
                        type: "array",
                        items: { type: "string" },
                    },
                    downloaded: { type: "boolean" },
                    enrolledAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" },
                },
            },
            ProductCustomer: {
                type: "object",
                description:
                    "Member enrollment details returned by the product customers endpoint.",
                properties: {
                    user: {
                        type: "object",
                        properties: {
                            userId: { type: "string" },
                            email: { type: "string" },
                            name: { type: "string" },
                            avatar: { type: "object" },
                        },
                    },
                    status: { type: "string" },
                    completedLessons: {
                        type: "array",
                        items: { type: "string" },
                    },
                    downloaded: { type: "boolean" },
                    subscriptionMethod: { type: "string" },
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" },
                },
            },
            CustomerListResponse: {
                type: "object",
                properties: {
                    data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/ProductCustomer" },
                    },
                    pagination: {
                        type: "object",
                        properties: {
                            page: { type: "integer" },
                            limit: { type: "integer" },
                        },
                    },
                },
            },
            Progress: {
                type: "object",
                properties: {
                    courseId: { type: "string" },
                    completedLessons: {
                        type: "array",
                        items: { type: "string" },
                    },
                    downloaded: { type: "boolean" },
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" },
                },
            },
        },
    },
};
