# Introduction

This app delivers the mails.

## Running the app

1. Create a file called `.env.local` with the appropriate environment variables.
2. Start Redis server

```sh
docker run -p 6379:6379 -d redis
```

3. Start the server

```sh
yarn workspace @courselit/queue run dev
```
