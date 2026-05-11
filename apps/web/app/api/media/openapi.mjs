export const mediaApiOpenApi = {
    tags: [
        {
            name: "Media Uploads",
            description:
                "Generate MediaLit signatures for direct media uploads.",
        },
    ],
    paths: {
        "/api/media/presigned": {
            post: {
                tags: ["Media Uploads"],
                summary: "Generate a MediaLit upload signature",
                description:
                    "Returns a short-lived upload signature and endpoint for direct file uploads. See `https://docs.medialit.cloud/api/uploadMedia` for the upload request format.",
                operationId: "createMediaUploadSignature",
                security: [{ ApiKeyAuth: [] }],
                responses: {
                    200: {
                        description:
                            "MediaLit upload signature generated successfully.",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/MediaPresignedResponse",
                                },
                                examples: {
                                    success: {
                                        value: {
                                            signature:
                                                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                                            endpoint:
                                                "https://media.example.com",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    401: {
                        description:
                            "Invalid API key, or no active CourseLit dashboard session was found for the dashboard-only auth path.",
                    },
                    403: {
                        description:
                            "The resolved school owner or logged-in dashboard user does not have `media:manage` permission.",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/MediaErrorResponse",
                                },
                            },
                        },
                    },
                    404: {
                        description: "Domain not found.",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/MediaErrorResponse",
                                },
                            },
                        },
                    },
                    500: {
                        description: "MediaLit signature generation failed.",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/MediaErrorResponse",
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    components: {
        schemas: {
            MediaPresignedResponse: {
                type: "object",
                required: ["signature", "endpoint"],
                properties: {
                    signature: {
                        type: "string",
                        description:
                            "MediaLit upload signature. Send this as the `x-medialit-signature` header to MediaLit.",
                    },
                    endpoint: {
                        type: "string",
                        format: "uri",
                        description:
                            "MediaLit server endpoint. Upload files directly to `${endpoint}/media/create` for multipart uploads or `${endpoint}/media/create/resumable` for TUS resumable uploads.",
                    },
                },
            },
            MediaErrorResponse: {
                type: "object",
                properties: {
                    message: {
                        type: "string",
                        example: "Domain not found",
                    },
                    error: {
                        type: "string",
                        example: "Unable to generate media signature",
                    },
                },
            },
        },
    },
};
