#!/usr/bin/env bash
# kvm-setup.sh — Run once on the KVM host to set up the Pod City dashboard.
# Assumes: Ubuntu/Debian, Docker + Docker Compose already installed.
# Domain:  podcitydash-fggmawsh.manus.space (must already point to this IP)

set -euo pipefail

REPO_URL="https://github.com/jqexpressia-a11y/pod-coty.git"
INSTALL_DIR="/opt/podcity"
DOMAIN="podcitydash-fggmawsh.manus.space"
REGISTRY="ghcr.io/jqexpressia-a11y/pod-coty-dashboard"

echo "==> Installing Certbot for TLS..."
apt-get install -y certbot

echo "==> Obtaining Let's Encrypt certificate for ${DOMAIN}..."
certbot certonly --standalone -d "${DOMAIN}" --non-interactive --agree-tos \
  -m "jqexpressia@gmail.com" || echo "Cert already exists or failed — check manually."

echo "==> Cloning repo..."
git clone "${REPO_URL}" "${INSTALL_DIR}" 2>/dev/null || git -C "${INSTALL_DIR}" pull

echo "==> Copying env template..."
if [ ! -f "${INSTALL_DIR}/dashboard/.env.production" ]; then
  cat > "${INSTALL_DIR}/dashboard/.env.production" <<EOF
ANTHROPIC_API_KEY=
HERMES_WEBHOOK_URL=
PODS_ROOT=${INSTALL_DIR}/pods
EOF
  echo "    → Edit ${INSTALL_DIR}/dashboard/.env.production and add your keys."
fi

echo "==> Starting services with Docker Compose..."
cd "${INSTALL_DIR}/dashboard"
docker compose pull
docker compose up -d

echo ""
echo "==> Done. Dashboard should be live at:"
echo "    https://${DOMAIN}"
echo ""
echo "    To update after a new push:"
echo "    cd ${INSTALL_DIR} && git pull && cd dashboard && docker compose pull && docker compose up -d"
