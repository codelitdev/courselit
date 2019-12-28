#!/bin/bash
if [ ! -z "${DOMAIN}" ]; then
    exec haproxy -f /usr/local/etc/haproxy/haproxy.cfg -f /usr/local/etc/haproxy/production.cfg
else
    exec haproxy -f /usr/local/etc/haproxy/haproxy.cfg -f /usr/local/etc/haproxy/local.cfg
fi