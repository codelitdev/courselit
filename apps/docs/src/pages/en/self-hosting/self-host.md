---
title: CourseLit Self Hosting Guide
description: CourseLit Self Hosting Guide
layout: ../../../layouts/MainLayout.astro
---

> **Before you self-host**: Although we believe in the power of hosting your own software, we still think that buying a subscription to [CourseLit](https://courselit.app) will save you a lot of time and money of maintaining your own CourseLit instance. Check out our [pricing](https://courselit.app/#pricing).

We offer two ways to self-host CourseLit, which are as follows.

1. On [Vercel](https://vercel.com).
2. On a VPS using Docker.

## Hosting on Vercel

To quickly spin up an instance of CourseLit on Vercel, click the following button.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fcodelitdev%2Fcourselit&env=DB_CONNECTION_STRING,AUTH_SECRET,SUPER_ADMIN_EMAIL,EMAIL_USER,EMAIL_PASS,EMAIL_HOST,EMAIL_FROM&envDescription=Configuration%20for%20your%20app&project-name=courselit&root-directory=apps%2Fweb&build-command=cd+..%2F+%26%26+NODE_OPTIONS%3D--openssl-legacy-provider+yarn+build)

> Note: Certain essential features like file uploads, email automation and drip content will not work as these cannot run on a serverless platform like Vercel. However, you can make file uploads work by using the hosted instance of [MediaLit](https://medialit.cloud) (our open-source service for file uploads, which CourseLit uses under the hood) for free.

## Hosting on a VPS using Docker

If you want to harness the full capabilities of CourseLit, you can deploy it via Docker. We recommend [docker-compose](https://docs.docker.com/compose/) for hosting CourseLit.

Run the following commands in order.

##### 1. Download `docker-compose.yml` file onto your system.

```sh
curl https://raw.githubusercontent.com/codelitdev/courselit/main/deployment/docker/docker-compose.yml --output docker-compose.yml --silent
```

##### 2. Start the app

```sh
SUPER_ADMIN_EMAIL=your@email.com docker compose up
```

The email you specify here will be set as the super admin of your CourseLit instance.

> **Troubleshooting**: If you are going to run this command multiple times, be aware that the super admin user will only be created once and with the email ID you provided the very first time. Hence, if you are not able to access the `/dashboard` route, it is most likely that the email you are using is not associated with the super admin account. Try removing the Docker containers by running `SUPER_ADMIN_EMAIL=your@email.com docker compose down` and start again.

##### 3. Test drive your CourseLit school

Visit [http://localhost](http://localhost) to see your school. There won't be much to see at this point. You need to customise it.

##### 4. Log in to your school

Click on the top right icon and then on the [login](http://localhost/login) menu. Enter the email you provided in Step #2 to log in. Since, we haven't set the mail yet, the magic link to log in will be dumped onto the `docker compose` logs. Locate the link and click on it (or copy paste it in the browser) to log in.

The login link looks something like `http://localhost/login?token=some-long-string`.

##### 5. Customise your school

Visit [http://localhost/dashboard](http://localhost/dashboard) to customise your school.

> Note: This will be a barebones instance. Things like mails and file uploads will not work. You can follow rest of this guide to set those things up.

### Enabling emails

If you want to send emails (including Magic links to log in) using CourseLit, it is easy as well.

1. Create an enviroment file called `.env` with the following content (in the same directory as your `docker-compose.yml` file) and replace the values accordingly.

```
SUPER_ADMIN_EMAIL=your@email.com

# Email
EMAIL_HOST=host
EMAIL_USER=user
EMAIL_PASS=pass
EMAIL_FROM=from_field
```

2. Restart the app

```
docker compose stop
docker compose up
```

### Enabling file uploads

If you want to upload media (images, videos etc.) to your school, you need to configure [MediaLit](https://hub.docker.com/r/codelit/medialit). MediaLit powers CourseLit's media management and optimisation. MediaLit offers a Docker image which you can self host.

To self host, follow the following steps.

1.  Uncomment the block under the `app` service in `docker-compose.yml` which says the following.

    ```
    # - MEDIALIT_APIKEY=${MEDIALIT_APIKEY}
    # - MEDIALIT_SERVER=http://medialit
    ```

2.  Uncomment the block titled `MediaLit` in `docker-compose.yml`.

3.  In your `.env` file, paste the following code (under the existing content) and change the values as per your environment.

    ```
    # Medialit Server
    CLOUD_ENDPOINT=aws_s3_endpoint
    CLOUD_REGION=aws_s3_region
    CLOUD_KEY=aws_s3_key
    CLOUD_SECRET=aws_s3_secret
    CLOUD_BUCKET_NAME=aws_s3_bucket_name
    S3_ENDPOINT=aws_s3_cdn_endpoint
    CLOUD_PREFIX=medialit
    MEDIALIT_APIKEY=key_to_be_obtained_docker_compose_logs
    ```

    To learn how to configure an AWS S3 bucket for MediaLit, click [here](https://github.com/codelitdev/medialit?tab=readme-ov-file#setting-up-correct-access-on-aws-s3-bucket).

4.  Start the MediaLit service once to generate an API key to use with CourseLit.

    ```sh
    docker compose up medialit
    ```

    The above command will start the MediaLit service and display a fresh API key on the console. The relevant logs will look something like the following.

    ```sh
    @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
    @     API key: testcktI8Sa71QUgYtest      @
    @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
    ```

    Copy the API key.

5.  Update the `MEDIALIT_APIKEY` value in `.env` file and restart the service once again.

6.  That's it! You now have a fully functioning LMS powered by CourseLit and MediaLit.

## Kubernetes

```
Note: For the purpose of this documentation, the following are assumed:
- A Kubernetes cluster (e.g Talos) is created
- Reverse Proxy (e.g Traefik) installed and working in the cluster
- Storage Provider with valid StorageClass installed
- CNPG Operator installed
```

### MongoDB (CNPG + FerretDB)

FerretDB is an alternative to MongoDB Operator, where FerretDB acts as an proxy that converts MongoDB protocols to SQL and uses PostgresQL with DocumentDB extension as a database engine. ([Source](https://github.com/ferretdb/ferretdb)) 

CNPG Operator is used create PostgresSQL databases.

**Note:** FerretDB uses the same credentials of PostgresSQL for MongoDB.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: cnpg
stringData:
  username: admin # username for postgresSQL and MongoDB
  password: password # password for postgresSQL and MongoDB
```

```yaml
# Creating PostgresSQL database
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: courselit
spec:
  imageName: ghcr.io/ferretdb/postgres-documentdb:17-0.106.0-ferretdb-2.5.0
  postgresUID: 999
  postgresGID: 999
  enableSuperuserAccess: true
  instances: 2
  primaryUpdateStrategy: unsupervised
  storage:
    size: 4Gi
    storageClass: longhorn # replace with your storageclass
  managed:
    roles:
      - name: admin
        ensure: present
        login: true
        superuser: true
        passwordSecret:
          name: cnpg
  bootstrap:
    initdb:
      postInitSQL:
        - 'CREATE EXTENSION IF NOT EXISTS documentdb CASCADE;'
  postgresql:
    shared_preload_libraries:
      - pg_cron
      - pg_documentdb_core
      - pg_documentdb
    parameters:
      cron.database_name: 'postgres'
```

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: courselit-mongo-secret
stringData:
  FERRETDB_POSTGRESQL_URL: postgres://admin:password@courselit-rw.svc.cluster.local:5432/postgres # replace "admin" and "password" with the credentials used when creating PostgresSQL database
```

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: courselit-ferret
spec:
  replicas: 1
  selector:
    matchLabels:
      app: courselit-ferret
  template:
    metadata:
      labels:
        app: courselit-ferret
    spec:
      containers:
        - name: courselit-ferret
          image: ghcr.io/ferretdb/ferretdb:2.5.0
          ports:
            - containerPort: 27017
          envFrom:  
            - secretRef:
                name: courselit-mongo-secret
```

```yaml
apiVersion: v1
kind: Service
metadata:
  name: courselit-ferret
spec:
  selector:
    app: courselit-ferret
  ports:
    - protocol: TCP
      port: 27017
      targetPort: 27017
```

### ConfigMap

To learn how to configure an AWS S3 bucket for MediaLit, click [here](https://github.com/codelitdev/medialit?tab=readme-ov-file#setting-up-correct-access-on-aws-s3-bucket).

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: courselit-cm
data:
  NODE_ENV: production
  PORT: "80"
  CACHE_DIR: /tmp
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: medialit-cm
data:
  EMAIL: admin@example.com
  CLOUD_ENDPOINT: aws_s3_endpoint
  CLOUD_ENDPOINT_PUBLIC: aws_s3_endpoint
  S3_ENDPOINT: s3_cdn_endpoint
  CLOUD_REGION: aws_s3_region
  CLOUD_BUCKET_NAME: aws_s3_bucket_name
  CLOUD_PUBLIC_BUCKET_NAME: courselit-public
  CDN_ENDPOINT: aws_s3_endpoint
  CLOUD_PREFIX: medialit
  TEMP_FILE_DIR_FOR_UPLOADS: /tmp
```

### Secrets

**Note:** Make use of External Secrets Operator to keep secrets out of the cluster.

`MEDIALIT_APIKEY` & `MEDIALIT_SERVER` should be populated after MediaLit pod is created for the first time.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: courselit-secret
stringData:
  AUTH_SECRET: <random string> # openssl rand -hex 32
  DB_CONNECTION_STRING: mongodb://admin:password@courselit-ferret-svc.svc.cluster.local/medialit?authSource=admin # replace "admin" and "password" with the credential used when creating CNPG postgres database
  # MEDIALIT_API_KEY: <api key from medialit> # update after MediaLit generate API key when running for the first time
  # MEDIALIT_SERVER: https://medialit.example.com # update after retrieving MediaLit API key
  SUPER_ADMIN_EMAIL: admin@example.com
---
apiVersion: v1
kind: Secret
metadata:
  name: medialit-secret.yaml
stringData:
  CLOUD_KEY: <aws_s3_key>
  CLOUD_SECRET: <aws_s3_secret>
  DB_CONNECTION_STRING: mongodb://admin:password@courselit-ferret-svc.svc.cluster.local/medialit?authSource=admin # replace "admin" and "password" with the credential used when creating CNPG postgres database
```

### Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: courselit
spec:
  selector:
    matchLabels:
      app: courselit
  template:
    metadata:
      labels:
        app: courselit
    spec:
      containers:
      - name: courselit
        image: codelit/courselit-app:v0.73.9
        ports:
        - containerPort: 80
        envFrom:
          - configMapRef:
              name: courselit-cm
          - secretRef:
              name: courselit-secret
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: medialit
  annotations:
    reloader.stakater.com/auto: "true"
spec:
  selector:
    matchLabels:
      app: medialit
  template:
    metadata:
      labels:
        app: medialit
    spec:
      containers:
      - name: medialit
        image: codelit/medialit:v0.3.1
        ports:
        - containerPort: 80
        envFrom:
          - secretRef:
              name: medialit-secret
          - configMapRef:
              name: medialit-cm
```

### Service
```yaml
apiVersion: v1
kind: Service
metadata:
  name: courselit
spec:
  selector:
    app: courselit
  ports:
  - port: 80
    targetPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: medialit
spec:
  selector:
    app: medialit
  ports:
  - port: 80
    targetPort: 80
```

### Ingress

Below example uses Traefik IngressRoute for reverse proxy.

```yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: courselit
spec:
  entryPoints: 
    - websecure
  routes:
    - match: Host(`courselit.example.com`) 
      kind: Rule
      services:
      - name: courselit
        port: 80
---
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: medialit
spec:
  entryPoints: 
    - websecure
  routes:
    - match: Host(`medialit.example.com`) 
      kind: Rule
      services:
      - name: medialit
        port: 80

```

### MediaLit API Key

After all the manifests are created and running, retrieve the API key of MediaLit from the pod:
```shell
kubectl get pod
kubectl logs <medialit-pod-name>
```

Update the MEDIALIT_APIKEY and MEDIALIT_SERVER in `courselit-secret` and restart courselit deployment.


## Hosted version

If this is too technical for you to handle, CourseLit's hosted version is available at [CourseLit.app](https://courselit.app).

It is managed by the team behind CourseLit. We will take care of everything, just come with your team and content.

## Stuck somewhere?

We are always here for you. Come chat with us in our <a href="https://discord.com/invite/GR4bQsN" target="_blank">Discord</a> channel or send a tweet at <a href="https://twitter.com/courselit" target="_blank">@CourseLit</a>.