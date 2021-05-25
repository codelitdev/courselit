<p align="center">
  <img src="./assets/banner.png">
</p>

<p align="center">
  <b>
    <a href="https://courselit.codelit.dev">Website</a> |
    <a href="https://codelit.gitbook.io/courselit/getting-started">Getting started</a> |
    <a href="https://codelit.gitbook.io/courselit">Documentation</a>
  </b>
</p>

<p align="center">
  <a href="https://github.com/codelitdev/courselit/actions">
    <img src="https://badgen.net/github/status/codelitdev/courselit" alt="Status">
  </a>
  <a href="https://discord.gg/GR4bQsN">
    <img src="https://img.shields.io/badge/chat-discord-blue" alt="Chat">
  </a>
  <a href="https://hub.docker.com/r/codelit/courselit-proxy">
    <img src="https://badgen.net/docker/pulls/codelit/courselit-proxy" alt="Downloads">
  </a>
  <a href="https://github.com/codelitdev/courselit">
    <img src="https://badgen.net/github/last-commit/codelitdev/courselit" alt="Last commit">
  </a>
  <a href="https://lgtm.com/projects/g/codelitdev/courselit/alerts/">
    <img src="https://img.shields.io/lgtm/alerts/g/codelitdev/courselit.svg?logo=lgtm&logoWidth=18" alt="Lgtm">
  </a>
  <a href="https://github.com/codelitdev/courselit/blob/deployment/LICENSE">
    <img src="https://badgen.net/github/license/codelitdev/courselit" alt="License">
  </a>
</p>

# Introduction

CourseLit is a content management system (aka CMS) for starting your own online course website. It is designed keeping educators in mind. Consider it an open-source alternative to those paid tutoring sites.

It comes pre-equipped with all the basic tools you'd require to efficiently run and administer your online teaching business. Features include course authoring, student management, payment processing (via Stripe), website customization and analytics (very limited as of now).

Check out this live example to see what you can build with CourseLit. [Click here](https://codelit.dev).

## Screenshot

![courselit cms screenshot](./assets/screenshot2.png)

## Getting Started

To install CourseLit on your cloud server, please follow [our official guide](https://codelit.gitbook.io/courselit/getting-started).

## Development

The project is organised as a [mono-repo](https://en.wikipedia.org/wiki/Monorepo). It uses [Lerna](https://github.com/lerna/lerna) for managing the mono-repo. You need to run both backend and frontend servers, located in `packages/api` and `packages/app` respectively, in order to run the portal in its entirety.

We recommend using [Visual Studio Code](https://code.visualstudio.com/) for development as it allows you to develop your code in isolation inside a container using the [Remote - Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) extension. Install both the editor and the extension.

Once you have this setup, follow these steps.

1. Add the following entries to your operating system's host file. These are required for multitenancy.

```
127.0.0.1       domain1.localsite.com
127.0.0.1       domain2.localsite.com
127.0.0.1       localsite.com
```

2. Press `Ctrl + Shift + P` to open the command palette of Visual Studio Code, type in "Remote-Containers: Open Workspace in Container" and press enter after selecting it.

3. Once the code opens up, open two terminal windows in your Visual Studio Code and type in the following commands to start the backend and frontend servers respectively.

- `yarn lerna run dev --scope=@courselit/api --stream`
- `yarn lerna run dev --scope=@courselit/app --stream`

> The above commands are also exported as `bash` aliases, so you can simply type `api` and `app` in separate terminal windows to run backend and frontend servers respectively.

4. Inside the development container, open up a terminal window and type the following commands in sequence.

```
mongo
use app
var subscriptionExpiresAt = new Date()
subscriptionExpiresAt.setDate(subscriptionExpiresAt.getDate() + 90)

db.domains.insert({ name: "domain1", deleted: false, email: "domain1@email.com" })
db.subscribers.insert({ email: "domain1@email.com", subscriptionEndsAfter: subscriptionExpiresAt})

db.domains.insert({ name: "domain2", deleted: false, email: "domain2@email.com" })
db.subscribers.insert({ email: "domain2@email.com", subscriptionEndsAfter: subscriptionExpiresAt})
```

This will enable the invidual sites listed in step `1` with subscriptions valid for `90 days`.

5. Visit `domain1.localsite.com` to see CourseLit in action.

## Writing Your Own Widget

You can add additional functionality to your application via building your own widgets. Have a look at [this](widgets.md) document.

## Environment variables.

Have a look at the [docker-compose.yml](../deployment/docker/docker-compose.yml) file to know what all environment variables are available for you to tweak.
