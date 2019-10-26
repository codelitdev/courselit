FROM haproxy:1.7

COPY haproxy.cfg local.cfg production.cfg /usr/local/etc/haproxy/
COPY init-haproxy.sh /usr/local/bin/init-haproxy.sh

ENTRYPOINT ["/usr/local/bin/init-haproxy.sh"]