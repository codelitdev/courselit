FROM haproxy:1.8
RUN apt-get update && apt-get install -y socat && rm -rf /var/lib/apt/lists/*

COPY haproxy.cfg local.cfg production.cfg /usr/local/etc/haproxy/
COPY init-haproxy.sh /usr/local/bin/init-haproxy.sh

ENTRYPOINT ["/usr/local/bin/init-haproxy.sh"]