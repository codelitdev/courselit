# Usage ./configure-server-for-letsencrypt.sh domain-name

if [ -z "$1" ]; then
    echo "Error: specify the domain name"
    exit 1
fi

# create a renew hook script that runs on certbot renew
cat > /usr/local/bin/ssl-cert-renew.sh <<EOF
#!/bin/sh

cd /etc/letsencrypt/live/$1
cat fullchain.pem privkey.pem > haproxy.pem

docker stop proxy
docker start proxy
EOF
chmod u+x /usr/local/bin/ssl-cert-renew.sh

# schedule a crontab
(crontab -l ; echo "30 2 * * * /usr/bin/certbot renew --renew-hook /usr/local/bin/ssl-cert-renew.sh >> /var/log/ssl-renew.log") | crontab -