#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

# to install pkij run `npm install -g @iyio/pkij`

npx pkij --inject $@
