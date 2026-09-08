import { contract } from "@courselit/api-contract";
import { generateOpenApi } from "@ts-rest/open-api";

export function createOpenApiDocument(publicApiUrl: string) {
  return generateOpenApi(contract, {
    info: {
      title: "CourseLit API",
      version: "1.0.0",
    },
    servers: [{ url: publicApiUrl }],
  });
}
