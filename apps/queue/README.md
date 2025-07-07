# Introduction

This app delivers the mails.

## Environment Variables

The following environment variables are used by the queue service:

### Required Variables

- `DB_CONNECTION_STRING` - MongoDB connection string for database and logging
- `EMAIL_HOST` - SMTP server hostname for sending emails
- `EMAIL_USER` - SMTP authentication username
- `EMAIL_PASS` - SMTP authentication password
- `COURSELIT_JWT_SECRET` - JWT secret for authentication middleware

### Optional Variables

- `REDIS_HOST` - Redis server hostname (default: `localhost`)
- `REDIS_PORT` - Redis server port (default: `6379`)
- `EMAIL_PORT` - SMTP server port (default: `587`)
- `PORT` - HTTP server port (default: `80`)
- `NODE_ENV` - Environment mode. When set to `production`, emails are actually sent; otherwise they are only logged
- `SEQUENCE_BOUNCE_LIMIT` - Maximum number of bounces allowed for email sequences (default: `3`)
- `PROTOCOL` - Protocol used for generating site URLs (default: `https`)
- `DOMAIN` - Base domain name for generating site URLs

## Running the app

1. Create a file called `.env.local` with the appropriate environment variables.
2. Start Redis server

```sh
docker run -p 6379:6379 -d redis
```

3. Start the server

```sh
pnpm --filter @courselit/queue dev
```
