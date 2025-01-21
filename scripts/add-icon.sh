#!/usr/bin/env bash

# This script relies on the phillsv87/resources repo being clone in the same parent directory as this repo

set -e
cd "$(dirname "$0")/.."

OUT="$(pwd)/packages/components/src/lib/icon/icon-source.tsx"
INTERFACE="$(pwd)/packages/mindarkai-common/src/lib/icon-types.ts"

pushd ../resources
./convert-svg-icon-v2.js --out "$OUT" --interface "$INTERFACE" --inline --paste --require-name --name "$1"
popd


echo "New icons added to $OUT"
echo "IconType interface written to $INTERFACE"
