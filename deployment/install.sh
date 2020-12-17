#!/bin/bash

# Install dependencies
sudo apt update 
sudo apt install -y apt-transport-https \
    ca-certificates \
    software-properties-common \
    python3-pip \
    docker-compose \
    wget

# Install Docker tools
pip3 install setuptools docker docker-compose

# Add the current user to the docker group
sudo usermod -a -G docker $USER

# Reload docker group
# exec newgrp docker

# Unmask docker
sudo systemctl unmask docker

# Bounce docker service
sudo service docker restart

# Prune old containers
echo "Pruning old containers"
docker system prune -f

echo $USER

# User inputs
echo "Enter your domain name (FQDN)."
read DOMAIN
[[ -z "$DOMAIN" ]] && { echo "Domain name is necessary to continue. Please try again."; exit 1; }

# Generate random username and password for database
DBUSER=$(tr -dc 'a-z' </dev/urandom | head -c 7)
DBPASSWORD=$(tr -dc 'a-zA-Z0-9' </dev/urandom | head -c 20)
JWTSECRET=$(tr -dc 'a-z' </dev/urandom | head -c 10)

echo $DOMAIN
echo $DBUSER
echo $DBPASSWORD

CONFIGHOME=/home/$USER/.config/${DOMAIN}
mkdir $CONFIGHOME

cat > $CONFIGHOME/.env <<EOF
MEDIA_FOLDER=/home/$USER/$DOMAIN
MONGO_ROOT_USERNAME=$DBUSER
MONGO_ROOT_PASSWORD=$DBPASSWORD
DB_CONNECTION_STRING=mongodb://$DBUSER:$DBPASSWORD@db
JWT_SECRET=$JWTSECRET
SITE_URL=https://$DOMAIN
DOMAIN=$DOMAIN
API_PREFIX=/api
JWT_EXPIRES_IN=14d
TAG=latest
USE_WEBP=true
EOF

# Download necessary files
wget \
    https://raw.githubusercontent.com/codelitdev/courselit/master/deployment/docker/docker-compose.yml \
    -P $CONFIGHOME
wget \
    https://raw.githubusercontent.com/codelitdev/courselit/master/deployment/docker/Caddyfile \
    -P $CONFIGHOME

# Start the app
(cd $CONFIGHOME; docker-compose up)