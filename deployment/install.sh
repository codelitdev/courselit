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

CONFIGHOME=/home/$USER/.config/${DOMAIN}

function generate_config () {
# Generate random username and password for database
AUTH_SECRET=$(tr -dc 'a-z' </dev/urandom | head -c 10)

mkdir -p $CONFIGHOME

cat > $CONFIGHOME/.env <<EOF
DB_CONNECTION_STRING=replace-this-with-a-mongodb-connection-string
AUTH_SECRET=$AUTH_SECRET
TAG=latest

# Email
EMAIL_HOST=host
EMAIL_USER=user
EMAIL_PASS=pass
EMAIL_FROM=from

# MediaLit
#MEDIALIT_APIKEY=apikey-to-access-the-medialit-server
EOF

# Download necessary files
wget \
    https://raw.githubusercontent.com/codelitdev/courselit/master/deployment/docker/docker-compose.yml \
    -P $CONFIGHOME
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

    # Pass DOMAIN to the environment
    echo "DOMAIN=$DOMAIN" >> $CONFIGHOME/.env

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

        reverse_proxy app:3000

        encode gzip
}

*.${DOMAIN} {
        tls {
                dns cloudflare ${CLOUDFLARE_API_TOKEN}
        }

        reverse_proxy app:3000

        encode gzip
}
EOF
}

function setup_ssl () {
    echo "Enter an email to be used for setting up a super admin account. Make sure you can receive emails on this email address."
    read EMAIL
    [[ -z "$EMAIL" ]] && { echo "A email is necessary to continue. Please try again."; exit 1; }

    # Pass EMAIL to the environment
    echo "SUPER_ADMIN_EMAIL=$EMAIL" >> $CONFIGHOME/.env

cat > $CONFIGHOME/Caddyfile <<EOF
${DOMAIN} {
	reverse_proxy app:3000

	encode gzip
}
EOF
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

# Pull the Docker containers 
(cd $CONFIGHOME; docker-compose pull)

tput setaf 2; echo "SUCCESS: Configuration file '.env' is stored in $CONFIGHOME. Replace the placeholder values with the actual values and start the app using 'docker compose up'.";
