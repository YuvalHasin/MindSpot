#!/usr/bin/env bash
# setup-server.sh — One-shot MindSpot deployment for the Ruppin Linux server
# ─────────────────────────────────────────────────────────────────────────────
# Run this ONCE after SSHing into the server.
# It installs everything, sets up the named URL, and starts the app.
#
# Usage:
#   chmod +x setup-server.sh
#   sudo ./setup-server.sh
#
# After running:
#   • App is live at http://mindspot.duckdns.org
#   • RavenDB admin at http://localhost:8080  (not exposed publicly)
#   • To view logs: docker compose logs -f app
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── CONFIG — edit before running ─────────────────────────────────────────────
DUCKDNS_TOKEN=""          # Your DuckDNS token (from duckdns.org → Account)
DUCKDNS_SUBDOMAIN="mindspot"   # The subdomain you registered on DuckDNS
REPO_DIR="/opt/mindspot"       # Where the repo lives on the server
# ─────────────────────────────────────────────────────────────────────────────

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}▶  $*${NC}"; }
ok()    { echo -e "${GREEN}✓  $*${NC}"; }
die()   { echo -e "${RED}✗  $*${NC}"; exit 1; }

# ── Validate config ───────────────────────────────────────────────────────────
[[ -z "$DUCKDNS_TOKEN" ]] && die "Set DUCKDNS_TOKEN at the top of this script before running."

# ── Must run as root ──────────────────────────────────────────────────────────
[[ $EUID -eq 0 ]] || die "Run with sudo: sudo ./setup-server.sh"

# ── [1/6] System packages ─────────────────────────────────────────────────────
info "[1/6] Installing system packages..."
apt-get update -qq
apt-get install -y --no-install-recommends \
    docker.io \
    docker-compose-plugin \
    nginx \
    curl \
    git \
    ufw
ok "Packages installed"

# ── [2/6] DuckDNS — register public IP with the free subdomain ───────────────
info "[2/6] Registering server IP with DuckDNS (${DUCKDNS_SUBDOMAIN}.duckdns.org)..."
mkdir -p /opt/duckdns
cat > /opt/duckdns/update.sh <<EOF
#!/bin/bash
curl -s "https://www.duckdns.org/update?domains=${DUCKDNS_SUBDOMAIN}&token=${DUCKDNS_TOKEN}&ip=" \
     -o /var/log/duckdns.log
EOF
chmod +x /opt/duckdns/update.sh
/opt/duckdns/update.sh   # run immediately so DNS is active now

# Refresh IP every 5 minutes via cron
(crontab -l 2>/dev/null | grep -v duckdns; echo "*/5 * * * * /opt/duckdns/update.sh") | crontab -
ok "DuckDNS configured → ${DUCKDNS_SUBDOMAIN}.duckdns.org"

# ── [3/6] nginx — reverse proxy 80 → 7160 ────────────────────────────────────
info "[3/6] Configuring nginx..."
cp "${REPO_DIR}/nginx/mindspot.conf" /etc/nginx/sites-available/mindspot

# Remove default site if present
rm -f /etc/nginx/sites-enabled/default

# Enable MindSpot site
ln -sf /etc/nginx/sites-available/mindspot /etc/nginx/sites-enabled/mindspot

nginx -t || die "nginx config test failed — check /etc/nginx/sites-available/mindspot"
systemctl enable nginx
systemctl restart nginx
ok "nginx configured and running"

# ── [4/6] Firewall ────────────────────────────────────────────────────────────
info "[4/6] Configuring firewall..."
ufw --force enable
ufw allow OpenSSH     # keep SSH working!
ufw allow 'Nginx Full' # ports 80 and 443
# Port 7160 and 8080 are NOT opened — nginx and Docker communicate internally
ok "Firewall: SSH + HTTP/HTTPS open; 7160/8080 internal only"

# ── [5/6] .env file ───────────────────────────────────────────────────────────
info "[5/6] Checking .env file..."
ENV_FILE="${REPO_DIR}/.env"
if [[ ! -f "$ENV_FILE" ]]; then
    if [[ -f "${REPO_DIR}/.env.template" ]]; then
        cp "${REPO_DIR}/.env.template" "$ENV_FILE"
        echo -e "${RED}"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "  ACTION REQUIRED: Fill in your secrets in ${ENV_FILE}"
        echo "  Minimum required:  JWT_KEY=<random 64-char string>"
        echo "  Then re-run:  sudo ./setup-server.sh"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo -e "${NC}"
        exit 0
    else
        die ".env file not found and no .env.template either. Create ${ENV_FILE} with at least JWT_KEY=<secret>."
    fi
fi
ok ".env file found"

# Quick sanity check — JWT_KEY must be set
grep -q "^JWT_KEY=.\{8,\}" "$ENV_FILE" || \
    die "JWT_KEY is missing or too short in ${ENV_FILE}. Set it to a random 64-char string."

# ── [6/6] Build and start with Docker Compose ────────────────────────────────
info "[6/6] Building and starting MindSpot..."
cd "$REPO_DIR"

docker compose build --pull
docker compose up -d

# Wait for health checks to pass
info "Waiting for containers to become healthy..."
for i in $(seq 1 30); do
    STATUS=$(docker compose ps --format json 2>/dev/null | python3 -c "
import sys, json
data = sys.stdin.read().strip()
if not data: sys.exit(1)
lines = [l for l in data.splitlines() if l.strip()]
states = [json.loads(l).get('Health','') for l in lines]
healthy = all(s in ('healthy','') for s in states)
print('ok' if healthy else 'wait')
" 2>/dev/null || echo "wait")
    if [[ "$STATUS" == "ok" ]]; then break; fi
    sleep 5
done

# ── Final check ───────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  MindSpot is live!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  Public URL  :  ${CYAN}http://${DUCKDNS_SUBDOMAIN}.duckdns.org${NC}"
echo -e "  RavenDB     :  localhost:8080  (SSH tunnel to access it)"
echo -e "  Logs        :  docker compose logs -f app"
echo -e "  Restart     :  docker compose restart"
echo -e "  Update app  :  git pull && docker compose build && docker compose up -d"
echo ""
echo -e "  NOTE: DNS propagation takes up to 5 minutes after the first run."
echo ""
