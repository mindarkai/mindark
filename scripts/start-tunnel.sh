#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

. ./config.sh

ngrok http 62687 --subdomain="$NGROK_SUBDOMAIN" #--oauth=google --oauth-allow-domain="$NGROK_AUTH_DOMAIN"
