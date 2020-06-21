#!/bin/bash
if [ ! -z "${DOMAIN}" ]; then
    API_PREFIX="${API_PREFIX:=/api}" haproxy -f /usr/local/etc/haproxy/haproxy.cfg -f /usr/local/etc/haproxy/production.cfg
else
    API_PREFIX="${API_PREFIX:=/api}" haproxy -f /usr/local/etc/haproxy/haproxy.cfg -f /usr/local/etc/haproxy/local.cfg
fi