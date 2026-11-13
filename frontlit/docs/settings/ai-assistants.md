---
title: Connect an AI assistant
description: Let Claude, ChatGPT, Cursor or another assistant work on your school, and disconnect it when you no longer need it.
nav_order: 60
---

You can connect an AI assistant to your school and ask it to do work for you, such as drafting courses, editing pages or listing contacts. The assistant connects through CourseLit's MCP server using the address shown in your settings.

An assistant acts with the permissions of the person who connects it. It can't do anything you couldn't do yourself.

## Connect an assistant

<Steps>

<Step>

### Open AI assistants

Go to **Settings** then **AI assistants**. The **Connect an AI assistant** card shows your **CourseLit address**. Click **Copy** to copy it.

</Step>

<Step>

### Pick your assistant

Under **Setup steps for**, choose **Claude**, **ChatGPT**, **Cursor** or **Other** to see the steps for it.

| Assistant | Steps |
| --- | --- |
| Claude | Open Settings, then Connectors, and add a custom connector. Paste the CourseLit address and save. Sign in with CourseLit when asked, and choose your school. |
| ChatGPT | Open Settings, then Connectors, and add a new connector. Paste the CourseLit address. Sign in with CourseLit when asked, and choose your school. |
| Cursor | Open Settings, then MCP, and add a new server. Paste the CourseLit address as the server URL. Sign in with CourseLit when the browser opens. |
| Other | Add a remote MCP server in your app. Paste the CourseLit address. Sign in with CourseLit, or use an API key if your app asks for one. |

</Step>

<Step>

### Sign in and choose your school

When the assistant asks you to sign in, sign in with CourseLit and choose the school it should work on.

</Step>

</Steps>

The assistant appears under **Connected assistants** as soon as it connects, with a **Connected** label, who connected it and when it was last used.

## If your app can't sign in through the browser

Some apps ask for a key instead of a browser sign-in. If you are the school owner, use **Create an API key** in the card to go to the API keys tab, create a key for your school and paste it into the app. See [API keys](/docs/settings/api-keys). API keys give the app only the permissions you choose.

## Disconnect an assistant

<Steps>

<Step>

### Click Disconnect

In **Connected assistants**, click **Disconnect** next to the assistant.

</Step>

<Step>

### Confirm

Confirm in the dialog. The assistant loses access to your school straight away. Courses, lessons and contacts it created stay as they are, and you can connect it again any time.

</Step>

</Steps>

## Good to know

- Everything an assistant does is done as the person who connected it, so it is only as powerful as that person's permissions.
- Actions that are destructive or high impact, such as deleting things, publishing pages or blog posts, or starting an email sequence, are marked as such, and the assistant has to confirm them explicitly.
- Some actions are never available to API keys, such as sending emails and changing payment gateway settings or code injection. Use a browser sign-in for those.

For building your own integrations, see [Developers](/docs/developers).
