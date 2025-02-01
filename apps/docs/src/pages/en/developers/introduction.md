---
title: Integrate with CourseLit API
description: Learn how to integrate with your CourseLit school using the API
layout: ../../../layouts/MainLayout.astro
---

## Introduction

CourseLit provides a powerful API that allows you to manage your school programmatically. This guide will help you understand how to integrate with the CourseLit API.

## Prerequisites

Before you start, ensure you have the following:

1. A CourseLit account with admin privileges.
2. An API key for your domain. You can generate one from the dashboard.

## Obtaining the API Key

To interact with the CourseLit API, you need an API key. Follow these steps to obtain your API key:

1. Log in to your CourseLit admin account.
2. Navigate to the dashboard.
3. Go to the `Settings > API Keys` section and generate a new API key.

## Setting Up the Environment

You need to set up your environment variables to store your CourseLit server URL and API key securely. Here is an example of how to do it in JavaScript:

```javascript
const courselitServer = process.env.COURSELIT_SERVER;
const courselitApikey = process.env.COURSELIT_APIKEY;

export async function createUser({ email }) {
    if (!courselitServer || !courselitApikey) {
        return;
    }

    const endPoint = `${courselitServer}/api/user`;

    const response = await fetch(endPoint, {
        method: "POST",
        headers: {
            "content-type": "application/json",
        },
        body: JSON.stringify({
            email,
            apikey: courselitApikey,
        }),
    });

    let responseBody = await response.json();

    if (response.ok && !responseBody.error) {
        return response;
    } else {
        throw new Error(
            `${responseBody.error}, ${response.status}, ${response.statusText}, ${endPoint}`,
        );
    }
}
```

### Explanation

1. **courselitServer**: This should be set to your CourseLit school's URL.
2. **courselitApikey**: This should be set to the API key you generated from the dashboard.

## Example Usage

Here is an example of how to use the `createUser` function:

```javascript
import { createUser } from "./path-to-your-function";

const email = "user@example.com";

createUser({ email })
    .then((response) => {
        console.log("User created successfully:", response);
    })
    .catch((error) => {
        console.error("Error creating user:", error);
    });
```

## Need Help?

If you encounter any issues or have questions, feel free to reach out to us on our <a href="https://discord.com/invite/GR4bQsN" target="_blank">Discord</a> channel or send a tweet at <a href="https://twitter.com/courselit" target="_blank">@CourseLit</a>.
