#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

scripts/docker-compose.sh logs --follow
