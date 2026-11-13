---
title: MCP server
description: Connect Claude, ChatGPT, Cursor or another MCP client to your school so an assistant can manage it, and learn how the connection is authenticated.
nav_order: 90
---

CourseLit runs a remote **MCP** (Model Context Protocol) server. An assistant that connects to it can build courses, set up pricing, grant learner access, manage contacts and edit the school website, using the same operations as the [REST API](/docs/developers).

The server address is the API host followed by `/mcp`. On CourseLit's hosted service that is `https://api.courselit.app/mcp`. The admin shows the exact address for your deployment.

The server speaks Streamable HTTP and is stateless, so there are no sessions to keep alive. Each request is authenticated and handled on its own.

## Connect an assistant

<Steps>

<Step>

### Copy the CourseLit address

In the admin, open **Settings** and choose the **AI assistants** tab. Copy the **CourseLit address** shown there.

</Step>

<Step>

### Add it to your assistant

In the assistant, add a remote or custom MCP server and paste the address.

| Assistant | Where to add it |
| --- | --- |
| Claude | **Settings**, **Connectors**, then add a custom connector |
| ChatGPT | **Settings**, **Connectors**, then add a new connector |
| Cursor | **Settings**, **MCP**, then add a new server, with the address as the server URL |
| Another client | Add a remote MCP server with the address |

</Step>

<Step>

### Sign in with CourseLit

The assistant opens a CourseLit sign-in page. Sign in and approve access. The assistant then appears under **Connected assistants** in the same tab.

</Step>

<Step>

### Check which school it uses

The assistant acts on the school that is selected in your admin. Use the school switcher in the admin sidebar to change it, and select the school before you ask the assistant to work on it.

</Step>

</Steps>

To stop an assistant, choose **Disconnect** next to it in **Connected assistants**. Access ends straight away. Anything the assistant already created stays.

## How the connection is authenticated

The server accepts the same two credentials as the REST API. See [Authentication](/docs/developers/authentication).

- **OAuth.** The default for assistants. The client discovers the authorization server from the server's protected-resource metadata at `/.well-known/oauth-protected-resource/mcp`, registers itself, and sends you to sign in. An unauthenticated request gets a `401` with a `WWW-Authenticate` header that points to that metadata. The assistant works with your permissions in the school, limited to the scopes it was granted. The scopes are `data:read` and `data:write`, see [Permissions and scopes](/docs/developers/permissions-and-scopes).
- **API key.** For clients that cannot complete a browser sign-in. The school owner creates a key under **Settings**, **API keys**, and the client sends it in the `x-api-key` header. The key fixes the school and carries its own permissions.

Browser session cookies are not accepted on the MCP endpoint.

<Callout type="warning" title="An assistant can change your school">

An assistant can create, edit and publish content with the permissions of whoever connected it. Connect it with an account that has only the permissions it needs, or use an API key with a limited set of permissions. Tools that delete data, publish, email contacts or change payment or access settings ask for explicit confirmation, see [MCP tools](/docs/developers/mcp-tools).

</Callout>

## Call the server directly

You can test the server without an assistant. This request lists the server's tools. It uses an API key and the JSON-RPC format of MCP.

```bash
curl -X POST "$COURSELIT_API_URL/mcp" \
  -H "x-api-key: $COURSELIT_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

Call a tool with `tools/call`. The tool name goes in `name` and its input in `arguments`.

```bash
curl -X POST "$COURSELIT_API_URL/mcp" \
  -H "x-api-key: $COURSELIT_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "list_sections",
      "arguments": { "productId": "prd_0190c0de0000700080000000000000a1" }
    }
  }'
```

The result of a successful call is in `result.structuredContent`.

When a tool fails, the call itself still succeeds at the protocol level. The result has `isError` set to true, and `structuredContent` holds the same `code`, `message` and `details` as a [REST error](/docs/developers/errors), so the assistant can correct its call.

If you pass an API key and an OAuth token together, the request is rejected, as on REST.

## Limits

- Every call acts on one school. Listing or creating schools stays in the admin or REST.
- Tools cannot upload files. A file upload needs a browser or REST client that can send the bytes. An assistant can use files that are already in the media library.
- Request bodies are limited to 32 KB, as on REST.
- Things that only make sense in a browser, such as learner sign-in and checkout, API key management, team administration and plan billing, are not tools.
