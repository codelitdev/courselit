---
title: Create and revoke API keys
description: Create API keys with limited permissions for your own integrations, and revoke them when they are no longer needed.
nav_order: 70
---

An API key lets your own scripts and tools use the CourseLit API and MCP server on behalf of your school, without signing in as a person. Each key has only the permissions you give it.

Only the school **owner** can create, see and revoke API keys. The **API keys** tab appears in **Settings** only for owners. To learn how to use a key, see [Developers](/docs/developers).

## Create a key

<Steps>

<Step>

### Open API keys

Go to **Settings** then **API keys** and click **Create API key**.

</Step>

<Step>

### Name the key

Enter a **Name** of up to 100 characters that tells you what the key is for, for example `Zapier sync`.

</Step>

<Step>

### Choose when it expires

Under **Expires**, choose **Never**, **30 days**, **90 days**, **1 year** or **Custom date**. The default is 90 days. A custom date must be in the future and within two years.

</Step>

<Step>

### Choose permissions

Pick a **Permission preset**, or **Custom** and tick individual permissions. Give the key only what your integration needs. See [Permissions](/docs/settings/permissions). The **Create API key** button stays disabled until you choose at least one permission.

</Step>

<Step>

### Copy the key

Click **Create API key**. The **API key created** dialog shows the key once. Copy it now, because you won't be able to see it again. Click **Done** when you have stored it safely.

</Step>

</Steps>

<Callout type="warning" title="Treat a key like a password">

Anyone with the key can do whatever its permissions allow. Store it in a secret manager, never in a public repository, and revoke it at once if it leaks.

</Callout>

## Use a key

Send the key in the `x-api-key` header of each request. Keys start with `cl_live_`. The **Key** column of your key list shows only this recognisable beginning, never the full secret.

```bash title="Example header"
x-api-key: cl_live_key_…
```

## See your keys

The list shows each key's **Name**, the start of the **Key**, its **Permissions** (a preset name or a count of custom permissions), who created it, **Last used**, and when it **Expires**. Expired keys show an **Expired** label.

A school can have up to 50 active keys. If you reach the limit, revoke keys you no longer use.

## Revoke a key

Click the trash button on a key's row, then **Revoke key** in the **Revoke API key?** dialog. Any integration using that key stops working immediately. **API key revoked.** confirms it.

## What keys can't do

For safety, API keys can't perform some actions even if the key has the matching permission:

- Sending broadcasts or starting sequences.
- Changing payment gateway settings or code injection.
- Anything on the team, API keys or billing pages.

Those need a signed-in person.
