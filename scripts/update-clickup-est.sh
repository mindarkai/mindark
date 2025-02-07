#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

. config.sh

node update-clickup-est.js $@
