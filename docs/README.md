<p align="center">
  <b>
    CourseLit
  </b>
</p>
<p align="center">
  A CMS for building your own course website.
</p>

<p align="center">
  <a href="https://codelit.github.io/courselit">Website</a> |
  <a href="#getting-started">Getting started</a> |
  <a href="https://github.com/codelit/courselit/wiki">Documentation</a>
</p>

<p align="center">
  <a href="https://github.com/codelit/courselit/blob/deployment/LICENSE">
    <img src="https://badgen.net/github/license/codelit/courselit" alt="License">
  </a>
  <a href="https://github.com/codelit/courselit/actions">
    <img src="https://badgen.net/github/status/codelit/courselit" alt="Status">
  </a>
  <a href="https://hub.docker.com/r/codelit/courselit-proxy">
    <img src="https://badgen.net/docker/pulls/codelit/courselit-proxy" alt="Downloads">
  </a>
  <a href="https://github.com/codelit/courselit">
    <img src="https://badgen.net/github/last-commit/codelit/courselit" alt="Last commit">
  </a>
</p>

# Introduction
CourseLit is a content management system for educators, teachers and all creative people who want to run their own online teaching businesses. It is built using open source technologies like Node.js, Express.js, MongoDB, GraphQL and Next.js.

![courselit cms screenshot](./assets/screenshot.png)

## Getting Started
The recommended way to deploy CourseLit on your server is via Ansible. Follow the below mentioned instructions.

```
cd deployment
ansible-playbook install.yml -l <host> -u <host_user>
```

## Running on local
You can run a local instance of CourseLit on your local machine via [Docker Compose](https://docs.docker.com/compose/). Follow the below mentioned instructions.

1. Cd to the `deployment` folder.
```
cd courselit/deployment
```

2. Create a `.env` file in this directory with the following variables and change the values as per your environment.
```
SITE_URL=http://localhost
MEDIA_FOLDER=~/courselit
MONGO_ROOT_USERNAME=username
MONGO_ROOT_PASSWORD=password
DB_CONNECTION_STRING=mongodb://username:password@db
JWT_SECRET=yoursecret
JWT_EXPIRES_IN=2d
```

3. Start the application.

```
docker-compose -f docker-compose.yml up
```

4. Visit `http://localhost` in your browser.

### Environment variables.
**SITE_URL**

The public address of the site. Required parameter. No default value.

**MEDIA_FOLDER**

A folder on your host machine while will be mounted as a volume to all the containers. It is required for storing database files, user uploaded files, ssl certificates and everything else. Required parameter. No default value.

**MONGO_ROOT_USERNAME, MONGO_ROOT_PASSWORD**

These are required for correctly initializing an admin user in the mongo db instance running inside the container named `db`. Read more about these [here](https://hub.docker.com/_/mongo).

**DB_CONNECTION_STRING**

The connection string to a mongodb instance running in the `db` container. Required parameter. The value should be `mongodb://<MONGO_ROOT_USERNAME>:<MONGO_ROOT_PASSWORD>@db` where `MONGO_ROOT_USERNAME` and `MONGO_ROOT_PASSWORD` are the same variables defined above.

**JWT_SECRET**

A random string to use as a secret to sign the JWT tokens the API generates. Required parameter. No default value.

**JWT_EXPIRES_IN**

The duration after while the generated JWT expires. For more information [check out here](https://www.npmjs.com/package/jsonwebtoken). Optional parameter. Defaults to `1d`.

**DOMAIN**

The domain name for which the ssl certificate is issued. Optional parameter, only required if using a SSL certificate. No default value.

## Security
Although, we've done everything in our power to secure the application by following the best practices, we hope you understand that no one can guarantee that it's the most secure implementation out there and it will always stay secure.

Please audit the environment files, docker-compose files and other configurations properly as per your company's security standards. If you've discovered a security vulnerability, consider fixing the issue and submitting a PR.

Use the application at your own risk. People who have worked on this project will not be responsible for any sort of damage that happens to you by using the application.