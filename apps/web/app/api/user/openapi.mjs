const permissions = [
    "course:manage",
    "course:manage_any",
    "course:publish",
    "course:enroll",
    "media:manage",
    "site:manage",
    "setting:manage",
    "user:manage",
    "community:post",
    "community:comment",
    "community:manage",
];

export const userApiOpenApi = {
    tags: [
        {
            name: "Users",
            description:
                "Create and update users programmatically with an API key.",
        },
    ],
    paths: {
        "/api/user": {
            post: {
                tags: ["Users"],
                summary: "Create a user",
                description:
                    "Creates a user in the current school. Provide the school domain in the `domain` header and authenticate with `x-api-key`. The legacy `apikey` field in the request body is still accepted for backward compatibility.",
                operationId: "createUser",
                security: [
                    {
                        ApiKeyAuth: [],
                    },
                ],
                parameters: [
                    {
                        $ref: "#/components/parameters/DomainHeader",
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/CreateUserRequest",
                            },
                            examples: {
                                basic: {
                                    summary: "Create a subscribed user",
                                    value: {
                                        email: "student@example.com",
                                        name: "Student Example",
                                        permissions: ["community:post"],
                                        subscribedToUpdates: true,
                                    },
                                },
                                legacy: {
                                    summary: "Legacy body API key support",
                                    value: {
                                        apikey: "legacy-api-key",
                                        email: "student@example.com",
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: "User created successfully.",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/UserMutationSuccess",
                                },
                                examples: {
                                    success: {
                                        value: {
                                            email: "5d41402abc4b2a76b9719d911017c592",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    400: {
                        description: "Bad request or user already exists.",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                                examples: {
                                    badRequest: {
                                        value: {
                                            message: "Bad request",
                                        },
                                    },
                                    duplicate: {
                                        value: {
                                            error: "User already exists",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    401: {
                        description: "Invalid API key.",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                                examples: {
                                    unauthorized: {
                                        value: {
                                            message: "Unauthorized",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    404: {
                        description: "Domain not found.",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                                examples: {
                                    domainNotFound: {
                                        value: {
                                            message: "Domain not found",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    500: {
                        description: "Internal server error.",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                                examples: {
                                    serverError: {
                                        value: {
                                            error: "Internal server error",
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            patch: {
                tags: ["Users"],
                summary: "Update a user",
                description:
                    "Updates a user in the current school. Provide the school domain in the `domain` header and authenticate with `x-api-key`. The legacy `apikey` field in the request body is still accepted for backward compatibility.",
                operationId: "updateUser",
                security: [
                    {
                        ApiKeyAuth: [],
                    },
                ],
                parameters: [
                    {
                        $ref: "#/components/parameters/DomainHeader",
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/UpdateUserRequest",
                            },
                            examples: {
                                updateName: {
                                    summary: "Update user profile fields",
                                    value: {
                                        email: "student@example.com",
                                        name: "Updated Student",
                                        subscribedToUpdates: false,
                                    },
                                },
                                legacy: {
                                    summary: "Legacy body API key support",
                                    value: {
                                        apikey: "legacy-api-key",
                                        email: "student@example.com",
                                        permissions: ["community:comment"],
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: "User updated successfully.",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/UserMutationSuccess",
                                },
                                examples: {
                                    success: {
                                        value: {
                                            email: "5d41402abc4b2a76b9719d911017c592",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    400: {
                        description: "Bad request.",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                                examples: {
                                    badRequest: {
                                        value: {
                                            message: "Bad request",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    401: {
                        description: "Invalid API key.",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                                examples: {
                                    unauthorized: {
                                        value: {
                                            message: "Unauthorized",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    404: {
                        description: "Domain or user not found.",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                                examples: {
                                    notFound: {
                                        value: {
                                            error: "User not found",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    500: {
                        description: "Internal server error.",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                                examples: {
                                    serverError: {
                                        value: {
                                            error: "Internal server error",
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    components: {
        parameters: {
            DomainHeader: {
                name: "domain",
                in: "header",
                required: true,
                description:
                    "The CourseLit school domain that owns the API key and target user.",
                schema: {
                    type: "string",
                    example: "school.example.com",
                },
            },
        },
        schemas: {
            CreateUserRequest: {
                type: "object",
                required: ["email"],
                properties: {
                    apikey: {
                        type: "string",
                        description:
                            "Deprecated legacy API key transport. Prefer the `x-api-key` header.",
                        deprecated: true,
                    },
                    email: {
                        type: "string",
                        format: "email",
                        description: "Email address of the user to create.",
                    },
                    name: {
                        type: "string",
                        description: "Display name for the user.",
                    },
                    permissions: {
                        type: "array",
                        description: "Permissions to assign to the user.",
                        items: {
                            type: "string",
                            enum: permissions,
                        },
                    },
                    subscribedToUpdates: {
                        type: "boolean",
                        description:
                            "Whether the user should be subscribed to marketing updates.",
                    },
                },
            },
            UpdateUserRequest: {
                type: "object",
                required: ["email"],
                properties: {
                    apikey: {
                        type: "string",
                        description:
                            "Deprecated legacy API key transport. Prefer the `x-api-key` header.",
                        deprecated: true,
                    },
                    email: {
                        type: "string",
                        format: "email",
                        description: "Email address of the user to update.",
                    },
                    name: {
                        type: "string",
                        description: "Updated display name for the user.",
                    },
                    permissions: {
                        type: "array",
                        description: "Updated permissions for the user.",
                        items: {
                            type: "string",
                            enum: permissions,
                        },
                    },
                    subscribedToUpdates: {
                        type: "boolean",
                        description:
                            "Updated marketing subscription preference for the user.",
                    },
                },
            },
            UserMutationSuccess: {
                type: "object",
                required: ["email"],
                properties: {
                    email: {
                        type: "string",
                        description: "MD5 hash of the user email.",
                        example: "5d41402abc4b2a76b9719d911017c592",
                    },
                },
            },
            ErrorResponse: {
                type: "object",
                description:
                    "Error payload returned by the CourseLit user API. Depending on the code path, the message may appear in `message` or `error`.",
                properties: {
                    message: {
                        type: "string",
                        description:
                            "Error message returned by validation and auth failures.",
                        example: "Bad request",
                    },
                    error: {
                        type: "string",
                        description:
                            "Error message returned by application-level failures.",
                        example: "Internal server error",
                    },
                },
            },
        },
    },
};
