#!/usr/bin/env bash
# Local Keycloak SAML IdP for browser-testing learner SSO.
#
#   keycloak-sso.sh up                    start Keycloak with realm "acme" and learner "lena"
#   keycloak-sso.sh point <connection>    point the Keycloak client at a CourseLit connection
#   keycloak-sso.sh verify-domain <connection> [domain]
#                                         mark a domain verified (default acme.test; no real DNS)
#   keycloak-sso.sh signing assertion|response-only
#                                         what Keycloak signs (we require a signed assertion)
#   keycloak-sso.sh metadata              print the IdP metadata XML (paste it into the admin)
#   keycloak-sso.sh down                  remove Keycloak and the HTTPS proxy
#
# Settings (environment):
#   KC_PUBLIC_URL  HTTPS origin the browser uses for Keycloak. Default: this
#                  machine's Tailscale name on port KC_TS_PORT, served with
#                  `tailscale serve` (tailnet-only). The API only accepts https
#                  IdP URLs, and the browser must trust the certificate.
#   KC_TS_PORT     Tailscale serve port when KC_PUBLIC_URL is unset. Default 9443.
#   KC_HTTP_PORT   Local port Keycloak listens on. Default 8180.
#   API_ENV        API env file for PUBLIC_API_URL and DATABASE_URL. Default apps/api/.env.
set -euo pipefail

ROOT=$(git rev-parse --show-toplevel)
API_ENV=${API_ENV:-$ROOT/apps/api/.env}
CONTAINER=courselit-sso-keycloak
KC_HTTP_PORT=${KC_HTTP_PORT:-8180}
KC_TS_PORT=${KC_TS_PORT:-9443}
REALM=acme

env_value() { grep -E "^$1=" "$API_ENV" | tail -1 | cut -d= -f2- | tr -d '"'"'"; }

public_url() {
  if [[ -n "${KC_PUBLIC_URL:-}" ]]; then echo "${KC_PUBLIC_URL%/}"; return; fi
  local name
  name=$(tailscale status --self --json | bun -e 'const d=JSON.parse(await Bun.stdin.text()); console.log(d.Self.DNSName.replace(/\.$/, ""))')
  echo "https://$name:$KC_TS_PORT"
}

kcadm() { docker exec "$CONTAINER" /opt/keycloak/bin/kcadm.sh "$@"; }
login() { kcadm config credentials --server http://localhost:8080 --realm master --user admin --password admin >/dev/null; }
client_uuid() { kcadm get clients -r "$REALM" --fields id,protocol | bun -e 'const c=JSON.parse(await Bun.stdin.text()).find(x=>x.protocol==="saml"); if(!c) process.exit(1); console.log(c.id)'; }

sql() {
  local url; url=$(env_value DATABASE_URL)
  if command -v psql >/dev/null; then psql "$url" -v ON_ERROR_STOP=1 -tAc "$1"; return; fi
  # No local psql: use the container that publishes the database port.
  local parts; parts=$(bun -e 'const u=new URL(process.argv[1]); console.log(u.port||"5432", decodeURIComponent(u.username), u.pathname.slice(1))' "$url")
  read -r port user db <<<"$parts"
  docker exec "$(docker ps -q --filter "publish=$port" | head -1)" psql -U "$user" -d "$db" -v ON_ERROR_STOP=1 -tAc "$1"
}

case "${1:-}" in
  up)
    url=$(public_url)
    docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
    docker run -d --name "$CONTAINER" -p "127.0.0.1:$KC_HTTP_PORT:8080" \
      -e KC_BOOTSTRAP_ADMIN_USERNAME=admin -e KC_BOOTSTRAP_ADMIN_PASSWORD=admin \
      quay.io/keycloak/keycloak:26.4 start-dev --hostname="$url" --proxy-headers=xforwarded --http-enabled=true >/dev/null
    [[ -z "${KC_PUBLIC_URL:-}" ]] && tailscale serve --bg --https="$KC_TS_PORT" "http://127.0.0.1:$KC_HTTP_PORT" >/dev/null
    until curl -sf "$url/realms/master" >/dev/null; do sleep 2; done
    login
    kcadm create realms -s realm=$REALM -s enabled=true >/dev/null
    kcadm create users -r $REALM -s username=lena -s email=lena.kc@acme.test -s emailVerified=true \
      -s firstName=Lena -s lastName=Keycloak -s enabled=true >/dev/null
    kcadm set-password -r $REALM --username lena --new-password 'Lena-pass-123'
    # Keycloak's default client signs only the Response; we require a signed assertion.
    cid=$(kcadm create clients -r $REALM -s clientId=placeholder -s protocol=saml -s enabled=true \
      -s frontchannelLogout=false \
      -s 'attributes."saml.server.signature"=true' -s 'attributes."saml.assertion.signature"=true' \
      -s 'attributes."saml.client.signature"=false' -s 'attributes."saml.signature.algorithm"=RSA_SHA256' \
      -s 'attributes."saml_name_id_format"=persistent' -s 'attributes."saml.force.name.id.format"=true' -i)
    for p in email firstName lastName; do
      kcadm create "clients/$cid/protocol-mappers/models" -r $REALM -s name=$p -s protocol=saml \
        -s protocolMapper=saml-user-property-mapper -s "config.\"user.attribute\"=$p" \
        -s "config.\"attribute.name\"=$p" -s 'config."attribute.nameformat"=Basic' >/dev/null
    done
    echo "Keycloak is up: $url (admin / admin). Learner: lena / Lena-pass-123 (lena.kc@acme.test)"
    echo "IdP metadata URL: $url/realms/$REALM/protocol/saml/descriptor"
    ;;
  point)
    conn=${2:?connection public id, e.g. sso_01...}
    api=$(env_value PUBLIC_API_URL); sp="${api%/}/learner-login/sso/$conn"
    login; cid=$(client_uuid)
    kcadm update "clients/$cid" -r $REALM -s "clientId=$sp/metadata" -s "redirectUris=[\"$sp/acs\"]" \
      -s "attributes.\"saml_assertion_consumer_url_post\"=$sp/acs"
    echo "Keycloak client now uses entity ID $sp/metadata and ACS $sp/acs"
    ;;
  verify-domain)
    conn=${2:?connection public id}; domain=${3:-acme.test}
    sql "UPDATE school_sso_domains d SET verified_at = now(), consecutive_check_failures = 0
         FROM school_sso_connections c
         WHERE c.id = d.connection_id AND c.public_id = '$conn' AND d.domain = '$domain'
         RETURNING d.domain"
    ;;
  signing)
    case "${2:-}" in
      assertion) value=true ;;
      response-only) value=false ;;
      *) echo "usage: $0 signing assertion|response-only" >&2; exit 2 ;;
    esac
    login; cid=$(client_uuid)
    kcadm update "clients/$cid" -r $REALM -s "attributes.\"saml.assertion.signature\"=$value"
    echo "Keycloak signs: ${2}"
    ;;
  metadata)
    curl -sf "$(public_url)/realms/$REALM/protocol/saml/descriptor"; echo
    ;;
  down)
    [[ -z "${KC_PUBLIC_URL:-}" ]] && tailscale serve --https="$KC_TS_PORT" off >/dev/null 2>&1 || true
    docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
    echo "Keycloak removed"
    ;;
  *)
    sed -n '2,20p' "$0"; exit 2 ;;
esac
