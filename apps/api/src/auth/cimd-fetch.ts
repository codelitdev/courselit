import type { ClientMetadataResourceFetch } from "@better-auth/oauth-provider";
import { fetchClientMetadataResource as fetchNodeClientMetadataResource } from "@better-auth/cimd/node";

const ignoredGrantTypesByClientMetadataUrl = new Map<string, Set<string>>([
  [
    "https://vscode.dev/oauth/client-metadata.json",
    new Set(["urn:ietf:params:oauth:grant-type:device_code"]),
  ],
  [
    "https://claude.ai/oauth/mcp-oauth-client-metadata",
    new Set(["urn:ietf:params:oauth:grant-type:jwt-bearer"]),
  ],
]);

const maximumMetadataBytes = 5 * 1024;

async function readBoundedMetadata(
  response: Response,
): Promise<Uint8Array<ArrayBuffer>> {
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array(new ArrayBuffer(0));
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximumMetadataBytes) {
        await reader.cancel();
        throw new TypeError("CIMD metadata response is too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(new ArrayBuffer(size));
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

/**
 * VS Code and Claude advertise optional grants that CourseLit's OAuth provider
 * does not implement. Keep these exceptions exact; the upstream transport and
 * provider retain their normal security and metadata validation for all clients.
 */
export const fetchClientMetadataResource: ClientMetadataResourceFetch = async (
  input,
  init,
) => {
  const response = await fetchNodeClientMetadataResource(input, init);
  const requestUrl = input instanceof Request ? input.url : String(input);
  const ignoredGrantTypes = ignoredGrantTypesByClientMetadataUrl.get(
    new URL(requestUrl).href,
  );
  if (!ignoredGrantTypes || response.status !== 200) return response;

  const body = await readBoundedMetadata(response);
  const metadata = JSON.parse(new TextDecoder().decode(body)) as {
    grant_types?: unknown;
    [key: string]: unknown;
  };
  if (!Array.isArray(metadata.grant_types)) {
    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete("content-length");
    return new Response(body, {
      headers: responseHeaders,
      status: response.status,
      statusText: response.statusText,
    });
  }

  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete("content-length");
  return new Response(
    JSON.stringify({
      ...metadata,
      grant_types: metadata.grant_types.filter(
        (grantType) =>
          typeof grantType !== "string" || !ignoredGrantTypes.has(grantType),
      ),
    }),
    {
      headers: responseHeaders,
      status: response.status,
      statusText: response.statusText,
    },
  );
};
