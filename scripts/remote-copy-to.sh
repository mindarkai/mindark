#!/bin/bash

set -e

remote_name=$1

src=$2
dest=$3

if [ "$src" == "" ]; then
     echo "source (arg 2) required"
     echo "usage: remote-copy.sh [remote_name] [src] [dest]"
     exit 1
fi

if [ "$dest" == "" ]; then
     echo "dest (arg 3) required"
     echo "usage: remote-copy.sh [remote_name] [src] [dest]"
     exit 1
fi

source "$(dirname "$0")/remote-source.sh"

echo "Copying to remote remote $remote_name: $src -> $REMOTE_USER@$REMOTE_IP:$dest"

scp -i "$remote_pem_file" -r "$src" "$REMOTE_USER@$REMOTE_IP:$dest"
