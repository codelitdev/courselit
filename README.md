## Running
### locally
- Install MongoDB

## Creating Super Admin
The very first user who signs up for an account, automatically becomes a super admin.

## Deployment

### 1. DigitalOcean
- Go to DigitalOcean's API section
- Generate a personal access token and copy it to clipboard
- Create a `.prod.env` file in your project's directory, copy-paste the following and change the settings as per your target environment
  ```
  MAIN_URL=http://192.168.99.101
  API_PREFIX=/api
  MOUNT_UPLOAD_FOLDER_VOLUME_AS=/c/Users/rajat/app/uploads
  MOUNT_THUMBNAIL_FOLDER_VOLUME_AS=/c/Users/rajat/app/thumbs
  DB_CONNECTION_STRING=mongodb://db/app
  JWT_SECRET=verysecuresecret
  JWT_EXPIRES_IN=864000
  ```
- Create a Docker machine
  ```
  docker-machine create --driver digitalocean --digitalocean-access-token xxxxx machine-name
  ```
- Run the following command to see your running Droplet
  ```
  docker-machine ls
  ```
- Export proper Docker variables in your shell
  ```
  docker-machine env machine-name
  ```
- SSH into your docker machine
  ```
  docker-machine ssh machine-name
  ```
- Install Letsencrypt's Certbot from [here](https://certbot.eff.org/lets-encrypt/ubuntuxenial-haproxy)
- Copy-paste the content of the `configure-server-for-letsencrypt` in a script on your docker machine and execute it
- Start the docker containers
  ```    
  ./up .prod.env [any other docker-compose option, if necessary]
  ```