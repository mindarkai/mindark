#!/bin/bash

set -e
cd "$(dirname "$0")/.."

remote_name=$1

source "$(dirname "$0")/remote-source.sh"

# includes hidden files in * globs
shopt -s dotglob

echo "Copying config to remote $remote_name"

for filename in remote/$remote_name/remote-config/* ; do
    scripts/remote-copy-to.sh $remote_name "$filename" "$REMOTE_STUDIO_DIR"
done
