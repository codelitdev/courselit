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

echo -e "\nEmail setup (required for the login feature).\n"

echo "Email host:"
read EMAILHOST
[[ -z "$EMAILHOST" ]] && { echo "An email host is necessary to continue . Please try again."; exit 1; }

echo "Email user:"
read EMAILUSER
[[ -z "$EMAILUSER" ]] && { echo "An email user is necessary to continue . Please try again."; exit 1; }

echo "Email password:"
read EMAILPASS
[[ -z "$EMAILPASS" ]] && { echo "The email's password is necessary to continue . Please try again."; exit 1; }

echo "Email address to set as a 'from' field in the outgoing emails:"
read EMAILFROM
[[ -z "$EMAILFROM" ]] && { echo "A 'from' email is necessary to continue . Please try again."; exit 1; }

CONFIGHOME=/home/$USER/.config/${DOMAIN}

function generate_config () {
# Generate random username and password for database
DBUSER=$(tr -dc 'a-z' </dev/urandom | head -c 7)
DBPASSWORD=$(tr -dc 'a-zA-Z0-9' </dev/urandom | head -c 20)
JWTSECRET=$(tr -dc 'a-z' </dev/urandom | head -c 10)

mkdir -p $CONFIGHOME

cat > $CONFIGHOME/.env <<EOF
MEDIA_FOLDER=/home/$USER/$DOMAIN
MONGO_ROOT_USERNAME=$DBUSER
MONGO_ROOT_PASSWORD=$DBPASSWORD
DB_CONNECTION_STRING=mongodb://$DBUSER:$DBPASSWORD@db/courselit?authSource=admin
JWT_SECRET=$JWTSECRET
DOMAIN=$DOMAIN
API_PREFIX=/api
JWT_EXPIRES_IN=14d
TAG=latest
USE_WEBP=true

# The following directory is used to create thumbnails for videos and images.
TEMP_DIR_FOR_UPLOADS=/home/$USER/$DOMAIN/tmp

# If you want to use AWS S3 compatible cloud storage, set the following variable to true.
USE_CLOUD_STORAGE=false

# If USE_CLOUD_STORAGE is set to true, replace the following placeholder values with their appropriate values.
CLOUD_ENDPOINT=https://cloud.endpoint
CLOUD_REGION=region
CLOUD_KEY=key
CLOUD_SECRET=secret
CLOUD_BUCKET_NAME=bucket

# Set the following to serve media files correctly
CDN_ENDPOINT=/api/assets

# Email
EMAIL_HOST=$EMAILHOST
EMAIL_USER=$EMAILUSER
EMAIL_PASS=$EMAILPASS
EMAIL_FROM=$EMAILFROM
EOF

# Download necessary files
wget \
    https://raw.githubusercontent.com/codelitdev/courselit/master/deployment/docker/docker-compose.yml \
    -P $CONFIGHOME

# Create a cronjob file to take backups
cat > $CONFIGHOME/backup.sh <<EOF
tar -cvz --exclude=**/diagnostic.data/* -f courselit-backup-\`date +'%d%m%y'\`.tar.gz /home/$USER/$DOMAIN >> courselit-backup-\`date +'%d%m%y'\`.log
EOF
}

function setup_ssl_multitenant () {
    echo "Enter an email to be used for issuing SSL certificates."
    read EMAIL
    [[ -z "$EMAIL" ]] && { echo "A email is necessary to continue. Please try again."; exit 1; }

    echo "Enter your Cloudflare API Key."
    read CLOUDFLARE_API_TOKEN
    [[ -z "$CLOUDFLARE_API_TOKEN" ]] && { echo "A Cloudflare key is necessary to continue. Please try again."; exit 1; }

    # Caddy uses the following endpoint to know whether to issues a SSL certificate for a domain or not
    CUSTOM_DOMAINS_VERIFY_URL=https://${DOMAIN}/api/domain/verify

cat > $CONFIGHOME/Caddyfile <<EOF
{
        email ${EMAIL}
        on_demand_tls {
                ask ${CUSTOM_DOMAINS_VERIFY_URL}
        }
}

:443 {
        tls {
                on_demand
        }

        reverse_proxy {\$API_PREFIX}/* backend:8000
        reverse_proxy frontend:3000

        encode gzip
}

*.${DOMAIN} {
        tls {
                dns cloudflare ${CLOUDFLARE_API_TOKEN}
        }

        reverse_proxy {\$API_PREFIX}/* backend:8000
        reverse_proxy frontend:3000

        encode gzip
}
EOF
}

function setup_ssl () {
    # Turn off HTTPS by prepending http:// to Caddyfile
    read -p "Do you want to turn off HTTPS?" -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]
    then
    # Activate insecure mode in the config
    echo "INSECURE=true" >> $CONFIGHOME/.env

cat > $CONFIGHOME/Caddyfile <<EOF
http://${DOMAIN} {
	reverse_proxy {\$API_PREFIX}/* backend:8000
	reverse_proxy frontend:3000

	encode gzip
}
EOF
    else
cat > $CONFIGHOME/Caddyfile <<EOF
${DOMAIN} {
	reverse_proxy {\$API_PREFIX}/* backend:8000
	reverse_proxy frontend:3000

	encode gzip
}
EOF
    fi
}

# Check if configuration exists
if [ ! -d "$CONFIGHOME" ]; then
	generate_config
else
	echo "Existing configuration found for $DOMAIN. Using that."
fi

# Setup Multitenancy
rm $CONFIGHOME/Caddyfile
if [[ -z "$MULTITENANT" ]]; then
	setup_ssl
else
    # Activate multitenancy in the config
    echo "MULTITENANT=true" >> $CONFIGHOME/.env
	setup_ssl_multitenant
fi

# Start the app
(cd $CONFIGHOME; docker-compose pull && docker-compose up -d)

tput setaf 2; echo "SUCCESS: Configuration file '.env' is stored in $CONFIGHOME. Make sure to back it up."

# Schedule a cronjob to take regular backups at 12:00 am everyday
# crontab -l | { cat; echo "0 0 * * * sh $CONFIGHOME/backup.sh"; } | crontab -