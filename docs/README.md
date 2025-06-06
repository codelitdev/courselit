<p align="center">
  <img src="./assets/card.png">
</p>

<h1 align="center">CourseLit</h1>

<p align="center">
    Sell online courses and digital downloads from your own website. 
    <br />
    <br />
    An open source alternative to Teachable, Thinkific, Podia and the likes.
</p>

<p align="center">
  <b>
    <a href="https://courselit.app">Website</a> |
    <a href="https://docs.courselit.app">Documentation</a> | 
    <a href="https://honey-oviraptor-4b7.notion.site/4a82d434ff2e485c8eb4b22f13252fef?v=9873e6e4812c420ab6a5cd81eca11356">Roadmap</a>
  </b>
</p>

<p align="center">
  <a href="https://discord.gg/GR4bQsN">
    <img src="https://img.shields.io/badge/chat-discord-blue" alt="Chat">
  </a>
  <a href="https://github.com/codelitdev/courselit">
    <img src="https://badgen.net/github/tag/codelitdev/courselit" alt="Release">
  </a>
  <a href="https://github.com/codelitdev/courselit/blob/deployment/LICENSE">
    <img src="https://badgen.net/github/license/codelitdev/courselit" alt="License">
  </a>
</p>

# A modern LMS for everyone

CourseLit is a [batteries included](https://en.wikipedia.org/wiki/Batteries_Included) learning management system (aka LMS) for everyone. It is an open source alternative to Teachable, Thinkific, Podia, Teachery, LearnDash and the likes.

It comes pre-equipped with all the basic tools you need to efficiently run and administer your online teaching business. Features include course authoring, student management, payment processing (via Stripe), website builder, custom sales pages and analytics (very limited as of now).

Check out this live example to see what you can build with CourseLit. [Click here](https://codelit.dev).

### Screenshots

**1. A real landing page build with CourseLit**

![Landing page](./assets/codelit.png)

**2. Admin dashboard**

![courselit lms screenshot](./assets/courselit-dashboard.png)

## Features

Checkout our [documentation](https://docs.courselit.app/en/introduction/#key-features) for an updated list of features.

## Getting started

Visit [courselit.app](https://courselit.app) to use the cloud hosted version. Sign up for a free account to get a 14 days trial period to experience the platform without any restrictions. No credit card required.

To self host CourseLit, follow our [official guide](https://docs.courselit.app/en/self-hosting/).

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fcodelitdev%2Fcourselit&env=DB_CONNECTION_STRING,AUTH_SECRET,SUPER_ADMIN_EMAIL,EMAIL_USER,EMAIL_PASS,EMAIL_HOST,EMAIL_FROM&envDescription=Configuration%20for%20your%20app&project-name=courselit&root-directory=apps%2Fweb&build-command=cd+..%2F+%26%26+NODE_OPTIONS%3D--openssl-legacy-provider+yarn+build)

## Development

The project is organised as a [mono-repo](https://en.wikipedia.org/wiki/Monorepo). It uses [Pnpm workspaces](https://pnpm.io/workspaces) for managing the mono-repo.

To set up the development environment, first clone the project on your local machine and `cd` to its diretory.

Then replace the values in `.env` file located inside the `apps/web` folder with your enviroment's configuration.

Now run the following commands from the root directory of the project.

```sh
# Install dependencies
pnpm install

# Build the packages
pnpm build

# Start the app
pnpm dev
```

That's it! Now you can dive into the code base.

## Medialit

CourseLit uses [MediaLit](https://medialit.cloud) as its backend for managing media assets. It is a paid service and you need to have an account on it to store your files in the cloud.

If you do not want to use the cloud hosted version, you can roll your own instance. Add the following config to the `.env` file to use your own MediaLit instance.

```sh
MEDIALIT_SERVER=medialit_server_location
```

## Writing your own widget

You can add additional functionality to your application via building your own widgets. Have a look at [this](widgets.md) document.

## Environment variables

Have a look at the [docker-compose.yml](../deployment/docker/docker-compose.yml) file to know what all environment variables are available for you to tweak.

## Applying DB Migrations

The migrations are located in the [apps/web/.migrations](../apps/web/.migrations) directory. The migrations are named like `DD-MM-YY_HH-MM-<migration-purpose>.js` so that they can be sorted chronologically.

### To Apply a Migration

Since the migrations are complete scripts, you need to have some development chops—not much, though.

1. Initialize a blank Node project. In your terminal, create a blank Node project:

```
mkdir migration
cd migration
npm init -y
```

2. Install dependencies.

    You can refer to the first few lines of the migration to see which dependencies are required. Most of the time, you'll be good to go after running the following command:

```
npm i mongoose nanoid
```

3. Copy the migration script into this new project folder.

4. Run the script:

```
DB_CONNECTION_STRING=mongodb://<mongodb-url> node migration-script.js
```
